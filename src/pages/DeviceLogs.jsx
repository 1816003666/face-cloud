import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { FileText, Download, Filter } from 'lucide-react'

function LevelBadge({ level }) {
  const styles = {
    INFO: 'bg-blue-100 text-blue-800',
    WARNING: 'bg-amber-100 text-amber-800',
    ERROR: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[level] || styles['INFO']}`}>
      {level}
    </span>
  )
}

export default function DeviceLogs() {
  const { deviceLogs, devices } = useApp()
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [deviceFilter, setDeviceFilter] = useState('ALL')
  const [timeFilter, setTimeFilter] = useState('ALL')

  const filteredLogs = deviceLogs.filter(log => {
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false
    if (deviceFilter !== 'ALL' && log.deviceId !== parseInt(deviceFilter)) return false

    if (timeFilter !== 'ALL') {
      const logDate = new Date(log.time)
      const now = new Date()
      const diffMs = now - logDate
      const diffHours = diffMs / (1000 * 60 * 60)

      if (timeFilter === '1H' && diffHours > 1) return false
      if (timeFilter === '24H' && diffHours > 24) return false
      if (timeFilter === '7D' && diffHours > 168) return false
    }

    return true
  })

  const handleExport = () => {
    const headers = ['设备名称', '日志级别', '消息', '时间']
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => [log.deviceName, log.level, `"${log.message}"`, log.time].join(','))
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `设备日志_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">设备日志</h1>
        <p className="mt-1 text-sm text-gray-600">查看和管理所有设备的运行日志</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Filter size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">筛选条件</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">日志级别</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">全部级别</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">设备</label>
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">全部设备</option>
                {devices.map(device => (
                  <option key={device.id} value={device.id}>{device.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">时间范围</label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">全部时间</option>
                <option value="1H">最近1小时</option>
                <option value="24H">最近24小时</option>
                <option value="7D">最近7天</option>
              </select>
            </div>

            <div className="ml-auto">
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Download size={16} />
                导出日志
              </button>
            </div>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">暂无符合条件的日志记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">设备名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">日志级别</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">消息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log, index) => (
                  <tr key={log.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{log.deviceName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <LevelBadge level={log.level} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.message}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            共 {filteredLogs.length} 条日志记录
          </p>
        </div>
      </div>
    </div>
  )
}