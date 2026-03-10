import { useEffect, useState } from "react";
import { HomePage } from "./components/HomePage";
import { AuthPage } from "./components/AuthPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { TestsPage } from "./components/TestsPage";
import { StudentsPage } from "./components/StudentsPage";
import { GroupsPage } from "./components/GroupsPage";
import { StatisticsPage } from "./components/StatisticsPage";
import { AdminPage } from "./components/AdminPage";
import { useAuth } from "./context/AuthContext";

type Page =
  | "home"
  | "auth"
  | "dashboard"
  | "tests"
  | "students"
  | "groups"
  | "statistics"
  | "admin";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const { isAuthenticated, isAdmin, logout } = useAuth();

  useEffect(() => {
    if (
      !isAuthenticated &&
      ["dashboard", "tests", "students", "groups", "statistics", "admin"].includes(
        currentPage,
      )
    ) {
      setCurrentPage("auth");
    }
  }, [isAuthenticated, currentPage]);

  const handleNavigate = (page: string) => {
    const targetPage = page as Page;
    const protectedPages: Page[] = [
      "dashboard",
      "tests",
      "students",
      "groups",
      "statistics",
      "admin",
    ];

    if (protectedPages.includes(targetPage) && !isAuthenticated) {
      setCurrentPage("auth");
      return;
    }
    if (targetPage === "admin" && !isAdmin) {
      setCurrentPage("dashboard");
      return;
    }

    setCurrentPage(targetPage);
  };

  const handleCreateTest = () => {
    setCurrentPage("home");
  };

  if (currentPage === "home") {
    return <HomePage onNavigate={handleNavigate} />;
  }

  if (currentPage === "auth") {
    return <AuthPage onNavigate={handleNavigate} />;
  }

  const dashboardPages: Page[] = [
    "dashboard",
    "tests",
    "students",
    "groups",
    "statistics",
    "admin",
  ];
  if (dashboardPages.includes(currentPage)) {
    const activePage = currentPage === "dashboard" ? "tests" : currentPage;

    return (
      <DashboardLayout
        currentPage={activePage}
        onNavigate={handleNavigate}
        onCreateTest={handleCreateTest}
        onLogout={() => {
          logout();
          setCurrentPage("home");
        }}
      >
        {activePage === "tests" && <TestsPage />}
        {activePage === "students" && <StudentsPage />}
        {activePage === "groups" && <GroupsPage />}
        {activePage === "statistics" && <StatisticsPage />}
        {activePage === "admin" && <AdminPage onNavigate={handleNavigate} />}
      </DashboardLayout>
    );
  }

  return null;
}

