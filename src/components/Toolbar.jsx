import { Plus, FolderPlus, Palette, Search, RefreshCw } from 'lucide-react'

export default function Toolbar({
  filters,
  setFilters,
  groups,
  onBatchCreate,
  onCreateGroup,
  onGlobalSkin,
  onRefresh,
  isRefreshing,
}) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBatchCreate}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            批量建机
          </button>
          <button
            onClick={onCreateGroup}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FolderPlus size={16} />
            新建分组
          </button>
          <button
            onClick={onGlobalSkin}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Palette size={16} />
            一键换肤
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索名称"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">状态</option>
            <option value="运行中">运行中</option>
            <option value="已停止">已停止</option>
            <option value="离线">离线</option>
          </select>
          <select
            value={filters.groupId}
            onChange={(e) => setFilters({ ...filters, groupId: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">分组</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isRefreshing ? 'opacity-70' : ''
            }`}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>
    </div>
  )
}
