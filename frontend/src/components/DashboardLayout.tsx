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

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onCreateTest?: () => void;
  onLogout?: () => void;
}

const baseMenuItems = [
  { id: "tests", label: "Мои тесты", icon: FileText },
  { id: "students", label: "Ученики", icon: Users },
  { id: "groups", label: "Группы", icon: FolderKanban },
  { id: "statistics", label: "Статистика", icon: BarChart3 },
];

export function DashboardLayout({
  children,
  currentPage,
  onNavigate,
  onCreateTest,
  onLogout,
}: DashboardLayoutProps) {
  const { user, isAdmin } = useAuth();
  const menuItems = [
    ...baseMenuItems,
    ...(isAdmin ? [{ id: "admin", label: "Пользователи", icon: Shield }] : []),
  ];
  return (
    <div className="flex h-screen bg-gray-50">
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
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/30"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
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
              onLogout?.();
              onNavigate("home");
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
              {currentPage === "tests" && "Управляйте созданными тестами"}
              {currentPage === "students" &&
                "Список учеников и их результаты"}
              {currentPage === "groups" && "Организуйте учеников в группы"}
              {currentPage === "statistics" &&
                "Анализ успеваемости и прогресса"}
              {currentPage === "admin" && "Управление ролями пользователей"}
            </p>
          </div>
          {(currentPage === "tests" || currentPage === "groups") && onCreateTest && (
            <Button
              onClick={onCreateTest}
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
      {currentPage === "tests" && onCreateTest && (
        <button
          onClick={onCreateTest}
          className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
