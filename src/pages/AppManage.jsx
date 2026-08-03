import { useState } from 'react'
import { Download, Trash2, Search } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function AppManage() {
  const { apps, devices } = useApp()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApps, setSelectedApps] = useState([])

  // 搜索过滤
  const filteredApps = apps.filter(app =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.packageName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 全选/取消全选
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedApps(filteredApps.map(app => app.id))
    } else {
      setSelectedApps([])
    }
  }

  // 单选
  const handleSelectApp = (appId) => {
    setSelectedApps(prev =>
      prev.includes(appId)
        ? prev.filter(id => id !== appId)
        : [...prev, appId]
    )
  }

  // 批量安装
  const handleBatchInstall = () => {
    if (selectedApps.length === 0) {
      alert('请先选择要安装的应用')
      return
    }
    const selectedAppNames = apps
      .filter(app => selectedApps.includes(app.id))
      .map(app => app.name)
      .join('、')
    alert(`将安装以下应用到 ${devices.length} 台设备：\n${selectedAppNames}`)
  }

  // 批量卸载
  const handleBatchUninstall = () => {
    if (selectedApps.length === 0) {
      alert('请先选择要卸载的应用')
      return
    }
    const selectedAppNames = apps
      .filter(app => selectedApps.includes(app.id))
      .map(app => app.name)
      .join('、')
    if (confirm(`确定要卸载以下应用吗？\n${selectedAppNames}`)) {
      alert('卸载操作已提交')
      setSelectedApps([])
    }
  }

  return (
    <div className="p-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900">应用管理</h1>
          <span className="text-sm text-gray-500">共 {apps.length} 个应用</span>
        </div>

        <div className="flex items-center gap-3">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="搜索应用名称或包名"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 批量操作按钮 */}
          <button
            onClick={handleBatchInstall}
            disabled={selectedApps.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedApps.length > 0
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Download size={16} />
            批量安装
          </button>

          <button
            onClick={handleBatchUninstall}
            disabled={selectedApps.length === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedApps.length > 0
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Trash2 size={16} />
            批量卸载
          </button>
        </div>
      </div>

      {/* 应用列表表格 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left border-b">
                  <input
                    type="checkbox"
                    checked={selectedApps.length === filteredApps.length && filteredApps.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  应用名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  包名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  版本
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  安装数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  大小
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredApps.map((app, index) => (
                <tr
                  key={app.id}
                  className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedApps.includes(app.id)}
                      onChange={() => handleSelectApp(app.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{app.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600 font-mono">{app.packageName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{app.version}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{app.installed}</span>
                      <span className="text-xs text-gray-500">/ {devices.length}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{app.size}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredApps.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              {searchTerm ? '未找到匹配的应用' : '暂无应用数据'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}