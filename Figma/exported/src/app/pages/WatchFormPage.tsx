import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ChevronLeft, ChevronDown } from 'lucide-react';

export function WatchFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    city: '深圳',
    district: '',
    community: '',
    rooms: '',
    bathrooms: '',
  });

  const districts = ['南山', '福田', '罗湖', '宝安', '龙岗', '龙华', '盐田', '坪山', '光明', '大鹏'];
  const roomOptions = ['1房', '2房', '3房', '4房', '5房+'];
  const bathroomOptions = ['1卫', '2卫', '3卫+'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 保存逻辑
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white min-h-screen">
        {/* 顶部导航 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
          <div className="px-4 py-3 flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="p-1 -ml-1 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>
            <span className="ml-2 font-medium text-gray-900">
              {isEdit ? '编辑关注' : '添加关注'}
            </span>
          </div>
        </div>

        {/* 表单区 */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="space-y-5">
            {/* 城市 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                城市
              </label>
              <div className="px-4 py-3 bg-gray-50 text-gray-500 rounded-lg text-sm">
                深圳
              </div>
            </div>

            {/* 地区 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                地区
              </label>
              <div className="relative">
                <select
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">请选择地区</option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 小区名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                小区名称
              </label>
              <input
                type="text"
                value={formData.community}
                onChange={(e) => setFormData({ ...formData, community: e.target.value })}
                placeholder="请输入小区名称"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            {/* 房型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                房型
              </label>
              <div className="grid grid-cols-5 gap-2">
                {roomOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData({ ...formData, rooms: option })}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.rooms === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* 卫生间数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                卫生间数量
              </label>
              <div className="grid grid-cols-3 gap-2">
                {bathroomOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData({ ...formData, bathrooms: option })}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.bathrooms === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* 说明区 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-xs text-blue-700 space-y-1">
                <p>• 保存后首页将展示该条件下的在售房源</p>
                <p>• 刷新时会重新抓取该条件下的最新数据</p>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 pb-safe">
            <div className="max-w-2xl mx-auto">
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!formData.district || !formData.community || !formData.rooms || !formData.bathrooms}
              >
                保存关注
              </button>
            </div>
          </div>

          <div className="h-16"></div>
        </form>
      </div>
    </div>
  );
}
