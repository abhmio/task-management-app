const express = require('express');
const { body, param } = require('express-validator');

const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { strongPasswordPattern, strongPasswordMessage } = require('../utils/passwordRules');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .matches(strongPasswordPattern)
      .withMessage(strongPasswordMessage)
      .matches(/^\S+$/)
      .withMessage('Password cannot contain spaces'),
    validate,
  ],
  authController.register,
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 6, max: 32 })
      .withMessage('Password must be between 6 and 32 characters')
      .matches(/^\S+$/)
      .withMessage('Password cannot contain spaces'),
    validate,
  ],
  authController.login,
);

router.post(
  '/forgot-password',
  [
    body('email').trim().isEmail().withMessage('Valid Mail Id is required').normalizeEmail(),
    validate,
  ],
  authController.forgotPassword,
);

router.post(
  '/reset-password/:token',
  [
    param('token').trim().isLength({ min: 32 }).withMessage('Invalid reset token'),
    body('password')
      .matches(strongPasswordPattern)
      .withMessage(strongPasswordMessage)
      .matches(/^\S+$/)
      .withMessage('Password cannot contain spaces'),
    body('confirmPassword')
      .exists()
      .withMessage('Confirm Password is required')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
    validate,
  ],
  authController.resetPassword,
);

router.post(
  '/set-password',
  authenticate,
  [
    body('password')
      .matches(strongPasswordPattern)
      .withMessage(strongPasswordMessage)
      .matches(/^\S+$/)
      .withMessage('Password cannot contain spaces'),
    body('confirmPassword')
      .exists()
      .withMessage('Confirm Password is required')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match'),
    validate,
  ],
  authController.setPassword,
);

router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.get('/google/failure', authController.googleFailure);

module.exports = router;
