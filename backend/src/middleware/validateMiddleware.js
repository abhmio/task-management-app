const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(request, _response, next) {
  const errors = validationResult(request);

  if (!errors.isEmpty()) {
    return next(new ApiError(422, 'Validation failed', errors.array()));
  }

  return next();
}

module.exports = validate;
