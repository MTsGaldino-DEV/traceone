const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://traceone-backend.onrender.com';

/**
 * Utilitário base para requisições na API
 * Utiliza o NEXT_PUBLIC_API_URL definido no .env.local
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
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
