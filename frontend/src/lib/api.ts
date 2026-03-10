const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

type HttpMethod = "GET" | "POST" | "DELETE" | "PATCH";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
};

type StoredAuth = {
  user: {
    id: number;
    email: string;
    full_name?: string | null;
    is_active: boolean;
    is_superuser: boolean;
    role?: string;
  };
  token: string;
  refreshToken?: string;
};

const STORAGE_KEY = "edutest_auth_state";

function getToken(): string | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    return parsed.token ?? null;
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    return parsed.refreshToken ?? null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
  retryOnAuth: boolean = true,
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      // FastAPI-style error
      if (typeof data.detail === "string") {
        detail = data.detail;
      } else if (Array.isArray(data.detail)) {
        detail = data.detail.map((d: any) => d.msg ?? "").join("; ");
      }
    } catch {
      // ignore parse error
    }

    if (res.status === 401 && retryOnAuth) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        return request<T>(path, options, false);
      }
    }

    throw new Error(detail || `HTTP ${res.status}`);
  }

  if (res.status === 204) {
    // no content
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}

// ===== Types =====

export interface GeneratedForm {
  id: number;
  title: string;
  published_url: string;
  edit_url: string;
  question_count: number;
  created_at: string;
  owner_id?: number | null;
  owner_email?: string | null;
  owner_full_name?: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface TestAttachment {
  id: number;
  form_id: number;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface TestAttachmentWithUrl extends TestAttachment {
  download_url: string;
}

export type TestsListParams = {
  search?: string;
  date_from?: string;
  date_to?: string;
  owner_id?: number;
  sort?: "created_at" | "title" | "question_count";
  order?: "asc" | "desc";
  page?: number;
  per_page?: number;
};

export interface UserResponse {
  id: number;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  is_superuser: boolean;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserResponse;
}

async function refreshTokens(): Promise<AuthResponse | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const data = await request<AuthResponse>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: { refresh_token: refreshToken },
      },
      false,
    );

    const payload: StoredAuth = {
      user: data.user,
      token: data.access_token,
      refreshToken: data.refresh_token,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return data;
  } catch {
    return null;
  }
}

// ===== API clients =====

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),

  register: (params: { email: string; password: string; full_name?: string }) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: {
        email: params.email,
        password: params.password,
        full_name: params.full_name,
      },
    }),

  logout: async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return;
    await request<void>(
      "/api/auth/logout",
      {
        method: "POST",
        body: { refresh_token: refreshToken },
      },
      false,
    );
  },
};

function buildQueryString(params: TestsListParams): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.date_from) sp.set("date_from", params.date_from);
  if (params.date_to) sp.set("date_to", params.date_to);
  if (params.owner_id != null) sp.set("owner_id", String(params.owner_id));
  if (params.sort) sp.set("sort", params.sort);
  if (params.order) sp.set("order", params.order);
  if (params.page != null) sp.set("page", String(params.page));
  if (params.per_page != null) sp.set("per_page", String(params.per_page));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export const testsApi = {
  getGeneratedForms: (params?: TestsListParams) => {
    const qs = params ? buildQueryString(params) : "";
    return request<PaginatedResponse<GeneratedForm>>(`/api/tests/generated${qs}`);
  },

  getGeneratedForm: (formId: number) =>
    request<GeneratedForm>(`/api/tests/generated/${formId}`),

  updateGeneratedForm: (formId: number, data: { title?: string }) =>
    request<GeneratedForm>(`/api/tests/generated/${formId}`, {
      method: "PATCH",
      body: data,
    }),

  deleteGeneratedForm: (formId: number) =>
    request<void>(`/api/tests/generated/${formId}`, {
      method: "DELETE",
    }),

  generateTest: (text: string) =>
    request<GeneratedForm>("/api/tests/generate", {
      method: "POST",
      body: { text },
    }),

  listAttachments: (formId: number) =>
    request<TestAttachmentWithUrl[]>(`/api/tests/generated/${formId}/attachments`),

  uploadAttachment: async (formId: number, file: File) => {
    const url = `${API_BASE_URL}/api/tests/generated/${formId}/attachments`;
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(url, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data?.detail ?? res.statusText;
      throw new Error(typeof detail === "string" ? detail : "Upload failed");
    }
    return res.json() as Promise<TestAttachment>;
  },

  deleteAttachment: (formId: number, attachmentId: number) =>
    request<void>(`/api/tests/generated/${formId}/attachments/${attachmentId}`, {
      method: "DELETE",
    }),
};

export const usersApi = {
  listUsers: () => request<UserResponse[]>("/api/users"),

  updateUserRole: (userId: number, role: string) =>
    request<UserResponse>(`/api/users/${userId}/role`, {
      method: "PATCH",
      body: { role },
    }),
};

