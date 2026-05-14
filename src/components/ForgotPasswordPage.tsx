import { FormEvent, useMemo, useState } from 'react';

function ForgotPasswordPage({
  initialEmail = '',
  initialError = '',
  initialNotice = '',
  initialResetLink = '',
  onSubmit,
  onBackToLogin,
}: {
  initialEmail?: string;
  initialError?: string;
  initialNotice?: string;
  initialResetLink?: string;
  onSubmit: (payload: { email: string }) => Promise<{ resetLink?: string | null } | void>;
  onBackToLogin: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [formError, setFormError] = useState(initialError);
  const [formSuccess, setFormSuccess] = useState(initialNotice);
  const [resetLink, setResetLink] = useState(initialResetLink);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDisabled = useMemo(() => isSubmitting || !email.trim(), [email, isSubmitting]);

  const validate = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setFormError('Mail Id is required');
      return false;
    }

    if (normalizedEmail !== email.trim()) {
      setFormError('Mail Id must not be in capital letters');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError('Enter a valid Mail Id');
      return false;
    }

    setEmail(normalizedEmail);
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
      setFormSuccess('');
      const result = await onSubmit({ email: email.trim().toLowerCase() });
      setFormError('');
      setResetLink(result?.resetLink || '');
      setFormSuccess(
        result?.resetLink
          ? 'Reset link generated for local development. Open it below to continue.'
          : 'If the account exists, a reset link has been sent.',
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to send reset link');
      setFormSuccess('');
      setResetLink('');
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
        <div className="hero-badge">Password recovery</div>
        <h1>Recover access to your TaskFlow account.</h1>
        <p className="hero-copy">
          Enter your registered Mail Id and we will send a secure password reset link.
        </p>
      </section>

      <section className="login-panel" aria-label="Forgot Password">
        <div className="login-card">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <span>T</span>
            </div>
            <span>TaskFlow</span>
          </div>

          <header className="login-header">
            <h2>Forgot Password</h2>
            <p>We will email you a reset link that stays active for 15 minutes.</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="forgotMailId">Mail Id</label>
            <input
              id="forgotMailId"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFormError('');
              }}
              placeholder="your.mailid@address.com"
              aria-invalid={Boolean(formError)}
            />

            {formSuccess && <p className="form-success">{formSuccess}</p>}
            {formError && <p className="form-error">{formError}</p>}
            {resetLink && (
              <a className="primary-button secondary-button" href={resetLink}>
                Open Reset Page
              </a>
            )}

            <div className="form-row">
              <span />
              <button type="button" className="inline-switch" onClick={onBackToLogin}>
                Back to Log in
              </button>
            </div>

            <button type="submit" className="primary-button" disabled={isDisabled}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;
