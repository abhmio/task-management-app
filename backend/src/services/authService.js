const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { env } = require('../config/env');
const userModel = require('../models/userModel');
const ApiError = require('../utils/ApiError');
const emailService = require('./emailService');
const { isStrongPassword, strongPasswordMessage } = require('../utils/passwordRules');

async function register({ name, email, password }) {
  if (!isStrongPassword(password)) {
    throw new ApiError(422, strongPasswordMessage);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await userModel.findByEmail(normalizedEmail);

  if (existingUser) {
    throw new ApiError(409, 'Email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await userModel.createUser({
    name: name.trim(),
    email: normalizedEmail,
    password: hashedPassword,
  });

  return buildAuthResponse({
    ...user,
    has_password: 1,
  });
}

async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await userModel.findByEmail(normalizedEmail);

  if (!user || !user.password) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return buildAuthResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
    has_password: user.has_password,
  });
}

async function findOrCreateGoogleUser({ name, email }) {
  if (!email) {
    throw new ApiError(400, 'Google account email is required');
  }

  const existingUser = await userModel.findByEmail(email);
  if (existingUser) {
    return {
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
      role: existingUser.role,
      created_at: existingUser.created_at,
      has_password: existingUser.has_password,
    };
  }

  const newUser = await userModel.createUser({
    name,
    email,
    password: null,
  });

  return {
    ...newUser,
    has_password: 0,
  };
}

async function setPasswordForAuthenticatedUser(userId, password) {
  if (!isStrongPassword(password)) {
    throw new ApiError(422, strongPasswordMessage);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await userModel.updatePasswordById(userId, hashedPassword);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

async function requestPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await userModel.findByEmail(normalizedEmail);

  if (!existingUser) {
    return {
      message: 'If the account exists, a reset link has been sent.',
    };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await userModel.saveResetToken(existingUser.id, hashedToken, expiry);

  const resetLink = `${env.mail.resetPasswordUrl.replace(/\/$/, '')}/${rawToken}`;

  try {
    const deliveryResult = await emailService.sendPasswordResetEmail({
      to: existingUser.email,
      name: existingUser.name,
      resetLink,
    });

    return {
      message:
        deliveryResult?.delivery === 'development'
          ? 'Reset link generated for local development.'
          : 'If the account exists, a reset link has been sent.',
      data:
        deliveryResult?.delivery === 'development'
          ? {
              resetLink,
              delivery: 'development',
            }
          : null,
    };
  } catch (error) {
    await userModel.clearResetToken(existingUser.id);
    throw error;
  }
}

async function resetPasswordWithToken(token, password, confirmPassword) {
  if (password !== confirmPassword) {
    throw new ApiError(422, 'Passwords do not match');
  }

  if (!isStrongPassword(password)) {
    throw new ApiError(422, strongPasswordMessage);
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await userModel.findByResetToken(hashedToken);

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  await userModel.updatePasswordById(user.id, hashedPassword);

  return {
    message: 'Password reset successful',
  };
}

function buildAuthResponse(user) {
  return {
    user,
    token: jwt.sign({ userId: user.id, email: user.email }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    }),
  };
}

module.exports = {
  register,
  login,
  findOrCreateGoogleUser,
  setPasswordForAuthenticatedUser,
  requestPasswordReset,
  resetPasswordWithToken,
  buildAuthResponse,
};
