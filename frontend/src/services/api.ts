const API_BASE = '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;
  invalidParams?: Array<{ name: string; reason: string }>;

  constructor(status: number, message: string, data?: any, invalidParams?: any[]) {
    super(message);
    this.status = status;
    this.data = data;
    this.invalidParams = invalidParams;
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const correlationId = `corr_client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': correlationId,
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const isJson = res.headers.get('content-type')?.includes('application/json') ||
      res.headers.get('content-type')?.includes('application/problem+json');
    const data = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message = data?.detail || data?.message || data?.title || 'An API error occurred';
      throw new ApiError(res.status, message, data, data?.invalidParams);
    }

    return (data?.data !== undefined ? data.data : data) as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(500, err.message || 'Network communication error');
  }
}
