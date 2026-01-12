import { useState } from 'react';
import { api } from '../api';

export const Upload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'idle' | 'init' | 'uploading' | 'finalizing' | 'done' | 'error'>('idle');

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    try {
      setStatus('init');
      // 1. Init Upload
      const initData = await api.post('/resources/init-upload', {
        title,
        description,
        tags,
        fileName: file.name,
        fileSize: file.size
      });

      if (initData.error) throw new Error(initData.error);

      // 2. Upload to R2
      setStatus('uploading');
      await api.upload(initData.uploadUrl, file);

      // 3. Finalize
      setStatus('finalizing');
      await api.post('/resources/finalize-upload', { id: initData.id });

      setStatus('done');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="bg-green-50 p-4 rounded-md">
        <h2 className="text-green-800 text-lg font-medium">上传成功！</h2>
        <p className="text-green-700">您的资源已提交，审核通过后将公开显示。</p>
        <a href="/" className="text-green-900 underline mt-2 block">返回首页</a>
      </div>
    );
  }

  return (
    <div className="bg-white shadow sm:rounded-lg max-w-2xl mx-auto">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">上传新资源</h3>
        <form onSubmit={handleUpload} className="mt-5 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">标题</label>
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">简介</label>
            <textarea
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">标签 (逗号分隔)</label>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              value={tags}
              onChange={e => setTags(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">文件</label>
            <input
              type="file"
              required
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
          </div>

          <button
            type="submit"
            disabled={status !== 'idle' && status !== 'error'}
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {status === 'idle' || status === 'error' ? '开始上传' : `正在处理: ${status}...`}
          </button>
          
          {status === 'error' && <p className="text-red-500 text-sm">上传失败，请重试。</p>}
        </form>
      </div>
    </div>
  );
};
