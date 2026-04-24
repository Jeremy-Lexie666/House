export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg p-3.5 border border-gray-100 animate-pulse">
      {/* 标题 + 平台 */}
      <div className="flex justify-between items-start mb-2">
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-3 bg-gray-200 rounded w-12"></div>
      </div>

      {/* 小区 | 区域 */}
      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2.5"></div>

      {/* 价格 */}
      <div className="flex items-baseline gap-2 mb-2.5">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>

      {/* 户型信息 */}
      <div className="h-3 bg-gray-200 rounded w-full mb-2.5"></div>

      {/* 标签 */}
      <div className="flex gap-1.5 mb-2.5">
        <div className="h-5 w-12 bg-gray-200 rounded"></div>
        <div className="h-5 w-12 bg-gray-200 rounded"></div>
      </div>

      {/* 更新时间 */}
      <div className="h-3 bg-gray-200 rounded w-24"></div>
    </div>
  );
}
