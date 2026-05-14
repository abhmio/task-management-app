import { FormEvent, useMemo, useState } from 'react';

function ResetPasswordPage({
  onSubmit,
  onBackToLogin,
}: {
  onSubmit: (payload: { password: string; confirmPassword: string }) => Promise<void>;
  onBackToLogin: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(
    () => isSubmitting || !password || !confirmPassword,
    [confirmPassword, isSubmitting, password],
  );

  const validate = () => {
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return false;
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password)
    ) {
      setFormError(
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
      );
      return false;
    }

    setFormError('');
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate() || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({ password, confirmPassword });
      setFormSuccess('Password reset successful');
      setFormError('');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to reset password');
      setFormSuccess('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="spark spark-top" />
      <div className="spark spark-bottom" />

      <section className="hero-panel">
        <div className="hero-badge">Secure password recovery</div>
        <h1>Reset your TaskFlow password.</h1>
        <p className="hero-copy">
          Choose a strong new password to restore access to your workspace securely.
        </p>
      </section>

      <section className="login-panel" aria-label="Reset Password">
        <div className="login-card">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <span>T</span>
            </div>
            <span>TaskFlow</span>
          </div>

          <header className="login-header">
            <h2>Reset Password</h2>
            <p>This secure reset session is valid for 15 minutes.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="newPassword">New Password</label>
            <div className="password-field">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFormError('');
                }}
                placeholder="Enter your new password"
              />
              <button
                type="button"
                className="icon-button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((current) => !current)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {showPassword ? (
                    <>
                      <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.58 10.58A2 2 0 0012 14a2 2 0 001.42-.58" />
                      <path d="M9.88 5.09A9.76 9.76 0 0112 4c5 0 9.27 3.11 11 8-1 2.83-2.97 5.1-5.48 6.36" />
                      <path d="M6.61 6.61C4.62 8 3.08 9.85 2 12c.72 2.04 1.97 3.83 3.61 5.2" />
                    </>
                  )}
                </svg>
              </button>
            </div>

            <label htmlFor="confirmNewPassword">Confirm Password</label>
            <input
              id="confirmNewPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setFormError('');
              }}
              placeholder="Confirm your new password"
            />

            {formSuccess && <p className="form-success">{formSuccess}</p>}
            {formError && <p className="form-error">{formError}</p>}

            <div className="form-row">
              <span />
              <button type="button" className="inline-switch" onClick={onBackToLogin}>
                Back to Log in
              </button>
            </div>

            <button type="submit" className="primary-button" disabled={isDisabled}>
              {isSubmitting ? 'Updating...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default ResetPasswordPage;
