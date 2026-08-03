import { useState, useEffect, useCallback, useRef } from 'react'
import { Grid2x2, Grid3x3, LayoutGrid, Maximize2, X, RefreshCw, Camera, Smartphone, Wifi, AlertCircle, CheckCircle2, Home, ArrowLeft, Power, Volume2, VolumeX, Send, MousePointer2, Move } from 'lucide-react'
import { api } from '../api/backend'
import CameraControl from './CameraControl'

const SERVER_HOSTS = ['192.168.9.104', '192.168.9.106', '192.168.9.107']
const REFRESH_INTERVAL = 5000

function DeviceInteractionPanel({ device, screenshot, onScreenshotUpdate }) {
  const [actionLoading, setActionLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [toast, setToast] = useState(null)
  const [pointerPos, setPointerPos] = useState(null)
  const screenRef = useRef(null)
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    startScreenX: 0,
    startScreenY: 0,
  })

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2000)
  }, [])

  const getScreenCoords = useCallback((clientX, clientY) => {
    const img = screenRef.current
    if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return null
    const rect = img.getBoundingClientRect()
    const imgRatio = img.naturalWidth / img.naturalHeight
    const rectRatio = rect.width / rect.height

    let renderWidth, renderHeight, offsetX, offsetY
    if (imgRatio > rectRatio) {
      renderWidth = rect.width
      renderHeight = rect.width / imgRatio
      offsetX = 0
      offsetY = (rect.height - renderHeight) / 2
    } else {
      renderHeight = rect.height
      renderWidth = rect.height * imgRatio
      offsetX = (rect.width - renderWidth) / 2
      offsetY = 0
    }

    const localX = clientX - rect.left - offsetX
    const localY = clientY - rect.top - offsetY
    if (localX < 0 || localX > renderWidth || localY < 0 || localY > renderHeight) return null

    const x = Math.round((localX / renderWidth) * img.naturalWidth)
    const y = Math.round((localY / renderHeight) * img.naturalHeight)
    return {
      x,
      y,
      clientX,
      clientY,
      relativeX: offsetX + localX,
      relativeY: offsetY + localY,
    }
  }, [])

  const sendAction = useCallback(async (action, params = {}) => {
    console.log('[RPA] sendAction', action, params, 'device:', device.serverId, device.name)
    setActionLoading(true)
    try {
      await api.sdkRpa(device.serverId, device.name, action, params, { host: device.ip })
      showToast('操作已发送')
    } catch (e) {
      console.error('[RPA] error', e)
      showToast(e.message || '操作失败', 'error')
    } finally {
      setActionLoading(false)
    }
  }, [device, showToast])

  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    console.log('[RPA] pointer down', e.clientX, e.clientY)
    const img = screenRef.current
    if (!img) return
    const point = getScreenCoords(e.clientX, e.clientY)
    if (!point) return
    dragRef.current = {
      dragging: false,
      startX: e.clientX,
      startY: e.clientY,
      startScreenX: point.x,
      startScreenY: point.y,
    }
    try { img.setPointerCapture(e.pointerId) } catch {}
    setPointerPos(point)
  }, [getScreenCoords])

  const handlePointerMove = useCallback((e) => {
    e.preventDefault()
    const point = getScreenCoords(e.clientX, e.clientY)
    if (point) setPointerPos(point)
    const drag = dragRef.current
    if (!drag.startX && drag.startX !== 0) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      drag.dragging = true
    }
  }, [getScreenCoords])

  const handlePointerUp = useCallback((e) => {
    e.preventDefault()
    console.log('[RPA] pointer up')
    const img = screenRef.current
    if (img) {
      try { img.releasePointerCapture(e.pointerId) } catch {}
    }
    const drag = dragRef.current
    const point = getScreenCoords(e.clientX, e.clientY)
    console.log('[RPA] point', point, 'dragging', drag.dragging)
    if (!point) {
      dragRef.current = { dragging: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 }
      return
    }

    if (drag.dragging) {
      sendAction('swipe', {
        x1: drag.startScreenX,
        y1: drag.startScreenY,
        x2: point.x,
        y2: point.y,
        duration: 300,
      })
    }
    dragRef.current = { dragging: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 }
  }, [getScreenCoords, sendAction])

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    console.log('[RPA] click', e.clientX, e.clientY)
    const point = getScreenCoords(e.clientX, e.clientY)
    console.log('[RPA] click point', point)
    if (!point) return
    setPointerPos(point)
    sendAction('click', { x: point.x, y: point.y })
  }, [getScreenCoords, sendAction])

  const handleMouseDown = useCallback((e) => {
    const point = getScreenCoords(e.clientX, e.clientY)
    if (!point) return
    dragRef.current = {
      dragging: false,
      startX: e.clientX,
      startY: e.clientY,
      startScreenX: point.x,
      startScreenY: point.y,
    }
    setPointerPos(point)
  }, [getScreenCoords])

  const handleMouseMove = useCallback((e) => {
    const point = getScreenCoords(e.clientX, e.clientY)
    if (point) setPointerPos(point)
    const drag = dragRef.current
    if (!drag.startX && drag.startX !== 0) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      drag.dragging = true
    }
  }, [getScreenCoords])

  const handleMouseUp = useCallback((e) => {
    const drag = dragRef.current
    const point = getScreenCoords(e.clientX, e.clientY)
    if (point && drag.dragging) {
      sendAction('swipe', {
        x1: drag.startScreenX,
        y1: drag.startScreenY,
        x2: point.x,
        y2: point.y,
        duration: 300,
      })
    }
    dragRef.current = { dragging: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 }
  }, [getScreenCoords, sendAction])

  const handleRefreshScreenshot = useCallback(async () => {
    try {
      const result = await api.getSdkScreenshot(device.serverId, device.name)
      if (result?.data && onScreenshotUpdate) {
        onScreenshotUpdate(`data:${result.contentType || 'image/jpeg'};base64,${result.data}`)
      }
      showToast('截图已刷新')
    } catch (e) {
      showToast(e.message || '刷新截图失败', 'error')
    }
  }, [device, onScreenshotUpdate, showToast])

  const handleSendText = useCallback(async () => {
    if (!inputText.trim()) return
    await sendAction('text', { text: inputText })
    setInputText('')
  }, [inputText, sendAction])

  const keyButtons = [
    { label: 'Home', icon: Home, keycode: 3 },
    { label: 'Back', icon: ArrowLeft, keycode: 4 },
    { label: 'Recent', icon: LayoutGrid, keycode: 187 },
    { label: 'Power', icon: Power, keycode: 26 },
    { label: 'Vol+', icon: Volume2, keycode: 24 },
    { label: 'Vol-', icon: VolumeX, keycode: 25 },
  ]

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white text-sm font-medium">
          <MousePointer2 size={16} />
          <span>实时交互</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshScreenshot}
            disabled={actionLoading}
            className="p-1.5 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
            title="刷新截图"
          >
            <RefreshCw size={16} className={actionLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
        <Move size={12} />
        {pointerPos ? `坐标: ${pointerPos.x}, ${pointerPos.y}` : '在屏幕区域点击或滑动'}
      </div>

      <div className="relative rounded-lg overflow-hidden bg-black mb-3 select-none">
        {screenshot ? (
          <>
            <img
              ref={screenRef}
              src={screenshot}
              alt="device screen"
              className="w-full h-auto object-contain touch-none cursor-crosshair"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={handleClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              draggable={false}
            />
            {pointerPos && (
              <div
                className="absolute w-3 h-3 border-2 border-red-500 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 z-50"
                style={{ left: pointerPos.relativeX, top: pointerPos.relativeY }}
              />
            )}
          </>
        ) : (
          <div className="aspect-[9/16] flex items-center justify-center text-gray-500">
            <RefreshCw size={24} className="animate-spin mr-2" />
            加载中...
          </div>
        )}

        {toast && (
          <div className={`absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs flex items-center gap-1 ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`}>
            {toast.type === 'error' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
            {toast.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-6 gap-2 mb-3">
        {keyButtons.map((btn) => (
          <button
            key={btn.keycode}
            onClick={() => sendAction('keyevent', { keycode: btn.keycode })}
            disabled={actionLoading}
            className="flex flex-col items-center justify-center p-2 rounded-lg bg-gray-700 text-gray-200 hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <btn.icon size={16} />
            <span className="text-[10px] mt-1">{btn.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          placeholder="输入文字后发送..."
          className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg text-sm placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSendText}
          disabled={!inputText.trim() || actionLoading}
          className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}

export default function MultiPreview() {
  const [containers, setContainers] = useState([])
  const [screenshots, setScreenshots] = useState({})
  const [gridLayout, setGridLayout] = useState('2x2')
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef(null)

  const gridConfigs = {
    '2x2': { cols: 'grid-cols-2', icon: Grid2x2 },
    '3x3': { cols: 'grid-cols-3', icon: Grid3x3 },
    '4x4': { cols: 'grid-cols-4', icon: LayoutGrid },
  }

  const layoutButtons = [
    { name: '2x2', icon: Grid2x2 },
    { name: '3x3', icon: Grid3x3 },
    { name: '4x4', icon: LayoutGrid },
  ]

  const discoverDevices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.listSdkDevices()
      const online = data.filter(c => c.state === 'running')
      setContainers(online)
      return online
    } catch (e) {
      setError(e.message || '发现设备失败')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchScreenshots = useCallback(async (targets) => {
    if (targets.length === 0) return
    try {
      setRefreshing(true)
      // 按 serverId 分组批量截图
      const grouped = {}
      for (const t of targets) {
        if (!grouped[t.serverId]) grouped[t.serverId] = []
        grouped[t.serverId].push({ name: t.name, instanceNum: t.instanceNum })
      }
      const shots = {}
      // 先标记所有目标为加载中
      for (const t of targets) {
        shots[`${t.serverId}_${t.name}`] = null
      }
      const promises = Object.entries(grouped).map(async ([serverId, devices]) => {
        try {
          const result = await api.batchSdkScreenshots(serverId, devices)
          if (result) {
            for (const [key, val] of Object.entries(result)) {
              if (val?.data) {
                shots[`${serverId}_${key}`] = `data:${val.contentType || 'image/jpeg'};base64,${val.data}`
              } else if (val?.error) {
                shots[`${serverId}_${key}`] = 'error'
              }
            }
          }
        } catch (e) {
          console.error(`截图失败 [${serverId}]:`, e)
          // 整组失败，标记该服务器所有设备为 error
          for (const d of devices) {
            shots[`${serverId}_${d.name}`] = 'error'
          }
        }
      })
      await Promise.all(promises)
      setScreenshots({ ...shots })
    } catch (e) {
      console.error('截图失败:', e)
    } finally {
      setRefreshing(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (containers.length === 0) {
      const online = await discoverDevices()
      if (online.length > 0) {
        await fetchScreenshots(online)
      }
    } else {
      await fetchScreenshots(containers)
    }
  }, [containers, discoverDevices, fetchScreenshots])

  useEffect(() => {
    discoverDevices().then(online => {
      if (online.length > 0) fetchScreenshots(online)
    })
  }, [discoverDevices, fetchScreenshots])

  useEffect(() => {
    if (!autoRefresh) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    if (containers.length === 0 || selectedDevice) return
    intervalRef.current = setInterval(() => {
      fetchScreenshots(containers)
    }, REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh, containers, selectedDevice, fetchScreenshots])

  const handleDeviceClick = (container) => {
    setSelectedDevice(container)
  }

  const closeFullscreen = () => {
    setSelectedDevice(null)
  }

  const getShotKey = (device) => `${device.serverId}_${device.name}`

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">多画面预览</h2>
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
            {containers.length} 台在线
          </span>
          {refreshing && (
            <RefreshCw size={14} className="text-blue-500 animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
              autoRefresh
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
            title={autoRefresh ? '自动刷新已开启' : '自动刷新已关闭'}
          >
            {autoRefresh ? '自动刷新 5s' : '手动刷新'}
          </button>
          <button
            onClick={refresh}
            className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center gap-1"
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            刷新
          </button>
          <span className="text-sm text-gray-500 ml-2">网格布局</span>
          {layoutButtons.map(({ name, icon: Icon }) => (
            <button
              key={name}
              onClick={() => setGridLayout(name)}
              className={`p-2 rounded-lg transition-all ${
                gridLayout === name
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={`${name} 布局`}
            >
              <Icon size={20} />
            </button>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} className="text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* 设备网格 */}
      <div className="flex-1 p-4 overflow-auto">
        {loading && containers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <RefreshCw size={32} className="animate-spin mb-3" />
            <p className="text-sm">正在发现设备...</p>
          </div>
        ) : containers.length > 0 ? (
          <div className={`grid ${gridConfigs[gridLayout].cols} gap-4`}>
            {containers.map((container) => {
              const shotKey = getShotKey(container)
              const screenshot = screenshots[shotKey]
              const model = container.name || `设备 ${container.instanceNum || '?'}`

              return (
                <div
                  key={container.id || container.name}
                  onClick={() => handleDeviceClick(container)}
                  className="relative bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  {/* 手机屏幕区域 */}
                  <div className="aspect-[9/16] bg-gradient-to-br from-gray-900 to-gray-800 relative">
                    {screenshot && screenshot !== 'error' ? (
                      <img
                        src={screenshot}
                        alt={model}
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                    ) : screenshot === 'error' ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <AlertCircle size={20} className="mx-auto mb-1 text-red-400" />
                          <div className="text-red-400 text-xs">截图失败</div>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Camera size={24} className="mx-auto mb-2 text-gray-500 animate-pulse" />
                          <div className="text-gray-500 text-xs">加载中...</div>
                        </div>
                      </div>
                    )}

                    {/* 顶部信息栏 */}
                    <div className="absolute top-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-b from-black/60 to-transparent">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Smartphone size={12} className="text-white" />
                          <span className="text-white text-xs font-medium">
                            #{container.instanceNum || container.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Wifi size={12} className="text-green-400" />
                          <span className="text-green-400 text-xs">在线</span>
                        </div>
                      </div>
                    </div>

                    {/* 全屏按钮 */}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-black/50 backdrop-blur-sm rounded-lg p-1.5">
                        <Maximize2 size={14} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* 设备信息 */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {model}
                      </span>
                      <span className="text-xs text-gray-500">
                        Android {container.android_version || '-'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                        ADB {container.adbPort || '-'}
                      </span>
                      <span>{container.lastActive || ''}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-20 h-20 mb-4 bg-gray-200 rounded-2xl flex items-center justify-center">
              <Grid3x3 size={32} className="text-gray-400" />
            </div>
            <p className="text-sm">暂无在线设备</p>
            <button
              onClick={discoverDevices}
              className="mt-3 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              重新扫描
            </button>
          </div>
        )}
      </div>

      {/* 全屏预览模态框 */}
      {selectedDevice && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={closeFullscreen}
        >
          <div
            className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={closeFullscreen}
              className="absolute top-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-full p-2 hover:bg-black/70 transition-colors"
            >
              <X size={20} className="text-white" />
            </button>

            {/* 交互面板 */}
            <div className="p-4">
              <DeviceInteractionPanel
                device={selectedDevice}
                screenshot={screenshots[getShotKey(selectedDevice)]}
                onScreenshotUpdate={(url) =>
                  setScreenshots((prev) => ({ ...prev, [getShotKey(selectedDevice)]: url }))
                }
              />
            </div>

            {/* 摄像头控制 */}
            <div className="mt-4 px-4 pb-4">
              <CameraControl
                host={selectedDevice.serverHost || SERVER_HOSTS[0]}
                index={selectedDevice.instanceNum || 1}
                deviceName={selectedDevice.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
