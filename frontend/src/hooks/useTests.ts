import { useCallback, useEffect, useState } from "react";
import {
  testsApi,
  GeneratedForm,
  PaginatedResponse,
  TestsListParams,
  TestAttachmentWithUrl,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type PaginatedState = {
  data: GeneratedForm[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
};

export function useGeneratedForms(params?: TestsListParams) {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<PaginatedState>({
    data: [],
    total: 0,
    page: 1,
    perPage: 10,
    totalPages: 0,
    isLoading: false,
    error: null,
  });

  const fetchForms = useCallback(async () => {
    if (!isAuthenticated) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await testsApi.getGeneratedForms(params);
      setState({
        data: res.items,
        total: res.total,
        page: res.page,
        perPage: res.per_page,
        totalPages: res.total_pages,
        isLoading: false,
        error: null,
      });
    } catch (e: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: e?.message ?? "Не удалось загрузить тесты",
      }));
    }
  }, [isAuthenticated, JSON.stringify(params || {})]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  return {
    ...state,
    refetch: fetchForms,
  };
}

export function useTestAttachments(formId: number | null) {
  const [attachments, setAttachments] = useState<TestAttachmentWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAttachments = useCallback(async () => {
    if (!formId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await testsApi.listAttachments(formId);
      setAttachments(data);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось загрузить вложения");
    } finally {
      setIsLoading(false);
    }
  }, [formId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  return { attachments, isLoading, error, refetch: fetchAttachments };
}

export function useDeleteGeneratedForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      await testsApi.deleteGeneratedForm(id);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось удалить тест");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutateAsync, isLoading, error };
}

export function useGenerateTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutateAsync = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);
    try {
      return await testsApi.generateTest(text);
    } catch (e: any) {
      setError(e?.message ?? "Не удалось создать тест");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutateAsync, isLoading, error };
}

