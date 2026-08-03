import { useApp } from '../context/AppContext'
import {
  Smartphone,
  Wifi,
  WifiOff,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp
} from 'lucide-react'

export default function Dashboard() {
  const { devices, tasks, alerts, statistics } = useApp()

  // 计算统计数据
  const totalDevices = devices.length
  const onlineDevices = devices.filter(d => d.status === '运行中').length
  const offlineDevices = devices.filter(d => d.status === '离线' || d.status === '已停止').length
  const todayTasks = tasks.filter(t => t.status === '启用').length

  // 统计卡片数据
  const stats = [
    {
      title: '设备总数',
      value: totalDevices,
      icon: Smartphone,
      color: 'bg-blue-500',
      textColor: 'text-blue-500'
    },
    {
      title: '在线设备',
      value: onlineDevices,
      icon: Wifi,
      color: 'bg-green-500',
      textColor: 'text-green-500'
    },
    {
      title: '离线设备',
      value: offlineDevices,
      icon: WifiOff,
      color: 'bg-red-500',
      textColor: 'text-red-500'
    },
    {
      title: '今日任务',
      value: todayTasks,
      icon: ClipboardList,
      color: 'bg-purple-500',
      textColor: 'text-purple-500'
    }
  ]

  // 设备状态分布数据
  const deviceStatusData = [
    { label: '运行中', count: onlineDevices, color: 'bg-green-500' },
    { label: '离线/停止', count: offlineDevices, color: 'bg-red-500' }
  ]

  // 近7天任务执行趋势数据
  const taskTrendData = statistics.taskExecution

  // 获取告警级别样式
  const getAlertStyle = (level) => {
    switch (level) {
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          text: 'text-red-700'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
          text: 'text-yellow-700'
        }
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: <CheckCircle className="w-5 h-5 text-blue-500" />,
          text: 'text-blue-700'
        }
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 设备状态分布和任务趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 设备状态分布 */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">设备状态分布</h3>
          <div className="space-y-4">
            {deviceStatusData.map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-sm font-medium text-gray-700">{item.count} 台</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`${item.color} h-3 rounded-full transition-all duration-300`}
                    style={{ width: `${(item.count / totalDevices) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 近7天任务执行趋势 */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">近7天任务执行趋势</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-end justify-between space-x-2 h-48">
            {taskTrendData.map((item, index) => {
              const maxValue = Math.max(...taskTrendData.map(d => d.success + d.failed))
              const successHeight = (item.success / maxValue) * 100
              const failedHeight = (item.failed / maxValue) * 100

              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="flex flex-col-reverse w-full items-center">
                    {/* 成功柱 */}
                    <div
                      className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                      style={{ height: `${successHeight * 1.2}px` }}
                      title={`成功: ${item.success}`}
                    ></div>
                    {/* 失败柱 */}
                    <div
                      className="w-full bg-red-400 rounded-t transition-all duration-300 hover:bg-red-500"
                      style={{ height: `${failedHeight * 1.2}px` }}
                      title={`失败: ${item.failed}`}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">{item.date}</p>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-600">成功</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-400 rounded mr-2"></div>
              <span className="text-gray-600">失败</span>
            </div>
          </div>
        </div>
      </div>

      {/* 实时告警列表 */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">实时告警</h3>
          <span className="text-sm text-gray-500">{alerts.filter(a => !a.handled).length} 条未处理</span>
        </div>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
              <p>暂无告警</p>
            </div>
          ) : (
            alerts.map(alert => {
              const style = getAlertStyle(alert.level)
              return (
                <div
                  key={alert.id}
                  className={`flex items-start p-4 rounded-lg border ${style.bg} ${
                    alert.handled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mr-3">{style.icon}</div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-medium ${style.text}`}>{alert.type}</h4>
                      <span className="text-xs text-gray-500">{alert.time}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{alert.message}</p>
                  </div>
                  {alert.handled && (
                    <div className="flex-shrink-0 ml-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}