import { useCallback, useEffect, useState } from "react";
import { testsApi, GeneratedForm } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type GeneratedFormsState = {
  data: GeneratedForm[];
  isLoading: boolean;
  error: string | null;
};

export function useGeneratedForms() {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<GeneratedFormsState>({
    data: [],
    isLoading: false,
    error: null,
  });

  const fetchForms = useCallback(async () => {
    if (!isAuthenticated) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await testsApi.getGeneratedForms();
      setState({ data, isLoading: false, error: null });
    } catch (e: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: e?.message ?? "Не удалось загрузить тесты",
      }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  return {
    ...state,
    refetch: fetchForms,
  };
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

