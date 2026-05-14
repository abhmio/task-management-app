const express = require('express');
const { body, param } = require('express-validator');

const teamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Team name is required'),
    body('name')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Team name must be at least 3 characters'),
    body('description').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
    validate,
  ],
  teamController.createTeam,
);

router.get('/', teamController.getTeams);

router.post(
  '/:id/add-member',
  [
    param('id').isInt({ min: 1 }),
    body('user_id').isInt({ min: 1 }).withMessage('Valid user is required'),
    body('role').isIn(['admin', 'member']).withMessage('Role must be admin or member'),
    validate,
  ],
  teamController.addMember,
);

router.get('/:id', [param('id').isInt({ min: 1 }), validate], teamController.getTeamById);

module.exports = router;
