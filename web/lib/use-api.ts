import { useState, useCallback } from 'react';
import { ApiResponse } from './api-client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async <P extends any[]>(
    apiCall: (...args: P) => Promise<ApiResponse<T>>,
    ...args: P
  ): Promise<ApiResponse<T>> => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await apiCall(...args);

      if (response.success && response.data) {
        setState({ data: response.data, loading: false, error: null });
      } else {
        setState({ data: null, loading: false, error: response.error || 'Unknown error' });
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({ data: null, loading: false, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
