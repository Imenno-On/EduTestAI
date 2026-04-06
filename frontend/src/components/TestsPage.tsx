import { useCallback, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  ExternalLink,
  Copy,
  Trash2,
  Users,
  Calendar,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  FileText,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useGeneratedForms, useDeleteGeneratedForm, useTestAttachments } from "@/hooks/useTests";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "@/hooks/useSearchParams";
import { testsApi, TestsListParams } from "@/lib/api";

export function TestsPage() {
  const { isAdmin } = useAuth();
  const { get, set } = useSearchParams();

  const [search, setSearch] = useState(() => get("search") ?? "");
  const [dateFrom, setDateFrom] = useState(() => get("date_from") ?? "");
  const [dateTo, setDateTo] = useState(() => get("date_to") ?? "");
  const [ownerId, setOwnerId] = useState<string>(() => get("owner_id") ?? "");
  const [sort, setSort] = useState<"created_at" | "title" | "question_count">(
    () => (get("sort") as any) || "created_at"
  );
  const [order, setOrder] = useState<"asc" | "desc">(() => (get("order") as any) || "desc");
  const [page, setPage] = useState(() => parseInt(get("page") || "1", 10) || 1);
  const [perPage, setPerPage] = useState(() => parseInt(get("per_page") || "10", 10) || 10);

  const [appliedParams, setAppliedParams] = useState<TestsListParams>(() => ({
    search: get("search") || undefined,
    date_from: get("date_from") || undefined,
    date_to: get("date_to") || undefined,
    owner_id: get("owner_id") ? parseInt(get("owner_id")!, 10) : undefined,
    sort: (get("sort") as "created_at" | "title" | "question_count") || "created_at",
    order: (get("order") as "asc" | "desc") || "desc",
    page: parseInt(get("page") || "1", 10) || 1,
    per_page: parseInt(get("per_page") || "10", 10) || 10,
  }));

  const { data: tests, total, page: currentPage, totalPages, isLoading, error, refetch } = useGeneratedForms(appliedParams);
  const deleteMutation = useDeleteGeneratedForm();

  const applyFilters = useCallback(() => {
    const next: TestsListParams = {
      search: search || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      owner_id: ownerId ? parseInt(ownerId, 10) : undefined,
      sort,
      order,
      page: 1,
      per_page: perPage,
    };
    setAppliedParams(next);
    setPage(1);
    set({
      search: next.search,
      date_from: next.date_from,
      date_to: next.date_to,
      owner_id: next.owner_id != null ? String(next.owner_id) : undefined,
      sort: next.sort,
      order: next.order,
      page: undefined,
      per_page: next.per_page !== 10 ? next.per_page : undefined,
    });
  }, [search, dateFrom, dateTo, ownerId, sort, order, perPage, set]);

  const handleSearch = () => applyFilters();

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setAppliedParams((prev) => ({ ...prev, page: newPage }));
    set({ page: newPage > 1 ? newPage : undefined });
  };

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот тест?")) return;
    await deleteMutation.mutateAsync(id);
    refetch();
  };

  if (isLoading && tests.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && tests.length === 0) {
    return (
      <Card className="p-6 border-red-300 bg-red-50">
        <p className="text-red-700">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Повторить
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Фильтры */}
      <Card className="p-6 border-2 border-purple-100">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Фильтры и поиск
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1">Поиск по названию</label>
            <Input
              placeholder="Введите текст..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-10"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Дата от</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Дата до</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10"
            />
          </div>
          {isAdmin && (
            <div>
              <label className="block text-sm mb-1">ID владельца</label>
              <Input
                type="number"
                placeholder="Все"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="h-10"
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 items-end">
          <div>
            <label className="block text-sm mb-1">Сортировка</label>
            <Select value={sort} onValueChange={(v: any) => setSort(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">По дате</SelectItem>
                <SelectItem value="title">По названию</SelectItem>
                <SelectItem value="question_count">По кол-ву вопросов</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">Порядок</label>
            <Select value={order} onValueChange={(v: any) => setOrder(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">По убыванию</SelectItem>
                <SelectItem value="asc">По возрастанию</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm mb-1">На странице</label>
            <Select value={String(perPage)} onValueChange={(v) => setPerPage(parseInt(v, 10))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSearch} className="bg-gradient-to-r from-primary to-purple-600">
            Применить
          </Button>
        </div>
      </Card>

      {/* Сводка */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="p-6 border-2 border-purple-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Всего тестов</span>
            <Check className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-semibold">{total}</p>
        </Card>
        <Card className="p-6 border-2 border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Всего вопросов</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-semibold">
            {tests.reduce((sum, t) => sum + (t.question_count ?? 0), 0)}
          </p>
        </Card>
        <Card className="p-6 border-2 border-yellow-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Последний тест</span>
            <Calendar className="w-5 h-5 text-secondary" />
          </div>
          <p className="text-sm font-medium truncate">{tests[0]?.title || "—"}</p>
        </Card>
      </div>

      {tests.length === 0 ? (
        <Card className="p-12 text-center border-2 border-dashed border-gray-300">
          <ExternalLink className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="font-semibold mb-2">Нет тестов</h3>
          <p className="text-muted-foreground">
            Создайте тест на главной странице или измените фильтры.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6">
            {tests.map((test) => (
              <TestCard
                key={test.id}
                test={test}
                isAdmin={isAdmin}
                onCopy={handleCopy}
                onDelete={handleDelete}
                isDeleting={deleteMutation.isLoading}
              />
            ))}
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Страница {currentPage} из {totalPages} (всего {total})
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Далее
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TestCard({
  test,
  isAdmin,
  onCopy,
  onDelete,
  isDeleting,
}: {
  test: { id: number; title: string; published_url: string; edit_url: string; question_count: number; created_at: string; owner_email?: string | null; owner_full_name?: string | null };
  isAdmin: boolean;
  onCopy: (url: string) => void;
  onDelete: (id: number) => Promise<void>;
  isDeleting: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const {
    attachments,
    isLoading: loadingAttachments,
    refetch: refetchAttachments,
  } = useTestAttachments(test.id, attachmentsOpen);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      await testsApi.uploadAttachment(test.id, file);
      refetchAttachments();
    } catch (err: any) {
      setUploadError(err?.message ?? "Ошибка загрузки");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!confirm("Удалить вложение?")) return;
    await testsApi.deleteAttachment(test.id, attachmentId);
    refetchAttachments();
  };

  const toggleAttachments = async () => {
    const nextOpen = !attachmentsOpen;
    setAttachmentsOpen(nextOpen);
    if (nextOpen && attachments.length === 0) {
      await refetchAttachments();
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow border-2 border-gray-100 hover:border-purple-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold mb-2 truncate">{test.title}</h3>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              {new Date(test.created_at).toLocaleString("ru-RU")}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4 flex-shrink-0" />
              Вопросов: {test.question_count}
            </span>
            {isAdmin && (test.owner_email || test.owner_full_name) && (
              <span className="flex items-center gap-1">
                Автор: {test.owner_full_name || test.owner_email}
              </span>
            )}
          </div>
        </div>
        <Badge className="bg-green-100 text-green-700">AI тест</Badge>
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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onCopy(test.published_url)}>
          <Copy className="w-4 h-4" />
        </Button>
      </div>

      {/* Вложения */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Вложения</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleAttachments}>
              {attachmentsOpen ? "Скрыть" : "Показать"}
            </Button>
            <label className="cursor-pointer inline-flex">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.txt"
                onChange={handleUpload}
                disabled={uploading}
              />
              <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background px-3 py-2 h-9 hover:bg-accent hover:text-accent-foreground">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Upload className="w-4 h-4 mr-1" />
                )}
                Загрузить
              </span>
            </label>
          </div>
        </div>
        {uploadError && <p className="text-sm text-red-600 mb-1">{uploadError}</p>}
        {attachmentsOpen ? (
          loadingAttachments ? (
            <p className="text-sm text-muted-foreground">Загрузка списка...</p>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет вложений</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map((att) => (
                <li key={att.id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={att.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate flex-1"
                  >
                    {att.filename}
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => handleDeleteAttachment(att.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Вложения загружаются по запросу, чтобы не перегружать страницу.
          </p>
        )}
      </div>

      <div className="flex justify-between items-center mt-2">
        <Button variant="outline" size="sm" onClick={() => window.open(test.edit_url, "_blank")}>
          Редактировать в Google Forms
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(test.id)}
          disabled={isDeleting}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Удалить
        </Button>
      </div>
    </Card>
  );
}
