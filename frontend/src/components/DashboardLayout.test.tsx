import type { ButtonHTMLAttributes, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";

const mockUseAuth = vi.fn();

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("./ui/button", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("./ui/avatar", () => ({
  Avatar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("lucide-react", () => {
  const Icon = () => <span aria-hidden="true" />;
  return {
    FileText: Icon,
    Users: Icon,
    FolderKanban: Icon,
    BarChart3: Icon,
    Sparkles: Icon,
    LogOut: Icon,
    Plus: Icon,
    Shield: Icon,
  };
});

vi.mock("./Seo", () => ({
  Seo: () => null,
}));

import { DashboardLayout } from "./DashboardLayout";

function renderLayout(path: string) {
  render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <DashboardLayout>
          <div>Page content</div>
        </DashboardLayout>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe("DashboardLayout", () => {
  it("shows the admin navigation item only for admins", () => {
    mockUseAuth.mockReturnValue({
      user: {
        email: "admin@example.com",
        full_name: "Admin User",
      },
      isAdmin: true,
      logout: vi.fn(),
    });

    renderLayout("/app/tests");

    expect(screen.getByText("Пользователи")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("hides the admin navigation item for regular users", () => {
    mockUseAuth.mockReturnValue({
      user: {
        email: "teacher@example.com",
        full_name: "Teacher User",
      },
      isAdmin: false,
      logout: vi.fn(),
    });

    renderLayout("/app/tests");

    expect(screen.queryByText("Пользователи")).not.toBeInTheDocument();
    expect(screen.getByText("Teacher User")).toBeInTheDocument();
  });
});
