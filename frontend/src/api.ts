// Helper to ensure URL has protocol
const ensureProtocol = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

// Log for debugging
console.log('Configured VITE_API_URL:', import.meta.env.VITE_API_URL);

const API_BASE = import.meta.env.VITE_API_URL 
  ? ensureProtocol(import.meta.env.VITE_API_URL) 
  : 'http://localhost:8787/api';

console.log('Active API_BASE:', API_BASE);

export const api = {
  get: async (path: string, options: RequestInit = {}) => {
    const res = await fetch(`${API_BASE}${path}`, options);
    return res.json();
  },
  post: async (path: string, body: any, headers: any = {}) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  upload: async (url: string, file: File) => {
    await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': 'application/octet-stream', // Or file.type
      },
    });
  }
};
