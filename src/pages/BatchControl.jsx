import { useState } from 'react'
import { RefreshCw, Power, Trash2, Download, CheckSquare, Square } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function BatchControl() {
  const { devices } = useApp()
  const [selectedDevices, setSelectedDevices] = useState([])
  const [executionResults, setExecutionResults] = useState([])
  const [isExecuting, setIsExecuting] = useState(false)
  const [currentAction, setCurrentAction] = useState('')

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([])
    } else {
      setSelectedDevices(devices.map(d => d.id))
    }
  }

  // 切换单个设备选择状态
  const handleToggleDevice = (deviceId) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId)
      } else {
        return [...prev, deviceId]
      }
    })
  }

  // 模拟执行操作的异步函数
  const simulateAction = async (device, action) => {
    // 模拟每个设备执行时间在 0.5-2 秒之间
    const delay = Math.random() * 1500 + 500
    await new Promise(resolve => setTimeout(resolve, delay))

    // 90% 成功率
    const success = Math.random() > 0.1
    return {
      deviceId: device.id,
      deviceName: device.name,
      action,
      success,
      message: success ? `${action}成功` : `${action}失败`,
      timestamp: new Date().toLocaleTimeString('zh-CN')
    }
  }

  // 批量执行操作
  const executeBatchAction = async (actionName) => {
    if (selectedDevices.length === 0) {
      alert('请先选择要操作的设备')
      return
    }

    setIsExecuting(true)
    setCurrentAction(actionName)
    setExecutionResults([])

    const selectedDeviceList = devices.filter(d => selectedDevices.includes(d.id))
    const results = []

    for (const device of selectedDeviceList) {
      const result = await simulateAction(device, actionName)
      results.push(result)
      setExecutionResults([...results])
    }

    setIsExecuting(false)
    setCurrentAction('')
  }

  // 批量操作按钮配置
  const batchActions = [
    { name: '批量重启', icon: RefreshCw, color: 'bg-blue-500 hover:bg-blue-600', action: '重启' },
    { name: '批量关机', icon: Power, color: 'bg-orange-500 hover:bg-orange-600', action: '关机' },
    { name: '清理后台', icon: Trash2, color: 'bg-purple-500 hover:bg-purple-600', action: '清理后台' },
    { name: '同步时间', icon: Download, color: 'bg-green-500 hover:bg-green-600', action: '同步时间' },
  ]

  // 获取状态徽章样式
  const getStatusBadge = (status) => {
    const styles = {
      '运行中': 'bg-green-100 text-green-800',
      '已停止': 'bg-gray-100 text-gray-800',
      '离线': 'bg-red-100 text-red-800',
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-6">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">批量操控</h1>
        <p className="text-sm text-gray-500 mt-1">选择多个设备进行批量操作管理</p>
      </div>

      {/* 批量操作按钮组 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">批量操作</h2>
          <div className="text-sm text-gray-500">
            已选择 <span className="font-semibold text-blue-600">{selectedDevices.length}</span> 台设备
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {batchActions.map(({ name, icon: Icon, color, action }) => (
            <button
              key={name}
              onClick={() => executeBatchAction(action)}
              disabled={isExecuting || selectedDevices.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
            >
              <Icon size={18} />
              <span>{name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 执行进度和结果 */}
      {isExecuting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <RefreshCw className="animate-spin text-blue-500" size={20} />
            <div>
              <p className="font-medium text-blue-900">正在执行{currentAction}操作...</p>
              <p className="text-sm text-blue-700">
                已完成 {executionResults.length} / {selectedDevices.length} 台设备
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 执行结果展示 */}
      {executionResults.length > 0 && !isExecuting && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">执行结果</h2>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    设备名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    结果
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    时间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {executionResults.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.deviceName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {result.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.success
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.message}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.timestamp}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-4 text-sm">
              <span className="text-green-700">
                成功: {executionResults.filter(r => r.success).length} 台
              </span>
              <span className="text-red-700">
                失败: {executionResults.filter(r => !r.success).length} 台
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 设备列表 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {selectedDevices.length === devices.length ? (
                <>
                  <CheckSquare size={16} className="text-blue-500" />
                  <span>取消全选</span>
                </>
              ) : (
                <>
                  <Square size={16} />
                  <span>全选</span>
                </>
              )}
            </button>
            <span className="text-sm text-gray-500">
              共 {devices.length} 台设备
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  <span className="sr-only">选择</span>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  设备名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  机型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  IP地址
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  最后活跃
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {devices.map((device, index) => (
                <tr
                  key={device.id}
                  className={`hover:bg-blue-50 transition-colors cursor-pointer ${
                    selectedDevices.includes(device.id) ? 'bg-blue-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                  onClick={() => handleToggleDevice(device.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="flex items-center justify-center w-5 h-5">
                      {selectedDevices.includes(device.id) ? (
                        <CheckSquare size={20} className="text-blue-500" />
                      ) : (
                        <Square size={20} className="text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <RefreshCw size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{device.name}</div>
                        <div className="text-xs text-gray-500">ID: {device.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(device.status)}`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {device.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {device.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {device.lastActive}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}