const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const auth = require('../middleware/auth.middleware');
const { uploadAttachment, uploadVoiceNote } = require('../middleware/upload.middleware');

// All task routes require authentication
router.use(auth);

// Core CRUD
router.post('/', taskController.createTask);
router.get('/', taskController.getAllTasks);
router.get('/categories', taskController.getCategories);
router.get('/labels', taskController.getLabels);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Subtasks
router.post('/:id/subtasks', taskController.addSubtask);
router.patch('/:id/subtasks/:subtaskId/toggle', taskController.toggleSubtask);
router.delete('/:id/subtasks/:subtaskId', taskController.removeSubtask);

// Attachments
router.post('/:id/attachments', uploadAttachment.single('file'), taskController.uploadAttachment);
router.delete('/:id/attachments/:attachmentId', taskController.removeAttachment);

// Voice Notes
router.post('/:id/voice-notes', uploadVoiceNote.single('audio'), taskController.uploadVoiceNote);
router.delete('/:id/voice-notes/:voiceNoteId', taskController.removeVoiceNote);

module.exports = router;
