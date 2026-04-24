import { ArrowDown, TrendingDown, Sparkles } from 'lucide-react';

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    community: string;
    district: string;
    totalPrice: number;
    unitPrice: number;
    rooms: number;
    bathrooms: number;
    area: number;
    floor: string;
    orientation: string;
    platform: string;
    updatedAt: string;
    tags: string[];
  };
  onClick: () => void;
}

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const getTagStyle = (tag: string) => {
    switch (tag) {
      case '降价':
        return 'bg-orange-50 text-orange-700';
      case '新上':
        return 'bg-blue-50 text-blue-700';
      case '低价':
        return 'bg-green-50 text-green-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getTagIcon = (tag: string) => {
    switch (tag) {
      case '降价':
        return <TrendingDown className="w-3 h-3" />;
      case '新上':
        return <Sparkles className="w-3 h-3" />;
      case '低价':
        return <ArrowDown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg p-3.5 active:bg-gray-50 transition-colors cursor-pointer border border-gray-100"
    >
      {/* 第一行：标题 + 平台角标 */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="flex-1 text-sm font-medium text-gray-900 line-clamp-1">
          {property.title}
        </h3>
        <span className="ml-2 text-xs text-gray-400 flex-shrink-0">
          {property.platform}
        </span>
      </div>

      {/* 第二行：小区 | 区域 */}
      <div className="text-xs text-gray-500 mb-2.5">
        {property.community} | {property.district}
      </div>

      {/* 第三行：价格 */}
      <div className="flex items-baseline gap-2 mb-2.5">
        <span className="text-xl font-semibold text-red-600">
          {property.totalPrice}
          <span className="text-sm font-normal ml-0.5">万</span>
        </span>
        <span className="text-xs text-gray-400">
          {property.unitPrice.toLocaleString()}元/㎡
        </span>
      </div>

      {/* 第四行：户型信息 */}
      <div className="text-xs text-gray-600 mb-2.5">
        {property.rooms}房{property.bathrooms}卫 · {property.area}平 · {property.floor} · {property.orientation}
      </div>

      {/* 第五行：标签 */}
      {property.tags.length > 0 && (
        <div className="flex gap-1.5 mb-2.5">
          {property.tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${getTagStyle(tag)}`}
            >
              {getTagIcon(tag)}
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 第六行：更新时间 */}
      <div className="text-xs text-gray-400">
        更新于 {property.updatedAt}
      </div>
    </div>
  );
}
