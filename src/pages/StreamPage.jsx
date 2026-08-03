// src/pages/StreamPage.jsx
// 手机扫码后的推流页面
// 方案：Canvas 逐帧捕获 → JPEG → WebSocket → 后端 ffmpeg → RTMP
// 避免使用 MediaRecorder（手机浏览器兼容性差）
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Camera, CameraOff, AlertCircle, ArrowLeft, Video, Radio, RefreshCw, Play } from 'lucide-react'

export default function StreamPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [pageReady, setPageReady] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [frameCount, setFrameCount] = useState(0)
  const [wsConnected, setWsConnected] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [rtmpUrl, setRtmpUrl] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const wsRef = useRef(null)
  const frameCountRef = useRef(0)
  const intervalRef = useRef(null)
  const streamStartedRef = useRef(false)

  // 仅建立 WebSocket 连接
  const connectWebSocket = useCallback(() => {
    if (!token) {
      setError('缺少 token 参数')
      setStatus('error')
      return
    }

    if (wsRef.current) {
      try { wsRef.current.close() } catch { /* ignore */ }
      wsRef.current = null
    }

    const { protocol, hostname, port } = window.location
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${hostname}:${port}/api/camera/ws?token=${encodeURIComponent(token)}`
    console.log('[WS] 连接到:', wsUrl)

    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      console.log('[WS] 连接已建立')
      setWsConnected(true)
      setPageReady(true)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'connected') {
          console.log('[WS] 服务器确认连接, RTMP:', msg.rtmpUrl)
          setRtmpUrl(msg.rtmpUrl)
        }
      } catch { /* ignore */ }
    }

    ws.onerror = () => {
      console.error('[WS] 错误')
      setError('WebSocket 连接失败，请检查网络')
      setStatus('error')
    }

    ws.onclose = (e) => {
      console.log('[WS] 连接关闭:', e.code, e.reason)
      setWsConnected(false)
      setPageReady(false)
      if (streamStartedRef.current) {
        streamStartedRef.current = false
        stopLocalStream()
      }
    }
  }, [token])

  // 停止本地视频流
  const stopLocalStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStreaming(false)
  }, [])

  // 完整停止
  const stopStream = useCallback(() => {
    streamStartedRef.current = false
    stopLocalStream()
    if (wsRef.current) {
      try { wsRef.current.close() } catch { /* ignore */ }
      wsRef.current = null
    }
    setWsConnected(false)
    setPageReady(false)
    setStatus('stopped')
  }, [stopLocalStream])

  // Canvas 逐帧捕获并发送
  const startFrameCapture = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const ws = wsRef.current

    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[Capture] 缺少 video/canvas/ws')
      return
    }

    const ctx = canvas.getContext('2d')
    canvas.width = 480
    canvas.height = 360

    // 每 200ms 捕获一帧
    intervalRef.current = setInterval(() => {
      if (video.readyState < 2) return // HAVE_CURRENT_DATA
      if (ws.readyState !== WebSocket.OPEN) return

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (!blob || ws.readyState !== WebSocket.OPEN) return
            blob.arrayBuffer().then((buffer) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(buffer)
                frameCountRef.current++
                setFrameCount(frameCountRef.current)
              }
            })
          },
          'image/jpeg',
          0.7 // 质量 70%
        )
      } catch (err) {
        console.error('[Capture] 帧捕获失败:', err)
      }
    }, 200)

    setStreaming(true)
    setStatus('active')
    console.log('[Capture] 开始逐帧捕获')
  }, [])

  // 用户点击"开始推流"
  const handleStart = useCallback(async () => {
    if (!wsConnected || !wsRef.current) {
      setError('请等待网络连接')
      return
    }

    streamStartedRef.current = true
    setStatus('connecting')
    setError(null)

    try {
      console.log('[Camera] 请求摄像头权限...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      console.log('[Camera] 摄像头已获取')

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // 等待视频就绪后开始捕获
      setTimeout(() => {
        startFrameCapture()
      }, 500)
    } catch (e) {
      console.error('[Camera] 摄像头访问失败:', e)
      streamStartedRef.current = false
      setError('无法访问摄像头: ' + e.message)
      setStatus('error')
    }
  }, [wsConnected, startFrameCapture])

  // 页面加载后只建立 WebSocket
  useEffect(() => {
    connectWebSocket()
    return () => { stopStream() }
  }, [connectWebSocket, stopStream])

  // 重新开始
  const handleRestart = useCallback(() => {
    stopStream()
    setTimeout(() => connectWebSocket(), 500)
  }, [connectWebSocket, stopStream])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* 顶部状态栏 */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Video size={20} />
          <span className="font-medium">云手机摄像头推流</span>
        </div>
        <div className="flex items-center gap-2">
          {streaming && (
            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
              <Radio size={12} className="animate-pulse" />
              推流中 · {frameCount}
            </span>
          )}
          {pageReady && !streamStartedRef.current && (
            <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full">已连接</span>
          )}
          {!pageReady && (
            <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full flex items-center gap-1">
              <RefreshCw size={12} className="animate-spin" /> 连接中
            </span>
          )}
          {status === 'error' && (
            <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full flex items-center gap-1">
              <AlertCircle size={12} /> 错误
            </span>
          )}
        </div>
      </div>

      {/* 视频预览区域 */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
        {/* 隐藏的 canvas 用于帧捕获 */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 等待开始 */}
        {pageReady && !streamStartedRef.current && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white px-6">
              <Camera size={48} className="mx-auto mb-4 text-blue-400" />
              <h3 className="text-lg font-medium mb-2">开始摄像头推流</h3>
              <p className="text-sm text-gray-400 mb-6">请点击下方按钮，允许浏览器访问您的摄像头</p>
              <button onClick={handleStart}
                className="px-8 py-4 bg-blue-500 text-white rounded-full font-medium text-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-3 mx-auto">
                <Play size={24} /> 开始推流
              </button>
              {rtmpUrl && <p className="text-xs text-blue-400 mt-4 break-all">{rtmpUrl}</p>}
            </div>
          </div>
        )}

        {/* 连接中 */}
        {!pageReady && status !== 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <RefreshCw size={32} className="animate-spin mx-auto mb-2" />
              <p className="text-sm">正在连接服务器...</p>
            </div>
          </div>
        )}

        {/* 访问摄像头中 */}
        {status === 'connecting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <RefreshCw size={32} className="animate-spin mx-auto mb-2" />
              <p className="text-sm">正在访问摄像头...</p>
              <p className="text-xs text-gray-400 mt-2">请允许浏览器使用摄像头</p>
            </div>
          </div>
        )}

        {/* 错误 */}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
            <div className="text-center text-white max-w-sm">
              <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
              <p className="text-sm mb-3">{error}</p>
              <button onClick={handleRestart}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">重试</button>
            </div>
          </div>
        )}
      </div>

      {/* 底部信息栏 */}
      <div className="bg-gray-800 px-4 py-3">
        {rtmpUrl && (
          <div className="text-xs text-blue-400 mb-2 break-all">RTMP: {rtmpUrl}</div>
        )}
        {error && (
          <div className="text-xs text-red-400 mb-2">错误: {error}</div>
        )}
        <div className="text-xs text-gray-400 mb-3">
          推流链路：手机摄像头 → Canvas 帧捕获 → WebSocket → ffmpeg → RTMP → 云手机虚拟摄像头
        </div>
        <div className="flex gap-2">
          {streaming && (
            <button onClick={stopStream}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
              <CameraOff size={16} /> 停止推流
            </button>
          )}
          {pageReady && !streamStartedRef.current && (
            <button onClick={handleStart}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
              <Camera size={16} /> 开始推流
            </button>
          )}
          <a href="/preview"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> 返回
          </a>
        </div>
      </div>
    </div>
  )
}
