const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  data: any;
  invalidParams?: Array<{ name: string; reason: string }>;

  constructor(status: number, message: string, data?: any, invalidParams?: Array<{ name: string; reason: string }>) {
    super(message);
    this.status = status;
    this.data = data;
    this.invalidParams = invalidParams;
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const correlationId = `corr_client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': correlationId,
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers, credentials: 'include' });
    const isJson = response.headers.get('content-type')?.includes('application/json') ||
      response.headers.get('content-type')?.includes('application/problem+json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message = isJson
        ? data?.detail || data?.message || data?.title || data?.error || `API request failed (${response.status}).`
        : response.status === 404
          ? 'The API is not deployed for this Vercel project. Set the project Root Directory to . and redeploy from main.'
          : `API request failed (${response.status}).`;
      throw new ApiError(response.status, message, data, data?.invalidParams);
    }

    return (data?.data !== undefined ? data.data : data) as T;
  } catch (error: any) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error.message || 'Network communication error');
  }
}
