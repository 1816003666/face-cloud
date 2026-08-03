// src/pages/CameraControl.jsx
// 摄像头控制组件 - 集成在多画面预览的全屏模态框中
// 有本地摄像头: 直接通过 WebSocket + Canvas 逐帧推流
// 无本地摄像头: 显示二维码，手机扫码后通过手机推流
//
// 推流链路：浏览器 → Canvas 帧捕获 → WebSocket → 后端 ffmpeg → RTMP → 云手机拉流
import { useState, useEffect, useCallback, useRef } from 'react'
import { Camera, CameraOff, RefreshCw, CheckCircle, XCircle, Video, Radio } from 'lucide-react'
import QRCode from 'qrcode'
import { api } from '../api/backend'

export default function CameraControl({ host, index, deviceName }) {
  const [hasCamera, setHasCamera] = useState(null) // null=检测中, true/false
  const [status, setStatus] = useState('idle') // idle | starting | active | error
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [qrcodeUrl, setQrcodeUrl] = useState(null)
  const [qrcodeDataUrl, setQrcodeDataUrl] = useState(null)
  const [frameCount, setFrameCount] = useState(0)
  const [wsConnected, setWsConnected] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const wsRef = useRef(null)
  const intervalRef = useRef(null)

  // 检测本地摄像头
  useEffect(() => {
    async function checkCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        stream.getTracks().forEach((t) => t.stop())
        setHasCamera(true)
      } catch {
        setHasCamera(false)
      }
    }
    checkCamera()
  }, [])

  // 开启摄像头
  const handleStart = useCallback(async () => {
    try {
      setStatus('starting')
      setError(null)

      // 调用后端启动虚拟摄像头（set_cam_stream + camera 热启动）
      const result = await api.startCamera(host, index)
      setSession(result.data)

      // 有本地摄像头：直接走 WebSocket 推流，不生成二维码
      if (hasCamera) {
        setStatus('active')
        return
      }

      // 无本地摄像头：生成二维码，手机扫码推流
      const qrResult = await api.getCameraQrcode(result.data.token)
      const { lanIp, lanPort } = result.data
      const streamHost = lanIp || window.location.hostname
      const streamPort = lanPort || window.location.port
      const streamProtocol = window.location.protocol
      const streamUrl = `${streamProtocol}//${streamHost}:${streamPort}/camera/stream?token=${encodeURIComponent(qrResult.data.token)}`
      setQrcodeUrl(streamUrl)
      QRCode.toDataURL(streamUrl, { width: 200, margin: 2 })
        .then((dataUrl) => setQrcodeDataUrl(dataUrl))
        .catch((err) => console.error('生成二维码失败:', err))

      setStatus('active')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }, [host, index, hasCamera])

  // 关闭摄像头
  const handleStop = useCallback(async () => {
    // 停止本地推流
    stopLocalStream()

    // 调用后端关闭（camera stop + 清理会话）
    try {
      await api.stopCamera(host, index)
    } catch (e) {
      console.error('关闭摄像头失败:', e)
    }

    setStatus('idle')
    setSession(null)
    setQrcodeUrl(null)
    setQrcodeDataUrl(null)
    setFrameCount(0)
    setWsConnected(false)
  }, [host, index])

  // 停止本地推流
  const stopLocalStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (wsRef.current) {
      try { wsRef.current.close() } catch { /* 忽略 */ }
      wsRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Canvas 逐帧捕获并发送
  const startFrameCapture = useCallback((ws, stream) => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext('2d')
    canvas.width = 480
    canvas.height = 360

    let chunkCount = 0
    intervalRef.current = setInterval(() => {
      if (video.readyState < 2) return
      if (ws.readyState !== WebSocket.OPEN) return

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (!blob || ws.readyState !== WebSocket.OPEN) return
            blob.arrayBuffer().then((buffer) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(buffer)
                chunkCount++
                setFrameCount(chunkCount)
              }
            })
          },
          'image/jpeg',
          0.7
        )
      } catch (err) {
        console.error('[Capture] 帧捕获失败:', err)
      }
    }, 200)
  }, [])

  // 开始本地推流（通过 WebSocket + Canvas 逐帧捕获）
  const startLocalStream = useCallback(async () => {
    if (!session) return

    try {
      // 获取摄像头
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // 建立 WebSocket 连接
      const { protocol, hostname, port } = window.location
      const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${wsProtocol}//${hostname}:${port}/api/camera/ws?token=${encodeURIComponent(session.token)}`

      const ws = new WebSocket(wsUrl)
      ws.binaryType = 'arraybuffer'
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] 本地推流连接已建立')
        setWsConnected(true)
        // 延迟后开始帧捕获，确保视频就绪
        setTimeout(() => startFrameCapture(ws, stream), 500)
      }

      ws.onerror = () => {
        setError('WebSocket 连接失败')
        setWsConnected(false)
      }

      ws.onclose = () => {
        console.log('[WS] 本地推流连接关闭')
        setWsConnected(false)
      }
    } catch (e) {
      setError('无法访问摄像头: ' + e.message)
    }
  }, [session, startFrameCapture])

  // 激活状态时自动开始推流（如果有本地摄像头）
  useEffect(() => {
    if (status === 'active' && hasCamera === true && session) {
      startLocalStream()
    }
    return () => {
      stopLocalStream()
    }
  }, [status, hasCamera, session, startLocalStream, stopLocalStream])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-gray-600" />
          <span className="font-medium text-gray-800">摄像头控制</span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'active' && (
            <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {wsConnected ? <CheckCircle size={12} /> : <RefreshCw size={12} className="animate-spin" />}
              {wsConnected ? `推流中 · ${frameCount} 块` : '等待推流'}
            </span>
          )}
          {status === 'error' && (
            <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full flex items-center gap-1">
              <XCircle size={12} />
              错误
            </span>
          )}
        </div>
      </div>

      {/* 设备信息 */}
      <div className="text-sm text-gray-500 mb-3">
        目标设备: {deviceName || `#${index}`} ({host})
        {session?.containerName && (
          <div className="text-xs text-gray-400 mt-1">容器: {session.containerName}</div>
        )}
        {session?.rtmpUrl && (
          <div className="text-xs text-blue-400 mt-1 break-all">RTMP: {session.rtmpUrl}</div>
        )}
      </div>

      {/* 摄像头检测状态 */}
      {hasCamera === null && (
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
          <RefreshCw size={14} className="animate-spin" />
          检测摄像头中...
        </div>
      )}

      {/* 视频预览区域 */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3">
        {status === 'active' && hasCamera === true && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
        {status === 'active' && hasCamera === false && qrcodeUrl && (
          <div className="flex flex-col items-center justify-center h-full p-4 overflow-auto">
            <p className="text-white text-xs text-center mb-2">未检测到摄像头</p>
            <p className="text-gray-400 text-xs text-center mb-3">请用手机扫描以下二维码推流</p>
            {qrcodeDataUrl ? (
              <img src={qrcodeDataUrl} alt="推流二维码" className="w-40 h-40 rounded-lg" />
            ) : (
              <div className="w-40 h-40 bg-white rounded-lg flex items-center justify-center">
                <RefreshCw size={24} className="text-gray-400 animate-spin" />
              </div>
            )}
            <p className="text-blue-400 text-xs mt-3 break-all text-center max-w-full">{qrcodeUrl}</p>
            <div className="flex items-center gap-1 text-gray-400 text-xs mt-2">
              <Radio size={12} />
              RTMP 推流模式 · 手机扫码推流
            </div>
          </div>
        )}
        {status === 'idle' && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <CameraOff size={32} />
          </div>
        )}
        {status === 'starting' && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <RefreshCw size={24} className="animate-spin" />
            <span className="ml-2 text-sm">正在启动虚拟摄像头...</span>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="text-red-600 text-sm mb-3 p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex gap-2">
        {(status === 'idle' || status === 'error') && (
          <button
            onClick={handleStart}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Camera size={16} />
            开启摄像头
          </button>
        )}
        {status === 'active' && (
          <button
            onClick={handleStop}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <CameraOff size={16} />
            关闭摄像头
          </button>
        )}
      </div>

      {/* 推流说明 */}
      {status === 'active' && (
        <div className="mt-3 text-xs text-gray-400 flex items-start gap-1">
          <Video size={12} className="mt-0.5 flex-shrink-0" />
          <span>
            {hasCamera === true
              ? '本地摄像头已连接，视频正在推流到云手机。'
              : '手机扫码后将在新页面打开推流，保持手机屏幕常亮。'}
            推流链路：浏览器 → WebSocket → ffmpeg → RTMP → 云手机虚拟摄像头。
          </span>
        </div>
      )}
    </div>
  )
}
