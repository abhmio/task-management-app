const express = require('express');
const { param } = require('express-validator');

const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.put(
  '/:id/read',
  [param('id').isInt({ min: 1 }), validate],
  notificationController.markNotificationRead,
);
router.put('/read-all', notificationController.markAllNotificationsRead);

module.exports = router;
