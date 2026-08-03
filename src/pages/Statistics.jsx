import { BarChart3, Download } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Statistics() {
  const { statistics } = useApp()
  const { deviceUsage, taskExecution, appUsage } = statistics

  // 找出最大值用于计算柱状图高度
  const maxDeviceValue = Math.max(...deviceUsage.map(d => d.online + d.offline))
  const maxTaskValue = Math.max(...taskExecution.map(d => d.success + d.failed))
  const maxAppValue = Math.max(...appUsage.map(d => d.sessions))

  // 导出报表功能
  const handleExport = () => {
    const report = {
      exportTime: new Date().toLocaleString('zh-CN'),
      deviceUsage,
      taskExecution,
      appUsage,
    }

    const dataStr = JSON.stringify(report, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `统计报表_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题和导出按钮 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">统计报表</h1>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>导出报表</span>
        </button>
      </div>

      {/* 设备使用趋势图 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">设备使用趋势（近7天）</h2>
        <div className="flex items-end justify-between gap-2 h-64">
          {deviceUsage.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="w-full flex flex-col-reverse gap-0.5">
                {/* 在线设备（绿色） */}
                <div
                  className="w-full bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                  style={{ height: `${(item.online / maxDeviceValue) * 200}px` }}
                  title={`在线：${item.online}`}
                />
                {/* 离线设备（红色） */}
                <div
                  className="w-full bg-red-400 rounded-t transition-all duration-300 hover:bg-red-500"
                  style={{ height: `${(item.offline / maxDeviceValue) * 200}px` }}
                  title={`离线：${item.offline}`}
                />
              </div>
              <span className="text-xs text-gray-500 mt-2">{item.date}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-gray-600">在线设备</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded" />
            <span className="text-gray-600">离线设备</span>
          </div>
        </div>
      </div>

      {/* 任务执行趋势图 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">任务执行趋势（近7天）</h2>
        <div className="flex items-end justify-between gap-2 h-64">
          {taskExecution.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div className="w-full flex flex-col-reverse gap-0.5">
                {/* 成功任务（蓝色） */}
                <div
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${(item.success / maxTaskValue) * 200}px` }}
                  title={`成功：${item.success}`}
                />
                {/* 失败任务（橙色） */}
                <div
                  className="w-full bg-orange-400 rounded-t transition-all duration-300 hover:bg-orange-500"
                  style={{ height: `${(item.failed / maxTaskValue) * 200}px` }}
                  title={`失败：${item.failed}`}
                />
              </div>
              <span className="text-xs text-gray-500 mt-2">{item.date}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className="text-gray-600">成功任务</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-400 rounded" />
            <span className="text-gray-600">失败任务</span>
          </div>
        </div>
      </div>

      {/* 应用使用排行 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">应用使用排行</h2>
        <div className="space-y-4">
          {appUsage.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-gray-700">{item.name}</div>
              <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg transition-all duration-300 hover:from-purple-600 hover:to-pink-600"
                  style={{ width: `${(item.sessions / maxAppValue) * 100}%` }}
                />
              </div>
              <div className="w-24 text-sm text-gray-600 text-right">{item.sessions} 次</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}