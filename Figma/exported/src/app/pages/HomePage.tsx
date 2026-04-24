import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RefreshCw, ArrowUpDown, Settings } from 'lucide-react';
import { PropertyCard } from '../components/PropertyCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { EmptyState } from '../components/EmptyState';

const mockProperties = [
  {
    id: '1',
    title: '锦绣花园二期 精装三房',
    community: '锦绣花园二期',
    district: '南山',
    totalPrice: 680,
    unitPrice: 75556,
    rooms: 3,
    bathrooms: 2,
    area: 90,
    floor: '中楼层',
    orientation: '南',
    platform: '贝壳找房',
    updatedAt: '10:42',
    tags: ['降价', '低价'],
  },
  {
    id: '2',
    title: '锦绣花园二期 南向大三房',
    community: '锦绣花园二期',
    district: '南山',
    totalPrice: 720,
    unitPrice: 77419,
    rooms: 3,
    bathrooms: 2,
    area: 93,
    floor: '高楼层',
    orientation: '南',
    platform: '链家',
    updatedAt: '昨天',
    tags: ['新上'],
  },
  {
    id: '3',
    title: '锦绣花园二期 三房两厅',
    community: '锦绣花园二期',
    district: '南山',
    totalPrice: 750,
    unitPrice: 78947,
    rooms: 3,
    bathrooms: 2,
    area: 95,
    floor: '低楼层',
    orientation: '东南',
    platform: '安居客',
    updatedAt: '2天前',
    tags: [],
  },
  {
    id: '4',
    title: '锦绣花园二期 满五唯一',
    community: '锦绣花园二期',
    district: '南山',
    totalPrice: 780,
    unitPrice: 81250,
    rooms: 3,
    bathrooms: 2,
    area: 96,
    floor: '中楼层',
    orientation: '南北',
    platform: '贝壳找房',
    updatedAt: '3天前',
    tags: [],
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState(mockProperties);
  const [lastUpdated, setLastUpdated] = useState('14:25');

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const now = new Date();
      setLastUpdated(`${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
    }, 1500);
  };

  const handlePropertyClick = (id: string) => {
    navigate(`/property/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto pb-safe">
        {/* 顶部导航区 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="px-4 py-3 flex justify-between items-center">
            <div>
              <h1 className="font-semibold text-gray-900">深圳二手房观察</h1>
              <p className="text-xs text-gray-400 mt-0.5">最近更新于 {lastUpdated}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/watch')}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 排序栏 */}
        <div className="px-4 py-2.5 bg-white border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>按总价从低到高</span>
          </div>
        </div>

        {/* 房源列表区 */}
        <div className="p-3 space-y-2.5">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : properties.length === 0 ? (
            <EmptyState />
          ) : (
            properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onClick={() => handlePropertyClick(property.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
