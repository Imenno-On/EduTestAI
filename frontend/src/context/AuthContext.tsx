import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { authApi, UserResponse } from "@/lib/api";

export type UserRole = "guest" | "user" | "admin";

export type User = UserResponse;

type AuthState = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
};

type AuthContextValue = AuthState & {
  isAuthenticated: boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    email: string;
    password: string;
    fullName?: string;
  }) => Promise<void>;
  logout: () => void;
  resetError: () => void;
};

const STORAGE_KEY = "edutest_auth_state";

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as {
        user: User;
        token: string;
      };
      setState((prev) => ({
        ...prev,
        user: parsed.user,
        token: parsed.token,
      }));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persistState = useCallback((user: User, token: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }));
  }, []);

  const clearPersistedState = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await authApi.login(email, password);
        persistState(data.user, data.access_token);
        setState({
          user: data.user,
          token: data.access_token,
          isLoading: false,
          error: null,
        });
      } catch (e: any) {
        const message = e?.message ?? "Не удалось выполнить вход";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw e;
      }
    },
    [persistState],
  );

  const register = useCallback(
    async (params: { email: string; password: string; fullName?: string }) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const data = await authApi.register({
          email: params.email,
          password: params.password,
          full_name: params.fullName,
        } as any);
        persistState(data.user, data.access_token);
        setState({
          user: data.user,
          token: data.access_token,
          isLoading: false,
          error: null,
        });
      } catch (e: any) {
        const message = e?.message ?? "Не удалось создать аккаунт";
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        throw e;
      }
    },
    [persistState],
  );

  const logout = useCallback(() => {
    clearPersistedState();
    setState({
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
  }, [clearPersistedState]);

  const resetError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: Boolean(state.user && state.token),
      isAdmin: Boolean(state.user?.role === "admin" || state.user?.is_superuser),
      canManageUsers: Boolean(
        state.user?.role === "admin" || state.user?.is_superuser,
      ),
      login,
      register,
      logout,
      resetError,
    }),
    [state, login, register, logout, resetError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

