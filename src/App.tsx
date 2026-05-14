import { FormEvent, useEffect, useMemo, useState } from 'react';
import AppSidebar from './components/AppSidebar';
import TaskPage, {
  NotificationItem,
  TaskItem,
  TaskPriority,
  TaskViewFilter,
  WorkSequence,
} from './components/TaskPage';
import TeamsPage from './components/TeamsPage';
import NotificationPage from './components/NotificationPage';
import ReportsPage from './components/ReportsPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import {
  authApi,
  BackendNotification,
  BackendTask,
  dashboardApi,
  DashboardSummary,
  DistributionItem,
  notificationApi,
  ProductivityReport,
  reportApi,
  taskApi,
  WeeklyReportItem,
} from './services/api';

type AppScreen =
  | 'auth'
  | 'forgot-password'
  | 'dashboard'
  | 'task'
  | 'teams'
  | 'notifications'
  | 'reports'
  | 'reset-password';

type AuthSession = {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    hasPassword?: boolean;
  };
};

type DashboardAnalytics = {
  weeklyBars: number[];
  completionRate: number;
  statusBreakdown: { label: string; value: number }[];
  categoryBreakdown: { label: string; value: number }[];
  mostProductiveDay: string;
  trendSummary: string;
  overdueTasks: number;
};

const AUTH_STORAGE_KEY = 'taskflow-auth-session';
const chartDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const strongPasswordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const initialSummary: DashboardSummary = {
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  overdueTasks: 0,
};

const initialProductivity: ProductivityReport = {
  totalTasks: 0,
  completedTasks: 0,
  overdueTasks: 0,
  productivityPercentage: 0,
};

function formatTaskDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatUserNameFromEmail(email: string) {
  const fallback = 'User Name';
  const normalized = email.trim().split('@')[0];

  if (!normalized) {
    return fallback;
  }

  return normalized
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapBackendTask(task: BackendTask): TaskItem {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    status: task.status,
    taskStatus: task.status === 'Completed' ? 'closed' : 'ongoing',
    priority: task.priority,
    category: task.category,
    deadline: task.deadline,
    progress: Number(task.progress || 0),
    assignee: task.assignee_name || 'You',
    evaluationBy: task.evaluation_by ? String(task.evaluation_by) : '',
  };
}

function mapBackendNotification(notification: BackendNotification): NotificationItem {
  return {
    id: notification.id,
    title:
      notification.type === 'task_assigned'
        ? 'Task assigned'
        : notification.type === 'reminder'
          ? 'Deadline reminder'
          : 'Task update',
    detail: notification.message,
    audience: 'You',
    category:
      notification.type === 'task_assigned'
        ? 'tasks'
        : notification.type === 'reminder'
          ? 'reminders'
          : 'team',
    createdAt: notification.created_at,
    isRead: notification.is_read,
    priority: notification.type === 'reminder' ? 'High' : 'Medium',
  };
}

function readStoredSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function Dashboard({
  tasks,
  summary,
  analytics,
  onNavigate,
  onOpenTaskView,
  onLogout,
  userName,
  dashboardError,
}: {
  tasks: TaskItem[];
  summary: DashboardSummary;
  analytics: DashboardAnalytics;
  onNavigate: (screen: 'dashboard' | 'task' | 'teams' | 'notifications' | 'reports') => void;
  onOpenTaskView: (filter: TaskViewFilter) => void;
  onLogout: () => void;
  userName: string;
  dashboardError?: string;
}) {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const totalTasks = Number(summary.totalTasks || safeTasks.length || 0);
  const completedTasks = Number(
    summary.completedTasks || safeTasks.filter((task) => task.status === 'Completed').length || 0,
  );
  const pendingTasks = Number(
    summary.pendingTasks ||
      safeTasks.filter((task) => task.status === 'To Do' || task.status === 'In Progress').length ||
      0,
  );
  const inProgressTasks = safeTasks.filter((task) => task.status === 'In Progress');
  const todoTasks = safeTasks.filter((task) => task.status === 'To Do');
  const dashboardCards = [
    {
      label: 'Total Tasks',
      value: String(totalTasks),
      detail: 'View all created tasks',
      icon: 'list',
      filter: 'all' as TaskViewFilter,
    },
    {
      label: 'Completed Tasks',
      value: String(completedTasks),
      detail: 'Open completed tasks',
      icon: 'check',
      filter: 'completed' as TaskViewFilter,
    },
    {
      label: 'Pending Tasks',
      value: String(pendingTasks),
      detail: 'Open pending tasks',
      icon: 'hourglass',
      filter: 'pending' as TaskViewFilter,
    },
  ];

  const statusTotal = analytics.statusBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;
  const categoryTotal = analytics.categoryBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;

  return (
    <main className="dashboard-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="spark spark-top" />
      <div className="spark spark-bottom" />

      <AppSidebar
        activeScreen="dashboard"
        onNavigate={onNavigate}
        onOpenTasks={() => onOpenTaskView('all')}
        onLogout={onLogout}
        userName={userName}
      />

      <section className="dashboard-main">
        {dashboardError && (
          <article className="dashboard-card dashboard-message-card error-state-card">
            <strong>Failed to load dashboard data</strong>
            <p>{dashboardError}</p>
          </article>
        )}

        <div className="stats-grid">
          {dashboardCards.map((card) => (
            <button
              key={card.label}
              type="button"
              className="dashboard-card stat-card clickable-card"
              onClick={() => onOpenTaskView(card.filter)}
            >
              <div className="stat-top">
                <div>
                  <p>{card.label}</p>
                  <h3>{card.value}</h3>
                </div>
                <div className={`stat-icon ${card.icon}`} aria-hidden="true" />
              </div>
              <span className="stat-detail">{card.detail}</span>
            </button>
          ))}
        </div>

        {!dashboardError && totalTasks === 0 && (
          <article className="dashboard-card dashboard-message-card">
            <strong>No tasks available</strong>
            <p>Create your first task to start tracking progress, deadlines, and productivity.</p>
          </article>
        )}

        {!dashboardError && totalTasks > 0 && (
          <div className="content-grid">
            <article className="dashboard-card panel-card">
              <div className="panel-head">
                <button
                  type="button"
                  className="section-link"
                  onClick={() => onOpenTaskView('in-progress')}
                >
                  In Progress
                </button>
                <button type="button" className="ghost-dot">
                  ...
                </button>
              </div>
              <div className="progress-list dashboard-scroll-panel">
                {inProgressTasks.map((task) => (
                  <div key={task.id} className="progress-item">
                    <div className="task-line">
                      <span className="check-chip" />
                      <span>{task.title}</span>
                      <strong>{task.progress}%</strong>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: `${task.progress}%` }} />
                    </div>
                    <p>
                      {task.priority} priority | {formatTaskDate(task.deadline)}
                    </p>
                  </div>
                ))}
                {inProgressTasks.length === 0 && (
                  <p className="empty-state">No tasks are currently in progress.</p>
                )}
              </div>
            </article>

            <article className="dashboard-card panel-card">
              <div className="panel-head">
                <button
                  type="button"
                  className="section-link"
                  onClick={() => onOpenTaskView('todo')}
                >
                  To Do
                </button>
                <button type="button" className="ghost-dot">
                  ...
                </button>
              </div>
              <div className="todo-header">
                <span>Task</span>
                <span>Priority</span>
              </div>
              <div className="todo-list dashboard-scroll-panel">
                {todoTasks.map((task) => (
                  <div key={task.id} className="todo-item">
                    <div className="todo-main">
                      <span className="task-bullet" />
                      <div>
                        <strong>{task.title}</strong>
                        <p>Deadline: {formatTaskDate(task.deadline)}</p>
                      </div>
                    </div>
                    <div className="todo-side">
                      <span className={`priority-pill ${task.priority.toLowerCase()}`}>
                        {task.priority}
                      </span>
                      <span className="mini-avatar">
                        {task.assignee.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
                {todoTasks.length === 0 && <p className="empty-state">No to do tasks right now.</p>}
              </div>
            </article>

            <article className="dashboard-card analytics-card">
              <div className="panel-head">
                <h3>Productivity Analysis</h3>
                <p>Weekly Progress</p>
              </div>

              <div className="analytics-grid">
                <div className="mini-chart">
                  <h4>Weekly Completion Rate</h4>
                  <div className="gauge">
                    <div className="gauge-ring" />
                    <div
                      className="gauge-needle"
                      style={{
                        transform: `rotate(${Math.max(-85, Math.min(85, analytics.completionRate - 50))}deg)`,
                      }}
                    />
                  </div>
                  <p>Weekly Rate: {analytics.completionRate}%</p>
                  <span>
                    Overdue tasks: {analytics.overdueTasks} |{' '}
                    {analytics.completionRate >= 75 ? 'good momentum' : 'needs attention'}
                  </span>
                </div>

                <div className="mini-chart">
                  <h4>Tasks Completed per Day</h4>
                  <div className="bar-chart">
                    {analytics.weeklyBars.map((height, index) => (
                      <span
                        key={chartDays[index]}
                        style={{ height: `${Math.max(height, 4) * 10}px` }}
                        title={`${chartDays[index]}: ${height}`}
                      />
                    ))}
                  </div>
                  <div className="chart-labels">
                    {chartDays.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                </div>

                <div className="mini-chart">
                  <h4>Status Breakdown</h4>
                  <div
                    className="donut-chart"
                    style={{
                      background: `conic-gradient(
                        #8ec5fc 0 ${(analytics.statusBreakdown[0]?.value || 0) / statusTotal * 100}%,
                        #6c63ff ${(analytics.statusBreakdown[0]?.value || 0) / statusTotal * 100}% ${((analytics.statusBreakdown[0]?.value || 0) + (analytics.statusBreakdown[1]?.value || 0)) / statusTotal * 100}%,
                        #f2c66d ${((analytics.statusBreakdown[0]?.value || 0) + (analytics.statusBreakdown[1]?.value || 0)) / statusTotal * 100}% 100%
                      )`,
                    }}
                  />
                  <ul className="legend">
                    {analytics.statusBreakdown.map((item) => (
                      <li key={item.label}>
                        {item.label} ({item.value})
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mini-chart">
                  <h4>Trend Indicator</h4>
                  <div className="line-chart">
                    <svg viewBox="0 0 180 100" aria-hidden="true">
                      <path d="M5 82 C28 72, 42 66, 64 48 S106 14, 124 28 S152 62, 175 24" />
                    </svg>
                  </div>
                  <span>{analytics.trendSummary}</span>
                  <strong className="chart-callout">
                    Most productive category:{' '}
                    {analytics.categoryBreakdown
                      .slice()
                      .sort((left, right) => right.value - left.value)[0]?.label || 'N/A'}
                    {' '}({Math.round(
                      ((analytics.categoryBreakdown
                        .slice()
                        .sort((left, right) => right.value - left.value)[0]?.value || 0) /
                        categoryTotal) *
                        100,
                    )}
                    %)
                  </strong>
                </div>
              </div>
            </article>
          </div>
        )}
      </section>
    </main>
  );
}

function AuthScreen({
  onAuthenticate,
  onSetPassword,
  onOpenForgotPassword,
  initialFormError = '',
  initialNotice = '',
  initialMode = 'login',
  prefilledEmail = '',
}: {
  onAuthenticate: (payload: {
    mode: 'login' | 'signup';
    name?: string;
    email: string;
    password: string;
  }) => Promise<void>;
  onSetPassword: (payload: { password: string }) => Promise<void>;
  onOpenForgotPassword: () => void;
  initialFormError?: string;
  initialNotice?: string;
  initialMode?: 'login' | 'signup' | 'set-password';
  prefilledEmail?: string;
}) {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'set-password'>(
    initialMode,
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState(initialNotice);
  const [authErrors, setAuthErrors] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    form: initialFormError,
  });
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const isLogin = authMode === 'login';
  const isSignup = authMode === 'signup';
  const isSetPassword = authMode === 'set-password';
  const trimmedEmail = email.trim().toLowerCase();
  const isAuthSubmitDisabled =
    isSubmittingAuth ||
    (isSetPassword
      ? !password || !confirmPassword
      : !trimmedEmail || !password || (isSignup && !fullName.trim()));

  useEffect(() => {
    setAuthMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setEmail(prefilledEmail);
  }, [prefilledEmail]);

  useEffect(() => {
    setNotice(initialNotice);
  }, [initialNotice]);

  useEffect(() => {
    setAuthErrors((current) => ({ ...current, form: initialFormError }));
  }, [initialFormError]);

  const validateAuth = () => {
    const nextErrors = {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      form: '',
    };

    if (isSignup && fullName.trim().length < 2) {
      nextErrors.fullName = 'Full name is required';
    }

    if (!isSetPassword) {
      if (!trimmedEmail) {
        nextErrors.email = 'Mail Id is required';
      } else if (trimmedEmail !== email.trim()) {
        nextErrors.email = 'Mail Id must not be in capital letters';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        nextErrors.email = 'Enter a valid Mail Id';
      }
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (/\s/.test(password)) {
      nextErrors.password = 'Password cannot contain spaces';
    } else if ((isSignup || isSetPassword) && !strongPasswordPattern.test(password)) {
      nextErrors.password =
        'Password must be at least 8 characters and include uppercase, lowercase, number, and special character';
    } else if (isLogin && password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    if (isSetPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setAuthErrors(nextErrors);
    return (
      !nextErrors.fullName &&
      !nextErrors.email &&
      !nextErrors.password &&
      !nextErrors.confirmPassword
    );
  };

  const resetMessages = (mode: typeof authMode) => {
    setAuthMode(mode);
    setNotice('');
    setAuthErrors({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      form: '',
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmail(trimmedEmail);

    if (isSubmittingAuth || !validateAuth()) {
      return;
    }

    try {
      setIsSubmittingAuth(true);
      setNotice('');

      if (isSetPassword) {
        await onSetPassword({ password });
        return;
      }

      await onAuthenticate({
        mode: isSignup ? 'signup' : 'login',
        name: fullName.trim(),
        email: trimmedEmail,
        password,
      });
    } catch (error) {
      setAuthErrors((current) => ({
        ...current,
        form: error instanceof Error ? error.message : 'Authentication failed',
      }));
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleGoogleLogin = () => {
    if (typeof window === 'undefined') {
      return;
    }

    const redirectUrl = `${window.location.origin}${window.location.pathname}`;
    window.location.href = authApi.getGoogleAuthUrl(redirectUrl);
  };

  const title = isSetPassword
    ? 'Set a password for your account'
    : isLogin
        ? 'Log in to TaskFlow'
        : 'Create your TaskFlow account';

  const subtitle = isSetPassword
    ? 'You signed in with Google. Set a password now so you can also log in with Mail Id and password.'
    : isLogin
        ? 'Manage your tasks with your TaskFlow account or Google login.'
        : 'Create your account and start working with your dashboard immediately.';

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="spark spark-top" />
      <div className="spark spark-bottom" />

      <section className="hero-panel">
        <div className="hero-badge">AI-powered productivity</div>
        <h1>TaskFlow - Smart AI-Based Task Management System.</h1>
        <p className="hero-copy">
          Plan work clearly, stay ahead of deadlines, and prepare for a professional task
          management experience built to scale with your workflow.
        </p>
        <div className="hero-points">
          <article>
            <span>01</span>
            <h2>Focused execution</h2>
            <p>Keep tasks, priorities, and daily goals visible in one place.</p>
          </article>
          <article>
            <span>02</span>
            <h2>AI-ready foundation</h2>
            <p>Designed for future smart features without cluttering the first experience.</p>
          </article>
        </div>
      </section>

      <section className="login-panel" aria-label="Login">
        <div className="login-card">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <span>T</span>
            </div>
            <span>TaskFlow</span>
          </div>

          <header className="login-header">
            {!isSetPassword && (
              <div className="auth-tabs" aria-label="Authentication mode">
                <button
                  type="button"
                  className={isLogin ? 'auth-tab active' : 'auth-tab'}
                  onClick={() => resetMessages('login')}
                >
                  Log in
                </button>
                <button
                  type="button"
                  className={isSignup ? 'auth-tab active' : 'auth-tab'}
                  onClick={() => resetMessages('signup')}
                >
                  Create account
                </button>
              </div>
            )}
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>

          <form className="login-form" onSubmit={handleSubmit}>
            {isSignup && (
              <>
                <label htmlFor="fullName">Full name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) => {
                    setFullName(event.target.value);
                    setAuthErrors((current) => ({ ...current, fullName: '', form: '' }));
                  }}
                  placeholder="Enter your full name"
                />
                {authErrors.fullName && <p className="form-error">{authErrors.fullName}</p>}
              </>
            )}

            {!isSetPassword && (
              <>
                <label htmlFor="email">Mail Id</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setAuthErrors((current) => ({ ...current, email: '', form: '' }));
                  }}
                  onBlur={() => setEmail((current) => current.trim().toLowerCase())}
                  placeholder="your.mailid@address.com"
                  aria-invalid={Boolean(authErrors.email)}
                  disabled={isSetPassword}
                />
                {authErrors.email && <p className="form-error">{authErrors.email}</p>}
              </>
            )}

            {isSetPassword && (
              <>
                <label htmlFor="setPasswordMailId">Mail Id</label>
                <input
                  id="setPasswordMailId"
                  type="email"
                  value={prefilledEmail}
                  readOnly
                  disabled
                />
              </>
            )}

            <label htmlFor="password">Password</label>
            <div className="password-field">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setAuthErrors((current) => ({ ...current, password: '', form: '' }));
                }}
                placeholder={isSetPassword ? 'Enter your new password' : 'Enter your password'}
                aria-invalid={Boolean(authErrors.password)}
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
            {authErrors.password && <p className="form-error">{authErrors.password}</p>}

            {isSetPassword && (
              <>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setAuthErrors((current) => ({ ...current, confirmPassword: '', form: '' }));
                  }}
                  placeholder="Re-enter your password"
                  aria-invalid={Boolean(authErrors.confirmPassword)}
                />
                {authErrors.confirmPassword && (
                  <p className="form-error">{authErrors.confirmPassword}</p>
                )}
              </>
            )}

            {notice && <p className="form-success">{notice}</p>}
            {authErrors.form && <p className="form-error">{authErrors.form}</p>}

            <div className="form-row">
              <span />
              {isLogin ? (
                <button
                  type="button"
                  className="inline-switch"
                  onClick={onOpenForgotPassword}
                >
                  Forgot password?
                </button>
              ) : isSetPassword ? (
                <span className="helper-copy">This password will be stored for future logins.</span>
              ) : (
                <span className="helper-copy">No account type needed</span>
              )}
            </div>

            <button type="submit" className="primary-button" disabled={isAuthSubmitDisabled}>
              {isSubmittingAuth
                ? 'Checking...'
                : isSetPassword
                    ? 'Set Password'
                    : isLogin
                      ? 'Log In'
                      : 'Create Account'}
            </button>
          </form>

          {!isSetPassword && (
            <>
              <div className="divider">
                <span>or continue with</span>
              </div>

              <div className="social-row">
                <button type="button" className="social-button" onClick={handleGoogleLogin}>
                  <span className="social-icon google">G</span>
                  Google
                </button>
              </div>
            </>
          )}

          {!isSetPassword && (
            <p className="signup-copy">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="inline-switch"
                onClick={() => resetMessages(isLogin ? 'signup' : 'login')}
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('auth');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [currentUserName, setCurrentUserName] = useState('User Name');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskViewFilter>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary>(initialSummary);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReportItem[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<DistributionItem[]>([]);
  const [categoryAnalysis, setCategoryAnalysis] = useState<DistributionItem[]>([]);
  const [productivityReport, setProductivityReport] = useState<ProductivityReport>(initialProductivity);
  const [dashboardError, setDashboardError] = useState('');
  const [authFormError, setAuthFormError] = useState('');
  const [authFormNotice, setAuthFormNotice] = useState('');
  const [forgotPasswordLink, setForgotPasswordLink] = useState('');
  const [authScreenMode, setAuthScreenMode] = useState<'login' | 'signup' | 'set-password'>(
    'login',
  );
  const [resetPasswordToken, setResetPasswordToken] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const handleLogout = () => {
    persistSession(null);
    setAuthSession(null);
    setCurrentUserName('User Name');
    setTasks([]);
    setNotifications([]);
    setDashboardSummary(initialSummary);
    setWeeklyReport([]);
    setStatusDistribution([]);
    setCategoryAnalysis([]);
    setProductivityReport(initialProductivity);
    setDashboardError('');
    setAuthFormError('');
    setAuthFormNotice('');
    setForgotPasswordLink('');
    setAuthScreenMode('login');
    setResetPasswordToken('');
    setTaskFilter('all');
    setCurrentScreen('auth');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, '/');
    }
  };

  const hydrateSession = (session: AuthSession) => {
    setAuthSession(session);
    setCurrentUserName(session.user.name || formatUserNameFromEmail(session.user.email));
    setCurrentScreen('dashboard');
    persistSession(session);
  };

  const loadDashboardData = async (token: string) => {
    const [taskResponse, notificationResponse, summaryResponse, weeklyResponse, statusResponse, categoryResponse, productivityResponse] =
      await Promise.all([
        taskApi.getTasks(token),
        notificationApi.getNotifications(token),
        dashboardApi.getSummary(token),
        reportApi.getWeekly(token),
        reportApi.getStatusDistribution(token),
        reportApi.getCategoryAnalysis(token),
        reportApi.getProductivity(token),
      ]);

    setTasks(taskResponse.data.map(mapBackendTask));
    setNotifications(notificationResponse.data.map(mapBackendNotification));
    setDashboardSummary(summaryResponse.data);
    setWeeklyReport(weeklyResponse.data);
    setStatusDistribution(statusResponse.data);
    setCategoryAnalysis(categoryResponse.data);
    setProductivityReport(productivityResponse.data);
    setDashboardError('');
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        if (typeof window !== 'undefined') {
          const pathName = window.location.pathname;
          const params = new URLSearchParams(window.location.search);
          const token = params.get('token');
          const email = params.get('email');
          const name = params.get('name');
          const authError = params.get('auth_error');
          const hasPassword = params.get('has_password');
          const resetPathMatch = pathName.match(/^\/reset-password\/([^/?#]+)/);

          if (resetPathMatch?.[1]) {
            setResetPasswordToken(decodeURIComponent(resetPathMatch[1]));
            setCurrentScreen('reset-password');
            setAuthFormError('');
            setAuthFormNotice('');
            setForgotPasswordLink('');
            return;
          }

          if (authError) {
            setAuthFormError(authError);
            setAuthFormNotice('');
            setAuthScreenMode('login');
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }

          if (token && email) {
            const needsPasswordSetup = hasPassword === 'false';
            const session: AuthSession = {
              token,
              user: {
                id: 0,
                email,
                name: name || formatUserNameFromEmail(email),
                role: 'user',
                hasPassword: !needsPasswordSetup,
              },
            };

            if (needsPasswordSetup) {
              setAuthSession(session);
              setCurrentUserName(session.user.name);
              persistSession(session);
              setAuthFormError('');
              setAuthFormNotice(
                'Google sign in is successful. Set a password now for future Mail Id logins.',
              );
              setAuthScreenMode('set-password');
              setCurrentScreen('auth');
            } else {
              hydrateSession(session);
              await loadDashboardData(token);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
        }

        const storedSession = readStoredSession();
        if (!storedSession?.token) {
          return;
        }

        hydrateSession(storedSession);
        await loadDashboardData(storedSession.token);
      } catch (error) {
        persistSession(null);
        setAuthSession(null);
        setCurrentScreen('auth');
        setDashboardError(error instanceof Error ? error.message : 'Unable to connect to backend');
        setAuthFormError('');
        setAuthFormNotice('');
        setAuthScreenMode('login');
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  const handleAuthenticate = async ({
    mode,
    name,
    email,
    password,
  }: {
    mode: 'login' | 'signup';
    name?: string;
    email: string;
    password: string;
  }) => {
    const response =
      mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.register(name || '', email, password);

    const session: AuthSession = {
      token: response.data.token,
      user: response.data.user,
    };

    setAuthFormError('');
    setAuthFormNotice('');
    setForgotPasswordLink('');
    setAuthScreenMode('login');
    hydrateSession(session);
    await loadDashboardData(session.token);
  };

  const handleSetPassword = async ({ password }: { password: string }) => {
    if (!authSession?.token) {
      throw new Error('Authentication required');
    }

    const response = await authApi.setPassword(authSession.token, password);
    const updatedSession: AuthSession = {
      ...authSession,
      user: {
        ...authSession.user,
        id: response.data.user.id,
        name: response.data.user.name,
        email: response.data.user.email,
        role: response.data.user.role,
        hasPassword: true,
      },
    };

    setAuthFormError('');
    setAuthFormNotice('');
    setForgotPasswordLink('');
    setAuthScreenMode('login');
    hydrateSession(updatedSession);
    await loadDashboardData(updatedSession.token);
  };

  const handleForgotPassword = async ({
    email,
  }: {
    email: string;
  }) => {
    const response = await authApi.forgotPassword(email);
    const resetLink = response.data?.resetLink || '';

    setAuthFormError('');
    setForgotPasswordLink(resetLink);
    setAuthFormNotice(
      resetLink
        ? 'Reset link generated for local development. Open it below to continue.'
        : response.message || 'If the account exists, a reset link has been sent.',
    );

    return {
      resetLink,
    };
  };

  const handleResetPassword = async ({
    password,
    confirmPassword,
  }: {
    password: string;
    confirmPassword: string;
  }) => {
    if (!resetPasswordToken) {
      throw new Error('Reset token is missing');
    }

    await authApi.resetPassword(resetPasswordToken, password, confirmPassword);
    setResetPasswordToken('');
    setAuthFormError('');
    setAuthFormNotice('Password reset successful. You can now log in.');
    setForgotPasswordLink('');
    setAuthScreenMode('login');
    setCurrentScreen('auth');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, document.title, '/');
    }
  };

  const analytics = useMemo<DashboardAnalytics>(() => {
    const weeklyMap = new Map(
      weeklyReport.map((item) => [
        item.day_name.slice(0, 3),
        Number(item.completed_count || item.task_count || 0),
      ]),
    );
    const weeklyBars = chartDays.map((day) => weeklyMap.get(day) || 0);

    const mappedStatuses = ['Completed', 'In Progress', 'To Do'].map((label) => ({
      label,
      value:
        statusDistribution.find((item) => (item.status || '').toLowerCase() === label.toLowerCase())
          ?.total || 0,
    }));

    const mappedCategories = ['Work', 'Personal', 'Academic'].map((label) => ({
      label,
      value:
        categoryAnalysis.find(
          (item) => (item.category || '').toLowerCase() === label.toLowerCase(),
        )?.total || 0,
    }));

    const maxBarValue = Math.max(...weeklyBars, 0);
    const mostProductiveDay =
      chartDays[weeklyBars.findIndex((value) => value === maxBarValue)] || 'No task data';
    const firstHalf = weeklyBars.slice(0, 3).reduce((sum, value) => sum + value, 0);
    const secondHalf = weeklyBars.slice(3).reduce((sum, value) => sum + value, 0);
    const trendSummary =
      weeklyBars.some((value) => value > 0)
        ? `${mostProductiveDay} had the strongest completion output this week, and the ${
            secondHalf >= firstHalf ? 'second half' : 'first half'
          } of the week performed better.`
        : 'No weekly completion data yet.';

    return {
      weeklyBars,
      completionRate: Math.round(productivityReport.productivityPercentage || 0),
      statusBreakdown: mappedStatuses,
      categoryBreakdown: mappedCategories,
      mostProductiveDay,
      trendSummary,
      overdueTasks: Number(productivityReport.overdueTasks || dashboardSummary.overdueTasks || 0),
    };
  }, [categoryAnalysis, dashboardSummary.overdueTasks, productivityReport, statusDistribution, weeklyReport]);

  const handleAssignMember = (payload: {
    memberName: string;
    memberEmail: string;
    phoneNumber: string;
    work: string;
    workSequence: WorkSequence;
    deadline: string;
    priority: TaskPriority;
  }) => {
    const member = payload.memberName || 'Assigned member';
    const work = payload.work || 'New task';
    const deadline = payload.deadline || 'upcoming deadline';
    const audience = payload.memberEmail?.trim() || member;

    if (typeof window !== 'undefined' && payload.memberEmail?.trim()) {
      const subject = encodeURIComponent(`TaskFlow assignment: ${work}`);
      const body = encodeURIComponent(
        `Hello ${member},\n\nYou have been assigned a task in TaskFlow.\n\nTask: ${work}\nWork Sequence: ${payload.workSequence}\nPriority: ${payload.priority}\nDeadline: ${deadline}\nPhone: ${payload.phoneNumber || 'Not provided'}\n\nPlease review it in TaskFlow.`,
      );
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
          payload.memberEmail.trim(),
        )}&su=${subject}&body=${body}`,
        '_blank',
        'noopener,noreferrer',
      );
    }

    setNotifications((current) => [
      {
        id: Date.now(),
        title: `Assignment sent to ${member}`,
        detail: `${work} was assigned under ${payload.workSequence} with ${payload.priority} priority. Mail id: ${
          payload.memberEmail || 'not provided'
        }. Contact: ${payload.phoneNumber || 'not provided'}. Deadline: ${deadline}.`,
        audience,
        category: 'team',
        createdAt: new Date().toISOString(),
        isRead: false,
        priority: payload.priority,
      },
      ...current,
    ]);
  };

  const handleAddTask = (task: Omit<TaskItem, 'id'>) => {
    setTasks((current) => [{ id: Date.now(), ...task }, ...current]);
  };

  const handleUpdateTask = (taskId: number, updates: Omit<TaskItem, 'id'>) => {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
    );
  };

  const handleDeleteTask = (taskId: number) => {
    setTasks((current) => current.filter((task) => task.id !== taskId));
  };

  const handleMarkAllRead = () => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
  };

  const handleMarkRead = (notificationId: number) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification,
      ),
    );
  };

  const handleDeleteNotification = (notificationId: number) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId),
    );
  };

  const openTaskView = (filter: TaskViewFilter) => {
    setTaskFilter(filter);
    setCurrentScreen('task');
  };

  if (isBootstrapping) {
    return (
      <main className="app-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <section className="login-panel" aria-label="Loading TaskFlow">
          <div className="login-card">
            <header className="login-header">
              <h2>Loading TaskFlow</h2>
              <p>Connecting your workspace to the backend services.</p>
            </header>
          </div>
        </section>
      </main>
    );
  }

  if (currentScreen === 'reset-password') {
    return (
      <ResetPasswordPage
        onSubmit={handleResetPassword}
        onBackToLogin={() => {
          setResetPasswordToken('');
          setAuthFormError('');
          setAuthFormNotice('');
          setCurrentScreen('auth');
          setAuthScreenMode('login');
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, document.title, '/');
          }
        }}
      />
    );
  }

  if (currentScreen === 'forgot-password') {
    return (
      <ForgotPasswordPage
        initialEmail={authSession?.user.email || ''}
        initialError={authFormError}
        initialNotice={authFormNotice}
        initialResetLink={forgotPasswordLink}
        onSubmit={handleForgotPassword}
        onBackToLogin={() => {
          setAuthFormError('');
          setAuthFormNotice('');
          setForgotPasswordLink('');
          setAuthScreenMode('login');
          setCurrentScreen('auth');
        }}
      />
    );
  }

  if (currentScreen === 'auth' || !authSession) {
    return (
      <AuthScreen
        onAuthenticate={handleAuthenticate}
        onSetPassword={handleSetPassword}
        onOpenForgotPassword={() => {
          setAuthFormError('');
          setAuthFormNotice('');
          setForgotPasswordLink('');
          setCurrentScreen('forgot-password');
        }}
        initialFormError={authFormError}
        initialNotice={authFormNotice}
        initialMode={authScreenMode}
        prefilledEmail={authSession?.user.email || ''}
      />
    );
  }

  if (currentScreen === 'task') {
    return (
      <TaskPage
        tasks={tasks}
        notifications={notifications}
        activeFilter={taskFilter}
        onAddTask={handleAddTask}
        onDeleteTask={handleDeleteTask}
        onUpdateTask={handleUpdateTask}
        onChangeFilter={setTaskFilter}
        onAssignMember={handleAssignMember}
        onNavigate={setCurrentScreen}
        userName={currentUserName}
        onLogout={handleLogout}
      />
    );
  }

  if (currentScreen === 'teams') {
    return (
      <TeamsPage
        tasks={tasks}
        onNavigate={setCurrentScreen}
        userName={currentUserName}
        onLogout={handleLogout}
      />
    );
  }

  if (currentScreen === 'notifications') {
    return (
      <NotificationPage
        notifications={notifications}
        onNavigate={setCurrentScreen}
        onMarkAllRead={handleMarkAllRead}
        onMarkRead={handleMarkRead}
        onDeleteNotification={handleDeleteNotification}
        userName={currentUserName}
        onLogout={handleLogout}
      />
    );
  }

  if (currentScreen === 'reports') {
    return (
      <ReportsPage
        tasks={tasks}
        onNavigate={setCurrentScreen}
        userName={currentUserName}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <Dashboard
      tasks={tasks}
      summary={dashboardSummary}
      analytics={analytics}
      onNavigate={setCurrentScreen}
      onOpenTaskView={openTaskView}
      onLogout={handleLogout}
      userName={currentUserName}
      dashboardError={dashboardError}
    />
  );
}

export default App;
