import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";

const mockUseAuth = vi.fn();

vi.mock("./context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("./components/HomePage", () => ({
  HomePage: () => <div>Home page</div>,
}));

vi.mock("./components/AuthPage", () => ({
  AuthPage: () => <div>Login page</div>,
}));

vi.mock("./components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: ReactNode }) => (
    <div>
      <div>Dashboard layout</div>
      {children}
    </div>
  ),
}));

vi.mock("./components/TestsPage", () => ({
  TestsPage: () => <div>Tests page</div>,
}));

vi.mock("./components/StudentsPage", () => ({
  StudentsPage: () => <div>Students page</div>,
}));

vi.mock("./components/GroupsPage", () => ({
  GroupsPage: () => <div>Groups page</div>,
}));

vi.mock("./components/StatisticsPage", () => ({
  StatisticsPage: () => <div>Statistics page</div>,
}));

vi.mock("./components/AdminPage", () => ({
  AdminPage: () => <div>Admin page</div>,
}));

import App from "./App";

function renderApp(initialPath: string) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("App routing guards", () => {
  it("redirects guests from protected routes to login", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
    });

    renderApp("/app/tests");

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("redirects non-admin users away from the admin route", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: false,
    });

    renderApp("/app/admin");

    expect(await screen.findByText("Tests page")).toBeInTheDocument();
    expect(screen.queryByText("Admin page")).not.toBeInTheDocument();
  });

  it("allows administrators to open the admin route", async () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isAdmin: true,
    });

    renderApp("/app/admin");

    expect(await screen.findByText("Admin page")).toBeInTheDocument();
  });
});
