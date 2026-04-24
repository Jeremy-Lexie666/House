import { useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronLeft, ExternalLink, Camera } from 'lucide-react';

export function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Mock data
  const property = {
    id,
    title: '锦绣花园二期 精装三房',
    community: '锦绣花园二期',
    district: '南山',
    totalPrice: 680,
    unitPrice: 75556,
    priceDown: 12,
    rooms: 3,
    bathrooms: 2,
    area: 90,
    floor: '中楼层/共32层',
    orientation: '南',
    decoration: '精装',
    buildYear: '2015',
    elevator: '有',
    propertyType: '住宅',
    platform: '贝壳找房',
    updatedAt: '2026-04-24 10:42',
    imageCount: 5,
    hasVR: true,
    vrUrl: 'https://example.com/vr',
    sourceUrl: 'https://example.com/property/1',
    images: [
      'https://images.unsplash.com/photo-1724582586529-62622e50c0b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzc3MDE0MTYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzc3MDE0MTYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
      'https://images.unsplash.com/photo-1664711942326-2c3351e215e6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzc3MDE0MTYzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    ],
  };

  const infoItems = [
    { label: '户型', value: `${property.rooms}房${property.bathrooms}卫` },
    { label: '面积', value: `${property.area}㎡` },
    { label: '楼层', value: property.floor },
    { label: '朝向', value: property.orientation },
    { label: '装修', value: property.decoration },
    { label: '建成年代', value: property.buildYear },
    { label: '电梯', value: property.elevator },
    { label: '用途', value: property.propertyType },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="px-4 py-3 flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <span className="ml-2 font-medium text-gray-900">房源详情</span>
          </div>
        </div>

        {/* 图片轮播区 */}
        <div className="relative bg-gray-100 aspect-[4/3]">
          {property.images.length > 0 ? (
            <>
              <img
                src={property.images[currentImageIndex]}
                alt="房源图片"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {property.platform}
              </div>
              <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {currentImageIndex + 1} / {property.images.length}
              </div>
              {property.images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {property.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="w-12 h-12 text-gray-300" />
            </div>
          )}
        </div>

        {/* 核心价格区 */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-3xl font-semibold text-red-600">
              {property.totalPrice}
              <span className="text-base font-normal ml-1">万</span>
            </span>
            <span className="text-sm text-gray-500">
              {property.unitPrice.toLocaleString()}元/㎡
            </span>
          </div>
          {property.priceDown && (
            <div className="inline-flex items-center px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded">
              较上次抓取下降 {property.priceDown} 万
            </div>
          )}
        </div>

        {/* 标题与基础信息区 */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h1 className="font-medium text-gray-900 mb-3">{property.title}</h1>
          <div className="space-y-1.5 text-sm">
            <div className="flex items-center text-gray-600">
              <span className="w-16 text-gray-400">小区</span>
              <span>{property.community}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <span className="w-16 text-gray-400">区域</span>
              <span>{property.district}</span>
            </div>
            <div className="flex items-center text-gray-400 text-xs">
              <span className="w-16">更新时间</span>
              <span>{property.updatedAt}</span>
            </div>
          </div>
        </div>

        {/* 参数信息区 */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900 mb-3">房源信息</h2>
          <div className="grid grid-cols-2 gap-3">
            {infoItems.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                <div className="text-sm text-gray-900">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 媒体与来源区 */}
        <div className="px-4 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900 mb-3">媒体信息</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center text-gray-600">
              <span className="w-20 text-gray-400">图片数量</span>
              <span>{property.imageCount} 张</span>
            </div>
            <div className="flex items-center text-gray-600">
              <span className="w-20 text-gray-400">VR看房</span>
              <span>{property.hasVR ? '支持' : '不支持'}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <span className="w-20 text-gray-400">来源平台</span>
              <span>{property.platform}</span>
            </div>
            <div className="flex items-center text-gray-400 text-xs">
              <span className="w-20">抓取时间</span>
              <span>{property.updatedAt}</span>
            </div>
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
          <div className="max-w-2xl mx-auto flex gap-3">
            {property.hasVR && (
              <button
                onClick={() => window.open(property.vrUrl, '_blank')}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                查看VR
              </button>
            )}
            <button
              onClick={() => window.open(property.sourceUrl, '_blank')}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              查看原始房源
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="h-16"></div>
      </div>
    </div>
  );
}
