const ApiError = require('../utils/ApiError');

function notFoundMiddleware(request, _response, next) {
  next(new ApiError(404, `Route not found: ${request.method} ${request.originalUrl}`));
}

module.exports = notFoundMiddleware;
