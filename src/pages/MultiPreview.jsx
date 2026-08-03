import { useState, useEffect, useCallback, useRef } from 'react'
import { Grid2x2, Grid3x3, LayoutGrid, RefreshCw, Smartphone, Wifi, AlertCircle, Home, ArrowLeft, Send, Move, CheckCircle2 } from 'lucide-react'
import { api } from '../api/backend'

const REFRESH_INTERVAL = 5000

/* ====== Single interactive device card ====== */
function DeviceCard({ device, screenshot, onScreenshotUpdate }) {
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [pointerPos, setPointerPos] = useState(null)
  const [inputText, setInputText] = useState('')
  const screenRef = useRef(null)
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 })

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
      renderWidth = rect.width; renderHeight = rect.width / imgRatio; offsetX = 0; offsetY = (rect.height - renderHeight) / 2
    } else {
      renderHeight = rect.height; renderWidth = rect.height * imgRatio; offsetX = (rect.width - renderWidth) / 2; offsetY = 0
    }
    const localX = clientX - rect.left - offsetX
    const localY = clientY - rect.top - offsetY
    if (localX < 0 || localX > renderWidth || localY < 0 || localY > renderHeight) return null
    return { x: Math.round((localX / renderWidth) * img.naturalWidth), y: Math.round((localY / renderHeight) * img.naturalHeight), relativeX: offsetX + localX, relativeY: offsetY + localY }
  }, [])

  const doSendAction = useCallback(async (action, params) => {
    setActionLoading(true)
    try {
      await api.sdkRpa(device.serverId, device.name, action, params, { host: device.ip })
      showToast('操作已发送')
      // 延迟刷新截图
      setTimeout(async () => {
        try {
          const result = await api.getSdkScreenshot(device.serverId, device.name)
          if (result?.data) {
            onScreenshotUpdate?.(`data:${result.contentType || 'image/jpeg'};base64,${result.data}`)
          }
        } catch { /* ignore */ }
      }, 800)
    } catch (e) {
      showToast(e.message || '操作失败', 'error')
    } finally {
      setActionLoading(false)
    }
  }, [device, showToast, onScreenshotUpdate])

  const handlePointerDown = (e) => {
    e.preventDefault(); e.stopPropagation()
    const point = getScreenCoords(e.clientX, e.clientY)
    if (!point) return
    dragRef.current = { dragging: false, startX: e.clientX, startY: e.clientY, startScreenX: point.x, startScreenY: point.y }
    try { screenRef.current.setPointerCapture(e.pointerId) } catch {}
    setPointerPos(point)
  }
  const handlePointerMove = (e) => {
    e.preventDefault(); e.stopPropagation()
    const point = getScreenCoords(e.clientX, e.clientY)
    if (point) setPointerPos(point)
    const drag = dragRef.current
    if (!drag.startX && drag.startX !== 0) return
    if (Math.sqrt((e.clientX - drag.startX) ** 2 + (e.clientY - drag.startY) ** 2) > 10) drag.dragging = true
  }
  const handlePointerUp = (e) => {
    e.preventDefault(); e.stopPropagation()
    try { screenRef.current?.releasePointerCapture(e.pointerId) } catch {}
    const drag = dragRef.current; const point = getScreenCoords(e.clientX, e.clientY)
    if (!point) { dragRef.current = { dragging: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 }; return }
    if (drag.dragging) doSendAction('swipe', { x1: drag.startScreenX, y1: drag.startScreenY, x2: point.x, y2: point.y, duration: 300 })
    dragRef.current = { dragging: false, startX: 0, startY: 0, startScreenX: 0, startScreenY: 0 }
  }
  const handleClick = (e) => {
    e.stopPropagation()
    const point = getScreenCoords(e.clientX, e.clientY)
    if (!point) return
    setPointerPos(point)
    doSendAction('click', { x: point.x, y: point.y })
  }
  const handleRefresh = async () => {
    setActionLoading(true)
    try {
      const result = await api.getSdkScreenshot(device.serverId, device.name)
      if (result?.data) onScreenshotUpdate?.(`data:${result.contentType || 'image/jpeg'};base64,${result.data}`)
      showToast('截图已刷新')
    } catch (e) { showToast(e.message || '刷新失败', 'error') }
    setActionLoading(false)
  }
  const handleSendText = async () => {
    if (!inputText.trim()) return
    await doSendAction('text', { text: inputText })
    setInputText('')
  }

  const keyButtons = [
    { label: 'Home', icon: Home, keycode: 3 },
    { label: 'Back', icon: ArrowLeft, keycode: 4 },
    { label: 'Recent', icon: LayoutGrid, keycode: 187 },
  ]

  const model = device.name || `设备 ${device.instanceNum || '?'}`
  const shotKey = `${device.serverId}_${device.name}`

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Interactive phone screen */}
      <div className="aspect-[9/16] bg-gray-900 relative select-none">
        {screenshot && screenshot !== 'error' ? (
          <img ref={screenRef} src={screenshot} alt={model}
            className="absolute inset-0 w-full h-full object-contain touch-none cursor-crosshair"
            onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp} onClick={handleClick} draggable={false} />
        ) : screenshot === 'error' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center"><AlertCircle size={20} className="mx-auto mb-1 text-red-400" /><div className="text-red-400 text-xs">截图失败</div></div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center"><RefreshCw size={24} className="mx-auto mb-2 text-gray-500 animate-pulse" /><div className="text-gray-500 text-xs">加载中...</div></div>
          </div>
        )}
        {/* Top info bar */}
        <div className="absolute top-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Smartphone size={12} className="text-white" />
              <span className="text-white text-xs font-medium truncate max-w-[120px]">{model}</span>
            </div>
            <div className="flex items-center gap-1"><Wifi size={12} className="text-green-400" /><span className="text-green-400 text-xs">在线</span></div>
          </div>
        </div>
        {/* Pointer indicator */}
        {pointerPos && (
          <div className="absolute w-3 h-3 border-2 border-red-500 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 z-50"
            style={{ left: pointerPos.relativeX, top: pointerPos.relativeY }} />
        )}
        {/* Toast */}
        {toast && (
          <div className={`absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs flex items-center gap-1 z-50 ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`}>
            {toast.type === 'error' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
            {toast.message}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="p-2 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-1.5 mb-2">
          {keyButtons.map((btn) => (
            <button key={btn.keycode} onClick={() => doSendAction('keyevent', { keycode: btn.keycode })} disabled={actionLoading}
              className="flex-1 flex flex-col items-center py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-50 text-xs">
              <btn.icon size={14} /><span className="text-[10px] mt-0.5">{btn.label}</span>
            </button>
          ))}
          <button onClick={handleRefresh} disabled={actionLoading}
            className="px-2.5 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-50"
            title="刷新截图">
            <RefreshCw size={14} className={actionLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex gap-1.5">
          <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="输入文字..."
            className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-400" />
          <button onClick={handleSendText} disabled={!inputText.trim() || actionLoading}
            className="px-2.5 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
            <Send size={14} />
          </button>
        </div>
        <div className="mt-1 text-[10px] text-gray-400 flex items-center gap-1">
          <Move size={10} />
          {pointerPos ? `坐标: ${pointerPos.x}, ${pointerPos.y}` : '点击/滑动屏幕操作'}
        </div>
      </div>
    </div>
  )
}

/* ====== MultiPreview main ====== */
export default function MultiPreview() {
  const [containers, setContainers] = useState([])
  const [screenshots, setScreenshots] = useState({})
  const [gridLayout, setGridLayout] = useState('2x2')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const intervalRef = useRef(null)

  const gridConfigs = { '2x2': { cols: 'grid-cols-2' }, '3x3': { cols: 'grid-cols-3' }, '4x4': { cols: 'grid-cols-4' } }
  const layoutButtons = [{ name: '2x2', icon: Grid2x2 }, { name: '3x3', icon: Grid3x3 }, { name: '4x4', icon: LayoutGrid }]

  const discoverDevices = useCallback(async () => {
    try { setLoading(true); setError(null); const data = await api.listSdkDevices(); const online = data.filter(c => c.state === 'running'); setContainers(online); return online }
    catch (e) { setError(e.message || '发现设备失败'); return [] }
    finally { setLoading(false) }
  }, [])

  const fetchScreenshots = useCallback(async (targets) => {
    if (targets.length === 0) return
    try {
      setRefreshing(true)
      const grouped = {}
      for (const t of targets) { if (!grouped[t.serverId]) grouped[t.serverId] = []; grouped[t.serverId].push({ name: t.name, instanceNum: t.instanceNum }) }
      const shots = {}; for (const t of targets) shots[`${t.serverId}_${t.name}`] = null
      await Promise.all(Object.entries(grouped).map(async ([serverId, devices]) => {
        try {
          const result = await api.batchSdkScreenshots(serverId, devices)
          if (result) for (const [key, val] of Object.entries(result)) {
            if (val?.data) shots[`${serverId}_${key}`] = `data:${val.contentType || 'image/jpeg'};base64,${val.data}`
            else if (val?.error) shots[`${serverId}_${key}`] = 'error'
          }
        } catch { for (const d of devices) shots[`${serverId}_${d.name}`] = 'error' }
      }))
      setScreenshots({ ...shots })
    } catch { /* ignore */ } finally { setRefreshing(false) }
  }, [])

  const refresh = useCallback(async () => {
    if (containers.length === 0) { const online = await discoverDevices(); if (online.length > 0) await fetchScreenshots(online) }
    else await fetchScreenshots(containers)
  }, [containers, discoverDevices, fetchScreenshots])

  useEffect(() => { discoverDevices().then(online => { if (online.length > 0) fetchScreenshots(online) }) }, [discoverDevices, fetchScreenshots])
  useEffect(() => {
    if (!autoRefresh) { if (intervalRef.current) clearInterval(intervalRef.current); intervalRef.current = null; return }
    if (containers.length === 0) return
    intervalRef.current = setInterval(() => fetchScreenshots(containers), REFRESH_INTERVAL)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [autoRefresh, containers, fetchScreenshots])

  const handleScreenshotUpdate = useCallback((deviceKey, url) => {
    setScreenshots(prev => ({ ...prev, [deviceKey]: url }))
  }, [])

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">多画面预览</h2>
          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">{containers.length} 台在线</span>
          {refreshing && <RefreshCw size={14} className="text-blue-500 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {autoRefresh ? '自动刷新 5s' : '手动刷新'}
          </button>
          <button onClick={refresh} disabled={refreshing}
            className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center gap-1">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> 刷新
          </button>
          <span className="text-sm text-gray-500 ml-2">网格布局</span>
          {layoutButtons.map(({ name, icon: Icon }) => (
            <button key={name} onClick={() => setGridLayout(name)}
              className={`p-2 rounded-lg transition-all ${gridLayout === name ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Icon size={20} />
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={18} className="text-red-500" /><span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      <div className="flex-1 p-4 overflow-auto">
        {loading && containers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <RefreshCw size={32} className="animate-spin mb-3" /><p className="text-sm">正在发现设备...</p>
          </div>
        ) : containers.length > 0 ? (
          <div className={`grid ${gridConfigs[gridLayout].cols} gap-4`}>
            {containers.map((device) => {
              const shotKey = `${device.serverId}_${device.name}`
              return (
                <DeviceCard key={device.id || device.name} device={device} screenshot={screenshots[shotKey]}
                  onScreenshotUpdate={(url) => handleScreenshotUpdate(shotKey, url)} />
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-20 h-20 mb-4 bg-gray-200 rounded-2xl flex items-center justify-center"><Grid3x3 size={32} className="text-gray-400" /></div>
            <p className="text-sm">暂无在线设备</p>
            <button onClick={discoverDevices} className="mt-3 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600">重新扫描</button>
          </div>
        )}
      </div>
    </div>
  )
}
