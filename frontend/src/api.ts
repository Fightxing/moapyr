const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787/api';

export const api = {
  get: async (path: string) => {
    const res = await fetch(`${API_BASE}${path}`);
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
