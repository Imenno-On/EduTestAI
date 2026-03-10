import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  ExternalLink,
  Copy,
  Trash2,
  Users,
  Calendar,
  Check,
} from "lucide-react";
import { useGeneratedForms, useDeleteGeneratedForm } from "@/hooks/useTests";
import { useAuth } from "@/context/AuthContext";

export function TestsPage() {
  const { data: tests, isLoading, error, refetch } = useGeneratedForms();
  const { isAdmin } = useAuth();
  const deleteMutation = useDeleteGeneratedForm();

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот тест?")) return;
    await deleteMutation.mutateAsync(id);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        Загрузка тестов...
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-300 bg-red-50">
        <p className="text-red-700">
          Ошибка при загрузке тестов. Попробуйте обновить страницу.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => refetch()}
        >
          Повторить
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6 border-2 border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Всего тестов</span>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-3xl font-semibold">{tests.length}</p>
        </Card>

        <Card className="p-6 border-2 border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Всего вопросов</span>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-semibold">
            {tests.reduce((sum, t) => sum + (t.question_count ?? 0), 0)}
          </p>
        </Card>

        <Card className="p-6 border-2 border-yellow-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Последний тест
            </span>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <p className="text-sm font-medium">
            {tests[0]?.title || "Ещё нет тестов"}
          </p>
        </Card>
      </div>

      {tests.length === 0 && (
        <Card className="p-12 text-center border-2 border-dashed border-gray-300">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExternalLink className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold mb-2">Нет созданных тестов</h3>
          <p className="text-muted-foreground mb-6">
            Создайте свой первый тест на главной странице с помощью AI.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-6">
        {tests.map((test) => (
          <Card
            key={test.id}
            className="p-6 hover:shadow-lg transition-shadow border-2 border-gray-100 hover:border-purple-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold mb-2">{test.title}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(test.created_at).toLocaleString("ru-RU")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Вопросов: {test.question_count}
                  </span>
                  {isAdmin && test.owner_email && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Автор: {test.owner_full_name || test.owner_email}
                    </span>
                  )}
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                AI тест
              </Badge>
            </div>

            <div className="flex items-center gap-2 bg-accent border border-primary/20 rounded-lg p-3 mb-3">
              <ExternalLink className="w-4 h-4 text-primary flex-shrink-0" />
              <a
                href={test.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary flex-1 truncate hover:underline"
              >
                {test.published_url}
              </a>
              <Button
                onClick={() => handleCopy(test.published_url)}
                variant="ghost"
                size="sm"
                className="flex-shrink-0 h-8 w-8 p-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex justify-between items-center mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(test.edit_url, "_blank")}
              >
                Редактировать в Google Forms
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(test.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

