// API Utility for local MySQL backend

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API Request failed');
  }

  return response.json();
}
