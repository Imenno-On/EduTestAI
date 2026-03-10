import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Sparkles, ExternalLink, Copy, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGenerateTest } from "@/hooks/useTests";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [inputText, setInputText] = useState("");
  const [generatedForm, setGeneratedForm] = useState<{
    published_url: string;
    edit_url: string;
  } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const { isAuthenticated, user, logout } = useAuth();
  const generateMutation = useGenerateTest();

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    if (!isAuthenticated) {
      onNavigate("auth");
      return;
    }
    const result = await generateMutation.mutateAsync(inputText);
    setGeneratedForm({
      published_url: result.published_url,
      edit_url: result.edit_url,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-yellow-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold">EduTest AI</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden md:block">
                  {user?.full_name || user?.email}
                </span>
                <Button variant="ghost" onClick={() => onNavigate("dashboard")}>
                  Мои тесты
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    logout();
                    onNavigate("home");
                  }}
                >
                  Выйти
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => onNavigate("dashboard")}>
                  Мои тесты
                </Button>
                <Button onClick={() => onNavigate("auth")}>Войти</Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-primary rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm">Powered by AI</span>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
            EduTest AI
          </h1>
          <p className="text-xl text-muted-foreground">
            Создавайте тесты из любого текста с помощью AI.
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-8 shadow-xl border-2 border-purple-100">
          {!generatedForm ? (
            <div className="space-y-6">
              <div>
                <label className="block mb-3 text-foreground">
                  Вставьте текст для генерации теста
                </label>
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Например: История Российской Федерации началась после распада СССР в 1991 году. Первым президентом России стал Борис Ельцин..."
                  className="min-h-[300px] resize-none border-2 border-gray-200 focus:border-primary rounded-xl"
                />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{inputText.length} символов</span>
                <span>Рекомендуемый объём: от 500 символов</span>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!inputText.trim() || generateMutation.isLoading}
                className="w-full h-12 bg-gradient-to-r from-primary to-purple-600 hover:from-purple-600 hover:to-primary"
                size="lg"
              >
                {generateMutation.isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Генерация теста...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {isAuthenticated
                      ? "Сгенерировать тест"
                      : "Войдите для создания теста"}
                  </>
                )}
              </Button>
              {!isAuthenticated && (
                <p className="text-sm text-center text-muted-foreground">
                  Для создания теста необходимо{" "}
                  <button
                    onClick={() => onNavigate("auth")}
                    className="text-primary hover:underline"
                  >
                    войти в систему
                  </button>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">Тест успешно создан!</h3>
                <p className="text-muted-foreground mb-6">
                  Форма готова и опубликована в Google Forms
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="bg-accent border-2 border-primary/20 rounded-xl p-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    Ссылка на тест (для прохождения):
                  </p>
                  <div className="flex items-center gap-3 bg-white border-2 border-primary/30 rounded-lg p-4">
                    <ExternalLink className="w-5 h-5 text-primary flex-shrink-0" />
                    <a
                      href={generatedForm.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary flex-1 truncate hover:underline"
                    >
                      {generatedForm.published_url}
                    </a>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          generatedForm.published_url,
                        );
                        setCopiedUrl(generatedForm.published_url);
                        setTimeout(() => setCopiedUrl(null), 2000);
                      }}
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0"
                    >
                      {copiedUrl === generatedForm.published_url ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setGeneratedForm(null);
                      setInputText("");
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Создать новый тест
                  </Button>
                  <Button
                    onClick={() => onNavigate("dashboard")}
                    className="flex-1 bg-gradient-to-r from-primary to-purple-600"
                  >
                    Перейти в кабинет
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6 mt-16">
          <Card className="p-6 text-center border-2 border-purple-100 hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">AI генерация</h4>
            <p className="text-sm text-muted-foreground">
              Автоматическое создание вопросов на основе текста
            </p>
          </Card>
          <Card className="p-6 text-center border-2 border-yellow-100 hover:border-secondary transition-colors">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="w-6 h-6 text-secondary" />
            </div>
            <h4 className="font-semibold mb-2">Яндекс Формы</h4>
            <p className="text-sm text-muted-foreground">
              Автоматическая публикация в Яндекс Формах
            </p>
          </Card>
          <Card className="p-6 text-center border-2 border-purple-100 hover:border-primary transition-colors">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Быстро и просто</h4>
            <p className="text-sm text-muted-foreground">
              Создание теста за несколько секунд
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
