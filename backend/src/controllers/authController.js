const passport = require('passport');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const authService = require('../services/authService');

const register = asyncHandler(async (request, response) => {
  const result = await authService.register(request.body);

  response.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: result,
  });
});

const login = asyncHandler(async (request, response) => {
  const result = await authService.login(request.body);

  response.status(200).json({
    success: true,
    message: 'Login successful',
    data: result,
  });
});

const setPassword = asyncHandler(async (request, response) => {
  const user = await authService.setPasswordForAuthenticatedUser(
    request.user.id,
    request.body.password,
  );

  response.status(200).json({
    success: true,
    message: 'Password set successfully',
    data: {
      user,
    },
  });
});

const forgotPassword = asyncHandler(async (request, response) => {
  const result = await authService.requestPasswordReset(request.body.email);

  response.status(200).json({
    success: true,
    message: result.message,
    data: result.data || null,
  });
});

const resetPassword = asyncHandler(async (request, response) => {
  const result = await authService.resetPasswordWithToken(
    request.params.token,
    request.body.password,
    request.body.confirmPassword,
  );

  response.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

const googleAuth = (request, response, next) => {
  const redirectUrl =
    typeof request.query.redirect_url === 'string' ? request.query.redirect_url : '';

  if (!passport._strategies.google) {
    if (redirectUrl) {
      const url = new URL(redirectUrl);
      url.searchParams.set(
        'auth_error',
        'Google sign in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.',
      );
      return response.redirect(url.toString());
    }

    return next(new ApiError(500, 'Google OAuth is not configured'));
  }

  return passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: redirectUrl || undefined,
  })(request, response, next);
};

const googleCallback = [
  (request, response, next) => {
    if (!passport._strategies.google) {
      return next(new ApiError(500, 'Google OAuth is not configured'));
    }

    return next();
  },
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/api/auth/google/failure',
  }),
  asyncHandler(async (request, response) => {
    const payload = authService.buildAuthResponse(request.user);
    const redirectUrl =
      typeof request.query.state === 'string' ? request.query.state : '';

    if (redirectUrl) {
      const url = new URL(redirectUrl);
      url.searchParams.set('token', payload.token);
      url.searchParams.set('email', payload.user.email);
      url.searchParams.set('name', payload.user.name);
      url.searchParams.set(
        'has_password',
        payload.user.has_password ? 'true' : 'false',
      );
      return response.redirect(url.toString());
    }

    return response.status(200).json({
      success: true,
      message: 'Google login successful',
      data: payload,
    });
  }),
];

const googleFailure = (_request, response) => {
  response.status(401).json({
    success: false,
    message: 'Google authentication failed',
  });
};

module.exports = {
  register,
  login,
  setPassword,
  forgotPassword,
  resetPassword,
  googleAuth,
  googleCallback,
  googleFailure,
};
