const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://traceone-backend.onrender.com';

/**
 * Utilitário base para requisições na API
 * Utiliza o NEXT_PUBLIC_API_URL definido no .env.local
 * O backend NestJS usa o prefixo global /api, então todas as rotas ficam em /api/...
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_URL}/api${normalizedEndpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }

  return response;
}
