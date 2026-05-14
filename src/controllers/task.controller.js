const Task = require('../models/task.model');

// Create a new task
exports.createTask = async (req, res) => {
  try {
    const task = new Task({ ...req.body, user: req.user._id });
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

// Get all tasks for the logged-in user (with filter by status & priority)
exports.getAllTasks = async (req, res) => {
  try {
    const { status, priority, sort } = req.query;
    const filter = { user: req.user._id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    let query = Task.find(filter);

    if (sort) {
      const sortOrder = sort.startsWith('-') ? -1 : 1;
      const sortField = sort.replace('-', '');
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

// Get a single task by ID (only if it belongs to the user)
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

// Update a task (only if it belongs to the user)
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

// Delete a task (only if it belongs to the user)
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    res.status(500).json({ error: 'Failed to delete task' });
  }
};
