import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { HomePage } from "./components/HomePage";
import { AuthPage } from "./components/AuthPage";
import { DashboardLayout } from "./components/DashboardLayout";
import { TestsPage } from "./components/TestsPage";
import { useAuth } from "./context/AuthContext";
import { Card } from "./components/ui/card";

const StudentsPage = lazy(() =>
  import("./components/StudentsPage").then((module) => ({
    default: module.StudentsPage,
  })),
);
const GroupsPage = lazy(() =>
  import("./components/GroupsPage").then((module) => ({
    default: module.GroupsPage,
  })),
);
const StatisticsPage = lazy(() =>
  import("./components/StatisticsPage").then((module) => ({
    default: module.StatisticsPage,
  })),
);
const AdminPage = lazy(() =>
  import("./components/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function AdminRoute() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/app/tests" replace />;
  }
  return <Outlet />;
}

function AppShell() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}

function RouteFallback() {
  return (
    <div className="flex justify-center items-center min-h-[40vh]">
      <Card className="p-6">Загрузка страницы...</Card>
    </div>
  );
}

function NotFoundPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <Card className="p-8 text-center max-w-md">
        <h1 className="text-2xl font-semibold mb-2">Страница не найдена</h1>
        <p className="text-muted-foreground">
          Такой страницы не существует или она была перемещена.
        </p>
      </Card>
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<AuthPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/tests" replace />} />
            <Route path="tests" element={<TestsPage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="groups" element={<GroupsPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

