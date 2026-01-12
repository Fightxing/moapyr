import { useEffect, useState } from 'react';
import { api } from '../api';

export const Admin = () => {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [pending, setPending] = useState<any[]>([]);
  const [authed, setAuthed] = useState(false);

  const fetchPending = async () => {
    try {
      const data = await api.get('/admin/pending', {
        headers: { 'x-admin-token': token }
      });
      // Assuming if data.results exists, auth was good. Better would be checking res.ok in api.ts but this works for MVP
      if (data.results) {
        setPending(data.results);
        setAuthed(true);
        localStorage.setItem('admin_token', token);
      } else {
        setAuthed(false);
      }
    } catch (e) {
      setAuthed(false);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    await api.post(`/admin/${action}/${id}`, {}, { 'x-admin-token': token });
    fetchPending();
  };

  useEffect(() => {
    if (token) fetchPending();
  }, []);

  if (!authed) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <h2 className="text-xl font-bold mb-4">管理员登录</h2>
        <input
          type="password"
          placeholder="Enter Admin Token"
          className="w-full border p-2 rounded mb-4"
          value={token}
          onChange={e => setToken(e.target.value)}
        />
        <button onClick={fetchPending} className="w-full bg-indigo-600 text-white p-2 rounded">
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">待审核资源</h2>
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {pending.length === 0 && <li className="p-4 text-gray-500">暂无待审核内容。</li>}
          {pending.map((res) => (
            <li key={res.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <p className="text-sm font-medium text-indigo-600 truncate">{res.title}</p>
                  <p className="ml-1 flex-shrink-0 font-normal text-gray-500">Uploaded by IP: {res.uploader_ip}</p>
                </div>
                <div className="flex gap-2">
                   <button
                    onClick={() => handleAction(res.id, 'approve')}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700"
                  >
                    通过
                  </button>
                  <button
                    onClick={() => handleAction(res.id, 'reject')}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                  >
                    拒绝
                  </button>
                </div>
              </div>
              <div className="mt-2 sm:flex sm:justify-between">
                <div className="sm:flex">
                  <p className="flex items-center text-sm text-gray-500">
                    {res.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
