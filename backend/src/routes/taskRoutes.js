const express = require('express');
const { body, param, query } = require('express-validator');

const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

const taskValidationRules = [
  body('title').trim().isLength({ min: 3 }).withMessage('Task title must be at least 3 characters'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('priority').isIn(['Low', 'Medium', 'High']).withMessage('Invalid priority'),
  body('status').isIn(['To Do', 'In Progress', 'Completed']).withMessage('Invalid status'),
  body('category').isIn(['Work', 'Personal', 'Academic']).withMessage('Invalid category'),
  body('deadline').isISO8601().withMessage('Valid deadline is required'),
  body('assignee_id').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Invalid assignee'),
  body('evaluation_by')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Invalid evaluation user'),
  body('progress').isInt({ min: 0, max: 100 }).withMessage('Progress must be between 0 and 100'),
];

router.use(authenticate);

router.post('/', taskValidationRules, validate, taskController.createTask);
router.get(
  '/',
  [
    query('status').optional().isString(),
    query('priority').optional().isIn(['Low', 'Medium', 'High']),
    query('user').optional().isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional().isIn(['deadline', 'priority']),
    validate,
  ],
  taskController.getTasks,
);
router.get('/:id', [param('id').isInt({ min: 1 }), validate], taskController.getTaskById);
router.put(
  '/:id',
  [param('id').isInt({ min: 1 }), ...taskValidationRules, validate],
  taskController.updateTask,
);
router.delete('/:id', [param('id').isInt({ min: 1 }), validate], taskController.deleteTask);

module.exports = router;
