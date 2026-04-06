import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const loginMock = vi.fn();
const registerMock = vi.fn();
const logoutMock = vi.fn();

vi.mock("@/lib/api", () => ({
  authApi: {
    login: (...args: unknown[]) => loginMock(...args),
    register: (...args: unknown[]) => registerMock(...args),
    logout: (...args: unknown[]) => logoutMock(...args),
  },
}));

import { AuthProvider, useAuth } from "./AuthContext";

const STORAGE_KEY = "edutest_auth_state";

function Probe() {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="auth-state">
        {auth.isAuthenticated ? "authenticated" : "guest"}
      </div>
      <div data-testid="role-state">{auth.isAdmin ? "admin" : "user"}</div>
      <div data-testid="error-state">{auth.error ?? "no-error"}</div>
      <button onClick={() => auth.login("teacher@example.com", "secret123")}>
        login
      </button>
      <button
        onClick={() =>
          auth.register({
            email: "new@example.com",
            password: "secret123",
            fullName: "New User",
          })
        }
      >
        register
      </button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  it("restores persisted auth state and clears malformed storage", () => {
    localStorage.setItem(STORAGE_KEY, "{broken-json");

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("auth-state")).toHaveTextContent("guest");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("persists login result and exposes admin capabilities", async () => {
    loginMock.mockResolvedValue({
      access_token: "token-1",
      token_type: "bearer",
      user: {
        id: 1,
        email: "teacher@example.com",
        full_name: "Teacher User",
        is_active: true,
        is_superuser: true,
        role: "admin",
        created_at: "2026-01-01T00:00:00Z",
      },
    });

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await user.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("authenticated");
    });
    expect(screen.getByTestId("role-state")).toHaveTextContent("admin");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}").token).toBe(
      "token-1",
    );
  });

  it("clears persisted state on logout even when api call resolves asynchronously", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        user: {
          id: 1,
          email: "teacher@example.com",
          role: "user",
        },
        token: "token-1",
      }),
    );
    logoutMock.mockResolvedValue(undefined);

    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await user.click(screen.getByText("logout"));

    await waitFor(() => {
      expect(screen.getByTestId("auth-state")).toHaveTextContent("guest");
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
