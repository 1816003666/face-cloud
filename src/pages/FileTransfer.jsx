import { useState } from 'react'
import { Upload, File, Send, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function FileTransfer() {
  const { files, devices, setFiles } = useApp()
  const [selectedFiles, setSelectedFiles] = useState([])
  const [selectedDevices, setSelectedDevices] = useState([])
  const [isDragging, setIsDragging] = useState(false)

  // 切换文件选择
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  // 切换设备选择
  const toggleDeviceSelection = (deviceId) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    )
  }

  // 全选/取消全选设备
  const toggleAllDevices = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([])
    } else {
      setSelectedDevices(devices.map(d => d.id))
    }
  }

  // 模拟上传文件
  const handleUpload = () => {
    const newFile = {
      id: `file-${Date.now()}`,
      name: `新文件_${Math.floor(Math.random() * 100)}.zip`,
      size: `${(Math.random() * 10).toFixed(1)}MB`,
      uploadTime: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '-'),
      type: ['配置', '脚本', '素材'][Math.floor(Math.random() * 3)]
    }
    setFiles(prev => [...prev, newFile])
  }

  // 删除选中文件
  const handleDeleteFiles = () => {
    if (selectedFiles.length === 0) return
    setFiles(prev => prev.filter(f => !selectedFiles.includes(f.id)))
    setSelectedFiles([])
  }

  // 推送文件到设备
  const handlePushFiles = () => {
    if (selectedFiles.length === 0 || selectedDevices.length === 0) {
      alert('请选择文件和目标设备')
      return
    }
    alert(`已推送 ${selectedFiles.length} 个文件到 ${selectedDevices.length} 台设备`)
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">文件互传</h1>
      </div>

      {/* 上传区域 */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-white hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleUpload()
        }}
      >
        <Upload className={`mx-auto h-12 w-12 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="mt-4 text-sm text-gray-600">
          拖拽文件到此区域上传，或
          <button
            onClick={handleUpload}
            className="ml-1 text-blue-600 hover:text-blue-700 font-medium"
          >
            点击模拟上传
          </button>
        </p>
        <p className="mt-2 text-xs text-gray-400">支持 .zip, .apk, .png 等格式</p>
      </div>

      {/* 文件列表 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">已上传文件</h2>
            <button
              onClick={handleDeleteFiles}
              disabled={selectedFiles.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                selectedFiles.length > 0
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Trash2 size={16} />
              删除选中 ({selectedFiles.length})
            </button>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            暂无已上传的文件
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="w-12 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">
                    <input
                      type="checkbox"
                      checked={selectedFiles.length === files.length}
                      onChange={() => {
                        if (selectedFiles.length === files.length) {
                          setSelectedFiles([])
                        } else {
                          setSelectedFiles(files.map(f => f.id))
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">文件名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">大小</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase border-b">上传时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {files.map((file, index) => (
                  <tr
                    key={file.id}
                    className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${
                      selectedFiles.includes(file.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <File size={18} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{file.size}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        {file.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{file.uploadTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 目标设备选择 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">选择目标设备</h2>
            <button
              onClick={toggleAllDevices}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedDevices.length === devices.length ? '取消全选' : '全选'}
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {devices.map(device => (
              <button
                key={device.id}
                onClick={() => toggleDeviceSelection(device.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  selectedDevices.includes(device.id)
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    selectedDevices.includes(device.id) ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {device.name}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${
                    device.status === '运行中' ? 'bg-green-500' :
                    device.status === '已停止' ? 'bg-amber-500' : 'bg-gray-400'
                  }`}></span>
                </div>
                <div className={`text-xs ${
                  selectedDevices.includes(device.id) ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {device.model}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handlePushFiles}
          disabled={selectedFiles.length === 0 || selectedDevices.length === 0}
          className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
            selectedFiles.length > 0 && selectedDevices.length > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Send size={18} />
          推送文件到 {selectedDevices.length} 台设备
        </button>

        <span className="text-sm text-gray-500">
          已选择 {selectedFiles.length} 个文件
        </span>
      </div>
    </div>
  )
}