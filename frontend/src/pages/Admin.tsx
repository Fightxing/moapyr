import { useEffect, useState } from 'react';
import { api } from '../api';

export const Admin = () => {
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || '');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<any[]>([]);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');

  const fetchPending = async () => {
    try {
      const data = await api.get('/admin/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (data.error) throw new Error(data.error);
      
      setPending(data.results || []);
      setAuthed(true);
    } catch (e) {
      console.error(e);
      setAuthed(false);
      // Only clear if it was an auth error
      if (token) {
         // optionally verify if 401
      }
    }
  };

  const handleLogin = async () => {
    setError('');
    try {
      const res = await api.post('/admin/login', { username, code });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.token) {
        localStorage.setItem('jwt_token', res.token);
        setToken(res.token);
      }
    } catch (e) {
      setError('Login failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setToken('');
    setAuthed(false);
    setPending([]);
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    await api.post(`/admin/${action}/${id}`, {}, { 'Authorization': `Bearer ${token}` });
    fetchPending();
  };

  useEffect(() => {
    if (token) fetchPending();
  }, [token]);

  if (!token || !authed) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded shadow">
        <h2 className="text-xl font-bold mb-6 text-center">Admin Access</h2>
        {error && <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm">{error}</div>}
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 p-2 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Authenticator Code (6-digit)</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 p-2 rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="123456"
            />
          </div>

          <button 
            onClick={handleLogin} 
            className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 transition"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">待审核资源</h2>
        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600">Logout</button>
      </div>
      
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
