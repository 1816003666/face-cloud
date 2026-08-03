import { useState } from 'react'
import { AlertTriangle, CheckCircle, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

function LevelBadge({ level }) {
  const levelStyles = {
    error: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
  }

  const levelLabels = {
    error: '错误',
    warning: '警告',
  }

  const iconColors = {
    error: 'text-red-500',
    warning: 'text-amber-500',
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border ${levelStyles[level]}`}>
      <AlertTriangle size={12} className={iconColors[level]} />
      {levelLabels[level]}
    </span>
  )
}

function StatusBadge({ handled }) {
  return handled ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
      <CheckCircle size={12} />
      已处理
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
      未处理
    </span>
  )
}

function ActionButton({ children, variant = 'default', onClick, disabled }) {
  const variants = {
    default: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
    primary: 'bg-blue-500 hover:bg-blue-600 text-white border border-blue-500',
    secondary: 'bg-gray-500 hover:bg-gray-600 text-white border border-gray-500',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

function FilterButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-blue-500 text-white shadow-sm'
          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

export default function AlertMonitor() {
  const { alerts, setAlerts } = useApp()
  const [filter, setFilter] = useState('all')

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true
    return alert.level === filter
  })

  const handleAlert = (alertId) => {
    setAlerts(alerts.map(alert =>
      alert.id === alertId ? { ...alert, handled: true } : alert
    ))
  }

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId))
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">告警监控</h1>
        <p className="mt-1 text-sm text-gray-500">实时监控云手机运行状态和系统异常</p>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">告警级别：</span>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          全部
        </FilterButton>
        <FilterButton active={filter === 'error'} onClick={() => setFilter('error')}>
          错误
        </FilterButton>
        <FilterButton active={filter === 'warning'} onClick={() => setFilter('warning')}>
          警告
        </FilterButton>

        <div className="ml-auto flex items-center gap-2 text-sm text-gray-600">
          <span>共 {filteredAlerts.length} 条告警</span>
          <span className="text-gray-300">|</span>
          <span className="text-red-600">
            {filteredAlerts.filter(a => a.level === 'error' && !a.handled).length} 条未处理错误
          </span>
        </div>
      </div>

      {/* 告警列表 */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
          <p className="text-gray-500 text-lg">暂无告警信息</p>
          <p className="text-gray-400 text-sm mt-1">所有云手机运行正常</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    告警消息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    级别
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAlerts.map((alert, index) => (
                  <tr
                    key={alert.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } ${!alert.handled ? 'border-l-4 border-l-blue-500' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <AlertTriangle
                          size={16}
                          className={alert.level === 'error' ? 'text-red-500' : 'text-amber-500'}
                        />
                        <span className="text-sm font-medium text-gray-900">{alert.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-md">{alert.message}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <LevelBadge level={alert.level} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{alert.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge handled={alert.handled} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <ActionButton
                          variant="primary"
                          onClick={() => handleAlert(alert.id)}
                          disabled={alert.handled}
                        >
                          <CheckCircle size={12} className="inline mr-1" />
                          处理
                        </ActionButton>
                        <ActionButton
                          variant="secondary"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          <X size={12} className="inline mr-1" />
                          忽略
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 底部提示 */}
      <div className="mt-4 text-xs text-gray-400">
        提示：点击"处理"按钮将告警标记为已处理状态，点击"忽略"按钮将删除该告警记录
      </div>
    </div>
  )
}