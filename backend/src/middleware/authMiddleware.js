const jwt = require('jsonwebtoken');

const { env } = require('../config/env');
const userModel = require('../models/userModel');
const ApiError = require('../utils/ApiError');

async function authenticate(request, _response, next) {
  const authHeader = request.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await userModel.findById(payload.userId);

    if (!user) {
      return next(new ApiError(401, 'User not found'));
    }

    request.user = user;
    return next();
  } catch (_error) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

function authorizeRoles(...roles) {
  return (request, _response, next) => {
    if (!roles.includes(request.user.role)) {
      return next(new ApiError(403, 'Forbidden'));
    }

    return next();
  };
}

module.exports = {
  authenticate,
  authorizeRoles,
};
