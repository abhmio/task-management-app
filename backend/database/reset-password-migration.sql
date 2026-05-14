ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(255) NULL AFTER password,
  ADD COLUMN reset_token_expiry DATETIME NULL AFTER reset_token,
  ADD KEY idx_users_reset_token (reset_token);
