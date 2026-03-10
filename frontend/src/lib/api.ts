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

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
}

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
  token_type: string;
  user: UserResponse;
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
};

export const testsApi = {
  getGeneratedForms: () =>
    request<GeneratedForm[]>("/api/tests/generated"),

  deleteGeneratedForm: (formId: number) =>
    request<void>(`/api/tests/generated/${formId}`, {
      method: "DELETE",
    }),

  generateTest: (text: string) =>
    request<GeneratedForm>("/api/tests/generate", {
      method: "POST",
      body: { text },
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

