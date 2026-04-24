import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Plus, Pencil, Trash2, Home } from 'lucide-react';

export function WatchManagePage() {
  const navigate = useNavigate();
  const [watches, setWatches] = useState([
    {
      id: '1',
      community: '锦绣花园二期',
      district: '南山',
      rooms: 3,
      bathrooms: 2,
      lastRefresh: '14:25',
    },
    {
      id: '2',
      community: '深圳湾1号',
      district: '南山',
      rooms: 4,
      bathrooms: 3,
      lastRefresh: '昨天',
    },
  ]);

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条关注吗？')) {
      setWatches(watches.filter((w) => w.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="px-4 py-3 flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <span className="ml-2 font-medium text-gray-900">我的关注</span>
          </div>
        </div>

        {/* 关注列表 */}
        {watches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Home className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">还没有关注条件</h3>
            <button
              onClick={() => navigate('/watch/add')}
              className="mt-4 px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              去添加
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-2.5">
            {watches.map((watch) => (
              <div
                key={watch.id}
                className="bg-white rounded-xl p-4 border border-gray-100"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1.5">
                      {watch.community}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                      <span>{watch.district}</span>
                      <span className="text-gray-300">·</span>
                      <span>{watch.rooms}房{watch.bathrooms}卫</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    最近刷新 {watch.lastRefresh}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/watch/edit/${watch.id}`)}
                      className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(watch.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部新增按钮 */}
        {watches.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => navigate('/watch/add')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                新增关注
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
