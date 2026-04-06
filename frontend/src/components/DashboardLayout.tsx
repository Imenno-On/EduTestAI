import { ReactNode } from "react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  FileText,
  Users,
  FolderKanban,
  BarChart3,
  Sparkles,
  LogOut,
  Plus,
  Shield,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Seo } from "./Seo";

interface DashboardLayoutProps {
  children: ReactNode;
}

const baseMenuItems = [
  { id: "tests", label: "Мои тесты", icon: FileText, path: "/app/tests" },
  { id: "students", label: "Ученики", icon: Users, path: "/app/students" },
  { id: "groups", label: "Группы", icon: FolderKanban, path: "/app/groups" },
  { id: "statistics", label: "Статистика", icon: BarChart3, path: "/app/statistics" },
];

const pageDescriptions: Record<string, string> = {
  tests: "Управляйте созданными тестами",
  students: "Список учеников и их результаты",
  groups: "Организуйте учеников в группы",
  statistics: "Анализ успеваемости и прогресса",
  admin: "Управление ролями пользователей",
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = [
    ...baseMenuItems,
    ...(isAdmin
      ? [{ id: "admin", label: "Пользователи", icon: Shield, path: "/app/admin" }]
      : []),
  ];
  const currentPage = location.pathname.split("/").pop() || "tests";

  return (
    <div className="flex h-screen bg-gray-50">
      <Seo
        title={`EduTest AI | ${
          menuItems.find((item) => item.id === currentPage)?.label || "Кабинет"
        }`}
        description="Закрытый раздел EduTest AI для управления тестами и учебными данными."
        canonicalPath={location.pathname}
        noIndex
      />
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold">EduTest AI</span>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/30"
                      : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">
                {(user?.full_name || user?.email || "ED")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {user?.full_name || "Неизвестный преподаватель"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {menuItems.find((item) => item.id === currentPage)?.label || "Кабинет"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pageDescriptions[currentPage] || "Рабочая область приложения"}
            </p>
          </div>
          {(currentPage === "tests" || currentPage === "groups") && (
            <Button
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              {currentPage === "tests" ? "Создать тест" : "Создать группу"}
            </Button>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>

      {/* Floating action button for mobile-like experience */}
      {currentPage === "tests" && (
        <button
          onClick={() => navigate("/")}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
