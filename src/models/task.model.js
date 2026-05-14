const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    isCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const attachmentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    fileName: { type: String, required: true },
    s3Key: { type: String, required: true },
    url: { type: String, required: true },
    fileSize: { type: Number, default: 0 },
    mimeType: { type: String, default: 'application/octet-stream' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const voiceNoteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    s3Key: { type: String, required: true },
    url: { type: String, required: true },
    duration: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const recurrenceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'],
      default: 'none',
    },
    interval: { type: Number, default: 1 },
    daysOfWeek: { type: [Number], default: [] },
    endDate: { type: Date, default: null },
    occurrences: { type: Number, default: null },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    labels: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    subtasks: {
      type: [subtaskSchema],
      default: [],
    },
    recurrence: {
      type: recurrenceSchema,
      default: () => ({ type: 'none', interval: 1 }),
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    voiceNotes: {
      type: [voiceNoteSchema],
      default: [],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Text index for search
taskSchema.index({ title: 'text', description: 'text', notes: 'text', category: 'text' });
// Compound indexes for common queries
taskSchema.index({ user: 1, status: 1 });
taskSchema.index({ user: 1, priority: 1 });
taskSchema.index({ user: 1, category: 1 });
taskSchema.index({ user: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
