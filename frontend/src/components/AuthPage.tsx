import { FormEvent, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Sparkles, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Seo } from "./Seo";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const { login, register, isLoading, error, resetError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    resetError();
    if (isLogin) {
      await login(email, password);
    } else {
      await register({ email, password, fullName });
    }
    navigate("/app/tests");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-100 via-white to-yellow-100 flex items-center justify-center p-8 relative overflow-hidden">
      <Seo
        title="Вход в EduTest AI"
        description="Войдите в EduTest AI, чтобы управлять своими тестами, генерировать новые материалы и работать с учебными данными."
        canonicalPath="/login"
        noIndex
      />
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          На главную
        </Button>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-semibold">EduTest AI</span>
        </div>

        {/* Auth Card */}
        <Card className="p-8 shadow-2xl border-2 border-purple-100 backdrop-blur-sm bg-white/95">
          <header className="mb-6 text-center">
            <h1 className="text-2xl font-semibold mb-2">
              {isLogin ? "Вход в аккаунт" : "Создать аккаунт"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin 
                ? "Войдите, чтобы управлять своими тестами" 
                : "Зарегистрируйтесь и начните создавать тесты"}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com"
                required
                className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm">Пароль</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block mb-2 text-sm">Имя и фамилия</label>
                <Input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="h-11 border-2 border-gray-200 focus:border-primary rounded-lg"
                />
              </div>
            )}

            {isLogin && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span className="text-muted-foreground">Запомнить меня</span>
                </label>
                <a href="#" className="text-primary hover:underline">
                  Забыли пароль?
                </a>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary"
            >
              {isLoading
                ? "Подождите..."
                : isLogin
                  ? "Войти"
                  : "Создать аккаунт"}
            </Button>
            {error ? (
              <p className="text-sm text-red-600 text-center" role="alert">
                {error}
              </p>
            ) : null}
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              {isLogin ? (
                <>
                  Нет аккаунта?{" "}
                  <span className="text-primary font-medium">Создать аккаунт</span>
                </>
              ) : (
                <>
                  Уже есть аккаунт?{" "}
                  <span className="text-primary font-medium">Войти</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Продолжая, вы соглашаетесь с условиями использования и политикой конфиденциальности
            </p>
          </div>
        </Card>

        {/* Additional info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Присоединяйтесь к тысячам преподавателей, использующих EduTest AI
          </p>
        </div>
      </div>
    </main>
  );
}
