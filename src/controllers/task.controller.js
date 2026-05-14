const Task = require('../models/task.model');
const crypto = require('crypto');
const { uploadFile, deleteFile } = require('../services/s3.service');

// Create a new task
exports.createTask = async (req, res) => {
  try {
    const taskData = { ...req.body, user: req.user._id };
    const task = new Task(taskData);
    const savedTask = await task.save();
    res.status(201).json(savedTask);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: messages });
    }
    res.status(500).json({ error: 'Failed to create task' });
  }
};

// Get all tasks for the logged-in user (with filters, search, and sorting)
exports.getAllTasks = async (req, res) => {
  try {
    const { status, priority, category, label, search, sort } = req.query;
    const filter = { user: req.user._id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (label) filter.labels = { $in: [label] };

    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { labels: { $regex: search, $options: 'i' } },
      ];
    }

    let query = Task.find(filter);

    if (sort) {
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      const sortField = sort.replace(/^-/, '');
      query = query.sort({ [sortField]: sortOrder });
    } else {
      query = query.sort({ createdAt: -1 });
    }

    const tasks = await query;
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

// Get a single task by ID
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

// Update a task
exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: messages });
    }
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    res.status(500).json({ error: 'Failed to update task' });
  }
};

// Delete a task (also removes associated files from S3)
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Clean up attachment files from S3
    for (const attachment of task.attachments) {
      try {
        await deleteFile(attachment.s3Key);
      } catch (err) {
        console.error(`Failed to delete S3 file: ${attachment.s3Key}`, err.message);
      }
    }

    // Clean up voice note files from S3
    for (const voiceNote of task.voiceNotes) {
      try {
        await deleteFile(voiceNote.s3Key);
      } catch (err) {
        console.error(`Failed to delete S3 file: ${voiceNote.s3Key}`, err.message);
      }
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

// Upload attachment to a task (saves to Supabase S3)
exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { key, url } = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'attachments'
    );

    const attachment = {
      id: crypto.randomUUID(),
      fileName: req.file.originalname,
      s3Key: key,
      url,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      createdAt: new Date(),
    };

    task.attachments.push(attachment);
    await task.save();

    res.status(201).json({ attachment });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
};

// Remove attachment from a task (deletes from Supabase S3)
exports.removeAttachment = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const attachment = task.attachments.find((a) => a.id === req.params.attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Remove file from S3
    await deleteFile(attachment.s3Key);

    task.attachments = task.attachments.filter((a) => a.id !== req.params.attachmentId);
    await task.save();

    res.json({ message: 'Attachment removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove attachment' });
  }
};

// Upload voice note to a task (saves to Supabase S3)
exports.uploadVoiceNote = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { key, url } = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'voice-notes'
    );

    const duration = parseInt(req.body.duration, 10) || 0;

    const voiceNote = {
      id: crypto.randomUUID(),
      s3Key: key,
      url,
      duration,
      createdAt: new Date(),
    };

    task.voiceNotes.push(voiceNote);
    await task.save();

    res.status(201).json({ voiceNote });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload voice note' });
  }
};

// Remove voice note from a task (deletes from Supabase S3)
exports.removeVoiceNote = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const voiceNote = task.voiceNotes.find((v) => v.id === req.params.voiceNoteId);
    if (!voiceNote) {
      return res.status(404).json({ error: 'Voice note not found' });
    }

    // Remove from S3
    await deleteFile(voiceNote.s3Key);

    task.voiceNotes = task.voiceNotes.filter((v) => v.id !== req.params.voiceNoteId);
    await task.save();

    res.json({ message: 'Voice note removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove voice note' });
  }
};

// Get all categories for the user
exports.getCategories = async (req, res) => {
  try {
    const categories = await Task.distinct('category', {
      user: req.user._id,
      category: { $ne: '' },
    });
    res.json(categories.sort());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

// Get all labels for the user
exports.getLabels = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id, labels: { $ne: [] } }).select('labels');
    const labelSet = new Set();
    tasks.forEach((task) => task.labels.forEach((label) => labelSet.add(label)));
    res.json(Array.from(labelSet).sort());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
};

// Add subtask to a task
exports.addSubtask = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Subtask title is required' });
    }

    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const subtask = {
      id: crypto.randomUUID(),
      title: title.trim(),
      isCompleted: false,
      createdAt: new Date(),
    };

    task.subtasks.push(subtask);
    await task.save();

    res.status(201).json(subtask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add subtask' });
  }
};

// Toggle subtask completion
exports.toggleSubtask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const subtask = task.subtasks.find((s) => s.id === req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    subtask.isCompleted = !subtask.isCompleted;
    await task.save();

    res.json(subtask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle subtask' });
  }
};

// Remove subtask
exports.removeSubtask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.subtasks = task.subtasks.filter((s) => s.id !== req.params.subtaskId);
    await task.save();

    res.json({ message: 'Subtask removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove subtask' });
  }
};
