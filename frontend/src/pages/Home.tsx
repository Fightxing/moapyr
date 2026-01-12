import { useEffect, useState } from 'react';
import { api } from '../api';

export const Home = () => {
  const [resources, setResources] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchResources = async () => {
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    const data = await api.get(`/resources${q}`);
    setResources(data.results || []);
  };

  useEffect(() => {
    fetchResources();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="搜索资源..."
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchResources()}
        />
        <button
          onClick={fetchResources}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          搜索
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((res) => (
          <div key={res.id} className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 truncate">
                <a href={`/resource/${res.id}`} className="hover:text-indigo-600">{res.title}</a>
              </h3>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{res.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>Downloads: {res.downloads}</span>
                <span>{new Date(res.created_at * 1000).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
