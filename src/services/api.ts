export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string;
  has_password?: number | boolean;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type BackendTask = {
  id: number;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'To Do' | 'In Progress' | 'Completed';
  category: 'Work' | 'Personal' | 'Academic';
  deadline: string;
  assignee_id: number | null;
  assignee_name?: string | null;
  created_by: number;
  created_by_name?: string | null;
  evaluation_by: number | null;
  progress: number;
  created_at: string;
};

export type BackendNotification = {
  id: number;
  user_id: number;
  message: string;
  type: 'task_assigned' | 'reminder' | 'update';
  is_read: boolean;
  created_at: string;
};

export type DashboardSummary = {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
};

export type WeeklyReportItem = {
  day_name: string;
  task_count: number;
  completed_count: number;
};

export type DistributionItem = {
  status?: string;
  category?: string;
  total: number;
};

export type ProductivityReport = {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  productivityPercentage: number;
};

export type ForgotPasswordResponse = {
  resetLink?: string | null;
  delivery?: 'smtp' | 'development';
};

/* =========================
   API BASE URL
========================= */

const configuredApiBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');

const isLocalhostApi = (value: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(value);

const PRODUCTION_FALLBACK_API_BASE_URL =
  'https://task-management-app-osjt.onrender.com/api';

function resolveApiBaseUrl() {
  const isBrowser = typeof window !== 'undefined';
  const isRunningOnLocalhost =
    isBrowser &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  if (configuredApiBaseUrl) {
    if (!(isLocalhostApi(configuredApiBaseUrl) && !isRunningOnLocalhost)) {
      return configuredApiBaseUrl;
    }
    console.warn(
      '[TaskFlow] Ignoring localhost VITE_API_BASE_URL outside local runtime:',
      configuredApiBaseUrl,
    );
  }

  if (isRunningOnLocalhost) {
    return 'http://localhost:5000/api';
  }

  return PRODUCTION_FALLBACK_API_BASE_URL;
}

const API_BASE_URL = resolveApiBaseUrl();

/* =========================
   API RESPONSE TYPES
========================= */

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/* =========================
   COMMON API REQUEST
========================= */

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (_error) {
    throw new Error(
      `Cannot connect to backend. Check backend server at ${API_BASE_URL}`,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { message?: string; details?: unknown }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed');
  }

  return payload as ApiEnvelope<T>;
}

/* =========================
   AUTH HEADERS
========================= */

function getAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

/* =========================
   AUTH API
========================= */

export const authApi = {
  login(email: string, password: string) {
    return apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  register(name: string, email: string, password: string) {
    return apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  setPassword(token: string, password: string) {
    return apiRequest<{ user: AuthUser }>('/auth/set-password', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        password,
        confirmPassword: password,
      }),
    });
  },

  forgotPassword(email: string) {
    return apiRequest<ForgotPasswordResponse | null>(
      '/auth/forgot-password',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
    );
  },

  resetPassword(
    token: string,
    password: string,
    confirmPassword: string,
  ) {
    return apiRequest<{ message: string }>(
      `/auth/reset-password/${token}`,
      {
        method: 'POST',
        body: JSON.stringify({
          password,
          confirmPassword,
        }),
      },
    );
  },

  getGoogleAuthUrl(redirectUrl: string) {
    return `${API_BASE_URL}/auth/google?redirect_url=${encodeURIComponent(
      redirectUrl,
    )}`;
  },
};

/* =========================
   TASK API
========================= */

export const taskApi = {
  async getTasks(token: string) {
    return apiRequest<BackendTask[]>(
      '/tasks?limit=100&page=1&sortBy=deadline',
      {
        headers: getAuthHeaders(token),
      },
    );
  },
};

/* =========================
   NOTIFICATION API
========================= */

export const notificationApi = {
  async getNotifications(token: string) {
    return apiRequest<BackendNotification[]>('/notifications', {
      headers: getAuthHeaders(token),
    });
  },
};

/* =========================
   DASHBOARD API
========================= */

export const dashboardApi = {
  async getSummary(token: string) {
    return apiRequest<DashboardSummary>('/dashboard/summary', {
      headers: getAuthHeaders(token),
    });
  },
};

/* =========================
   REPORT API
========================= */

export const reportApi = {
  async getWeekly(token: string) {
    return apiRequest<WeeklyReportItem[]>('/reports/weekly', {
      headers: getAuthHeaders(token),
    });
  },

  async getStatusDistribution(token: string) {
    return apiRequest<DistributionItem[]>(
      '/reports/status-distribution',
      {
        headers: getAuthHeaders(token),
      },
    );
  },

  async getCategoryAnalysis(token: string) {
    return apiRequest<DistributionItem[]>(
      '/reports/category-analysis',
      {
        headers: getAuthHeaders(token),
      },
    );
  },

  async getProductivity(token: string) {
    return apiRequest<ProductivityReport>(
      '/reports/productivity',
      {
        headers: getAuthHeaders(token),
      },
    );
  },
};

export { API_BASE_URL };
