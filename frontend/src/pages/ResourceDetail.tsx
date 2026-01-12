import { useEffect, useState } from 'react';
import { api } from '../api';

// Simple helper to parse URL ID
const getIdFromUrl = () => {
  const path = window.location.pathname;
  return path.split('/').pop();
};

export const ResourceDetail = () => {
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const id = getIdFromUrl();

  useEffect(() => {
    if (!id) return;
    api.get(`/resources/${id}`)
      .then(setResource)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    try {
      const { downloadUrl } = await api.get(`/resources/${id}/download`);
      window.location.href = downloadUrl;
    } catch (e) {
      alert('Download failed');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!resource) return <div>Resource not found</div>;

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">{resource.title}</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">ID: {resource.id}</p>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200">
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">{resource.description}</dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Tags</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{resource.tags}</dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">File Info</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {resource.file_name} ({(resource.file_size / 1024 / 1024).toFixed(2)} MB)
            </dd>
          </div>
          <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Stats</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              Downloads: {resource.downloads}
            </dd>
          </div>
        </dl>
      </div>
      <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-end">
        <button
          onClick={handleDownload}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          下载资源
        </button>
      </div>
    </div>
  );
};
