import { Home } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Home className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">当前没有匹配房源</h3>
      <p className="text-sm text-gray-500 text-center">可以调整关注条件或手动刷新试试</p>
    </div>
  );
}
