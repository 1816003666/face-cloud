import { useState } from 'react'
import { FileText, Filter, Download } from 'lucide-react'
import { useApp } from '../context/AppContext'

function ActionBadge({ action }) {
  const actionStyles = {
    '创建设备': 'bg-green-100 text-green-800',
    '删除设备': 'bg-red-100 text-red-800',
    '启动脚本': 'bg-blue-100 text-blue-800',
    '停止脚本': 'bg-gray-100 text-gray-800',
    '修改分组': 'bg-amber-100 text-amber-800',
    '批量重启': 'bg-purple-100 text-purple-800',
    '批量启动': 'bg-indigo-100 text-indigo-800',
    '批量停止': 'bg-gray-100 text-gray-800',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionStyles[action] || 'bg-gray-100 text-gray-800'}`}>
      {action}
    </span>
  )
}

export default function AuditLog() {
  const { auditLogs, users } = useApp()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedAction, setSelectedAction] = useState('')

  // 获取所有唯一的操作类型
  const actionTypes = [...new Set(auditLogs.map(log => log.action))]

  // 筛选日志
  const filteredLogs = auditLogs.filter(log => {
    const matchUser = !selectedUser || log.user === selectedUser
    const matchAction = !selectedAction || log.action === selectedAction

    let matchDateRange = true
    if (startDate) {
      const logTime = new Date(log.time)
      const start = new Date(startDate)
      matchDateRange = matchDateRange && logTime >= start
    }
    if (endDate) {
      const logTime = new Date(log.time)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      matchDateRange = matchDateRange && logTime <= end
    }

    return matchUser && matchAction && matchDateRange
  })

  // 导出日志
  const handleExport = () => {
    const headers = ['用户', '操作', '目标', '时间', 'IP', '详情']
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log =>
        [log.user, log.action, log.target, log.time, log.ip, log.detail].join(',')
      )
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `审计日志_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // 重置筛选
  const handleReset = () => {
    setStartDate('')
    setEndDate('')
    setSelectedUser('')
    setSelectedAction('')
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-gray-600" />
          <h1 className="text-xl font-semibold text-gray-900">操作审计</h1>
        </div>
      </div>

      {/* 筛选区域 */}
      <div className="bg-white mx-6 mt-6 rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">筛选条件</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 时间范围 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">开始时间</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">结束时间</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 用户筛选 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">用户</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部用户</option>
              {users.map(user => (
                <option key={user.id} value={user.username}>{user.username}</option>
              ))}
            </select>
          </div>

          {/* 操作类型筛选 */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">操作类型</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">全部操作</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500">
            共 {filteredLogs.length} 条记录
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between mx-6 mt-4">
        <div className="text-sm text-gray-600">
          审计日志列表
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Download size={16} />
          导出日志
        </button>
      </div>

      {/* 日志表格 */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white mx-6 mt-4 rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-500">暂无符合条件的审计日志</p>
        </div>
      ) : (
        <div className="bg-white mx-6 mt-4 rounded-lg border border-gray-200 shadow-sm flex-1">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">用户</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">操作</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">目标</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">IP</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log, index) => (
                  <tr key={log.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.user}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.target}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ip}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 底部留白 */}
      <div className="h-6"></div>
    </div>
  )
}