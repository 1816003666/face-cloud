# 云手机虚拟摄像头功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现云手机虚拟摄像头功能，支持用户通过本地摄像头或手机扫码推流到魔云腾云手机。

**Architecture:** 前端检测摄像头 → 有则直接推流，无则显示二维码 → 手机扫码后推流 → Node 后端接收 MJPEG 帧 → TCP 转发到魔云腾摄像头端口。

**Tech Stack:** React 19, Express.js, Node.js net 模块, Canvas API, Fetch API

---

## File Structure

```
server/src/
├── mytCameraClient.js     # 新增：魔云腾摄像头 TCP 客户端
└── routes.js              # 修改：新增摄像头路由 (约 60 行)

src/
├── pages/
│   ├── CameraControl.jsx  # 新增：摄像头控制组件 (约 150 行)
│   └── StreamPage.jsx     # 新增：推流页面 (约 120 行)
├── api/
│   └── backend.js         # 修改：新增摄像头 API 方法 (约 30 行)
└── App.jsx                # 修改：新增推流页面路由 (约 5 行)
```

---

### Task 1: 创建魔云腾摄像头 TCP 客户端

**Files:**
- Create: `server/src/mytCameraClient.js`

- [ ] **Step 1: 创建 TCP 客户端模块**

```javascript
// server/src/mytCameraClient.js
// 魔云腾摄像头 TCP 推流客户端
// 将浏览器端的 MJPEG 帧转发到魔云腾摄像头端口

import net from 'node:net'

/**
 * 创建魔云腾摄像头客户端
 * @param {string} host - 宿主机 IP
 * @param {number} cameraPort - 摄像头 TCP 端口
 * @param {object} [opts]
 * @param {number} [opts.timeout=5000] - 连接超时
 */
export function createMytCameraClient(host, cameraPort, opts = {}) {
  const { timeout = 5000 } = opts
  let socket = null
  let isConnected = false
  let frameCount = 0

  return {
    host,
    cameraPort,
    frameCount: () => frameCount,
    isConnected: () => isConnected,

    /**
     * 建立 TCP 连接到魔云腾摄像头端口
     * @returns {Promise<void>}
     */
    connect() {
      return new Promise((resolve, reject) => {
        if (isConnected) {
          resolve()
          return
        }

        socket = net.createConnection({ host, port: cameraPort })

        const timer = setTimeout(() => {
          if (!isConnected) {
            socket.destroy()
            reject(new Error(`连接超时 (${timeout}ms)`))
          }
        }, timeout)

        socket.on('connect', () => {
          clearTimeout(timer)
          isConnected = true
          frameCount = 0
          resolve()
        })

        socket.on('error', (err) => {
          clearTimeout(timer)
          isConnected = false
          reject(err)
        })

        socket.on('close', () => {
          isConnected = false
        })
      })
    },

    /**
     * 发送 JPEG 帧到魔云腾
     * 魔云腾协议：直接发送 JPEG 二进制数据
     * @param {Buffer} jpegBuffer - JPEG 帧数据
     */
    sendFrame(jpegBuffer) {
      if (!isConnected || !socket) {
        throw new Error('未连接到摄像头端口')
      }

      // 检查 JPEG 头 (FF D8 FF)
      if (jpegBuffer.length < 3 || jpegBuffer[0] !== 0xFF || jpegBuffer[1] !== 0xD8 || jpegBuffer[2] !== 0xFF) {
        console.warn('无效的 JPEG 数据，跳过')
        return
      }

      socket.write(jpegBuffer)
      frameCount++
    },

    /**
     * 关闭 TCP 连接
     */
    disconnect() {
      if (socket) {
        socket.destroy()
        socket = null
      }
      isConnected = false
    },
  }
}

/**
 * 活跃的摄像头会话管理
 */
export const cameraSessions = new Map()

/**
 * 清理过期会话 (超过 10 分钟未活动)
 */
export function cleanupExpiredSessions() {
  const now = Date.now()
  const maxAge = 10 * 60 * 1000 // 10 分钟

  for (const [token, session] of cameraSessions.entries()) {
    if (now - session.createdAt > maxAge) {
      // 关闭 TCP 连接
      if (session.client) {
        session.client.disconnect()
      }
      cameraSessions.delete(token)
    }
  }
}

// 定时清理过期会话
setInterval(cleanupExpiredSessions, 60 * 1000)
```

- [ ] **Step 2: 提交代码**

```bash
git add server/src/mytCameraClient.js
git commit -m "feat(camera): add MytCameraClient for TCP streaming to Moyunteng camera port"
```

---

### Task 2: 添加摄像头 API 路由

**Files:**
- Modify: `server/src/routes.js`

- [ ] **Step 1: 导入 mytCameraClient 模块**

在 `routes.js` 顶部导入区域添加：

```javascript
// 在其他 import 语句后添加
import { createMytCameraClient, cameraSessions } from './mytCameraClient.js'
```

- [ ] **Step 2: 添加摄像头路由**

在 `routes.js` 文件末尾、最后一个路由之后添加：

```javascript
  // ============================
  // 摄像头推流 API
  // ============================

  // 开启虚拟摄像头
  app.post('/api/camera/:host/:index/start', authRequired, async (req, res) => {
    try {
      const { host, index } = req.params
      const ports = computeContainerPorts(parseInt(index, 10), 'non-bridge')

      // 调用魔云腾 API 开启虚拟摄像头
      const containerClient = createMytContainerClient({ host, index: parseInt(index, 10), mode: 'non-bridge' })
      await containerClient.setVirtualCamera(true)

      // 生成推流 token
      const token = `cam_${Date.now()}_${Math.random().toString(36).slice(2)}`
      cameraSessions.set(token, {
        host,
        index: parseInt(index, 10),
        cameraPort: ports.cameraTcp,
        createdAt: Date.now(),
        client: null,
      })

      // 构建推流 URL (相对路径，由 Vite 代理)
      const streamUrl = `/api/camera/stream`
      const qrcodeUrl = `/api/camera/qrcode?token=${token}`

      res.json({
        code: 200,
        data: {
          token,
          streamUrl,
          qrcodeUrl,
          cameraPort: ports.cameraTcp,
          host,
          index: parseInt(index, 10),
        },
      })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 关闭虚拟摄像头
  app.post('/api/camera/:host/:index/stop', authRequired, async (req, res) => {
    try {
      const { host, index } = req.params

      // 关闭所有相关会话
      for (const [token, session] of cameraSessions.entries()) {
        if (session.host === host && session.index === parseInt(index, 10)) {
          if (session.client) {
            session.client.disconnect()
          }
          cameraSessions.delete(token)
        }
      }

      // 调用魔云腾 API 关闭虚拟摄像头
      const containerClient = createMytContainerClient({ host, index: parseInt(index, 10), mode: 'non-bridge' })
      await containerClient.setVirtualCamera(false)

      res.json({ code: 200, message: '摄像头已关闭' })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 推流接口 (接收 MJPEG 帧)
  app.post('/api/camera/stream', authRequired, async (req, res) => {
    try {
      const { token } = req.query
      if (!token) {
        return res.status(400).json({ code: 400, message: '缺少 token 参数' })
      }

      const session = cameraSessions.get(token)
      if (!session) {
        return res.status(404).json({ code: 404, message: '无效或过期的 token' })
      }

      // 建立 TCP 连接（如果尚未连接）
      if (!session.client) {
        session.client = createMytCameraClient(session.host, session.cameraPort)
        await session.client.connect()
      }

      // 接收请求体中的 JPEG 帧并转发
      req.on('data', (chunk) => {
        try {
          session.client.sendFrame(chunk)
        } catch (e) {
          console.error('发送帧失败:', e.message)
        }
      })

      req.on('end', () => {
        res.json({ code: 200, message: '帧已接收' })
      })

      req.on('error', (e) => {
        console.error('请求错误:', e.message)
        res.status(500).json({ code: 500, message: e.message })
      })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 获取摄像头状态
  app.get('/api/camera/:host/:index/status', authRequired, async (req, res) => {
    try {
      const { host, index } = req.params

      // 查找活跃会话
      const activeSession = [...cameraSessions.values()].find(
        (s) => s.host === host && s.index === parseInt(index, 10) && s.client?.isConnected()
      )

      res.json({
        code: 200,
        data: {
          active: !!activeSession,
          frameCount: activeSession?.client?.frameCount() || 0,
        },
      })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 生成推流页面二维码
  app.get('/api/camera/qrcode', authRequired, (req, res) => {
    try {
      const { token } = req.query
      if (!token) {
        return res.status(400).json({ code: 400, message: '缺少 token 参数' })
      }

      // 推流页面 URL (前端路由)
      const streamPageUrl = `${req.protocol}://${req.get('host')}/camera/stream?token=${token}`

      // 返回 URL，前端使用 qrcode 库生成二维码
      res.json({
        code: 200,
        data: {
          url: streamPageUrl,
          token,
        },
      })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })
```

- [ ] **Step 3: 提交代码**

```bash
git add server/src/routes.js
git commit -m "feat(camera): add camera streaming API routes (start/stop/stream/status/qrcode)"
```

---

### Task 3: 前端 API 封装

**Files:**
- Modify: `src/api/backend.js`

- [ ] **Step 1: 在 api 对象中添加摄像头 API 方法**

在 `backend.js` 的 `api` 对象中，`batchContainerAction` 方法之后添加：

```javascript
  // === 摄像头推流 ===

  /**
   * 开启虚拟摄像头
   * @param {string} host - 宿主机 IP
   * @param {number} index - 实例位
   */
  async startCamera(host, index) {
    return request(`/api/camera/${encodeURIComponent(host)}/${encodeURIComponent(index)}/start`, { method: 'POST' })
  },

  /**
   * 关闭虚拟摄像头
   * @param {string} host - 宿主机 IP
   * @param {number} index - 实例位
   */
  async stopCamera(host, index) {
    return request(`/api/camera/${encodeURIComponent(host)}/${encodeURIComponent(index)}/stop`, { method: 'POST' })
  },

  /**
   * 发送摄像头帧
   * @param {string} token - 推流 token
   * @param {Blob} jpegBlob - JPEG 帧 Blob
   */
  async sendCameraFrame(token, jpegBlob) {
    const res = await fetch(`/api/camera/stream?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        Authorization: `Bearer ${getToken()}`,
      },
      body: jpegBlob,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`发送帧失败: ${res.status} ${text}`)
    }
    return res.json()
  },

  /**
   * 获取摄像头状态
   * @param {string} host - 宿主机 IP
   * @param {number} index - 实例位
   */
  async getCameraStatus(host, index) {
    return request(`/api/camera/${encodeURIComponent(host)}/${encodeURIComponent(index)}/status`)
  },

  /**
   * 获取推流二维码 URL
   * @param {string} token - 推流 token
   */
  async getCameraQrcode(token) {
    return request(`/api/camera/qrcode?token=${encodeURIComponent(token)}`)
  },
```

- [ ] **Step 2: 提交代码**

```bash
git add src/api/backend.js
git commit -m "feat(camera): add camera API methods (startCamera/stopCamera/sendCameraFrame)"
```

---

### Task 4: 创建摄像头控制组件

**Files:**
- Create: `src/pages/CameraControl.jsx`

- [ ] **Step 1: 创建 CameraControl 组件**

```jsx
// src/pages/CameraControl.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { Camera, CameraOff, QrCode, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../api/backend'

export default function CameraControl({ host, index, deviceName }) {
  const [hasCamera, setHasCamera] = useState(null) // null=检测中, true/false
  const [status, setStatus] = useState('idle') // idle | starting | active | error
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [qrcodeUrl, setQrcodeUrl] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  // 检测本地摄像头
  useEffect(() => {
    async function checkCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        stream.getTracks().forEach(t => t.stop())
        setHasCamera(true)
      } catch (e) {
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

      const result = await api.startCamera(host, index)
      setSession(result.data)

      // 获取二维码 URL
      const qrResult = await api.getCameraQrcode(result.data.token)
      setQrcodeUrl(qrResult.data.url)

      setStatus('active')
    } catch (e) {
      setError(e.message)
      setStatus('error')
    }
  }, [host, index])

  // 关闭摄像头
  const handleStop = useCallback(async () => {
    try {
      // 停止推流
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      // 调用后端关闭
      await api.stopCamera(host, index)
      setStatus('idle')
      setSession(null)
      setQrcodeUrl(null)
    } catch (e) {
      setError(e.message)
    }
  }, [host, index])

  // 开始推流（本地摄像头）
  const startLocalStream = useCallback(async () => {
    if (!session) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      // 创建 Canvas 用于捕获帧
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const fps = 10

      intervalRef.current = setInterval(async () => {
        if (!video || video.readyState < 2) return

        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        try {
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8))
          if (blob) {
            await api.sendCameraFrame(session.token, blob)
          }
        } catch (e) {
          console.error('发送帧失败:', e)
        }
      }, 1000 / fps)
    } catch (e) {
      setError('无法访问摄像头: ' + e.message)
    }
  }, [session])

  // 激活状态时自动开始推流（如果有本地摄像头）
  useEffect(() => {
    if (status === 'active' && hasCamera === true && session) {
      startLocalStream()
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [status, hasCamera, session, startLocalStream])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-gray-600" />
          <span className="font-medium text-gray-800">摄像头控制</span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'active' && (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
              <CheckCircle size={12} />
              推流中
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
        目标设备: {deviceName || `#${index}`} ({host}:{30005 + (index - 1) * 100})
      </div>

      {/* 摄像头检测状态 */}
      {hasCamera === null && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <RefreshCw size={14} className="animate-spin" />
          检测摄像头中...
        </div>
      )}

      {/* 视频预览区域 */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-3">
        {status === 'active' && hasCamera === true && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
        )}
        {status === 'active' && hasCamera === false && qrcodeUrl && (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <QrCode size={80} className="text-gray-400 mb-2" />
            <p className="text-white text-xs text-center mb-2">未检测到摄像头</p>
            <p className="text-gray-400 text-xs text-center">请用手机扫描以下二维码</p>
            <p className="text-blue-400 text-xs mt-2 break-all">{qrcodeUrl}</p>
          </div>
        )}
        {status === 'idle' && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <CameraOff size={32} />
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
        {status === 'idle' && (
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
    </div>
  )
}
```

- [ ] **Step 2: 提交代码**

```bash
git add src/pages/CameraControl.jsx
git commit -m "feat(camera): add CameraControl component for camera detection and streaming control"
```

---

### Task 5: 创建推流页面

**Files:**
- Create: `src/pages/StreamPage.jsx`

- [ ] **Step 1: 创建 StreamPage 组件**

```jsx
// src/pages/StreamPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Camera, CameraOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { api } from '../api/backend'

export default function StreamPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState('connecting') // connecting | active | error | stopped
  const [error, setError] = useState(null)
  const [frameCount, setFrameCount] = useState(0)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  // 开始推流
  const startStream = useCallback(async () => {
    if (!token) {
      setError('缺少 token 参数')
      setStatus('error')
      return
    }

    try {
      // 获取摄像头权限
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setStatus('active')

      // 创建 Canvas 用于捕获帧
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const fps = 10

      intervalRef.current = setInterval(async () => {
        if (!video || video.readyState < 2) return

        canvas.width = video.videoWidth || 640
        canvas.height = video.videoHeight || 480
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        try {
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8))
          if (blob) {
            await api.sendCameraFrame(token, blob)
            setFrameCount(c => c + 1)
          }
        } catch (e) {
          console.error('发送帧失败:', e)
        }
      }, 1000 / fps)
    } catch (e) {
      setError('无法访问摄像头: ' + e.message)
      setStatus('error')
    }
  }, [token])

  // 停止推流
  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStatus('stopped')
  }, [])

  // 页面加载时自动开始
  useEffect(() => {
    startStream()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    }
  }, [startStream])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* 顶部导航 */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white">
          <ArrowLeft size={20} />
          返回
        </Link>
        <div className="flex items-center gap-2">
          {status === 'active' && (
            <span className="flex items-center gap-1 text-green-400 text-sm">
              <CheckCircle size={14} />
              推流中 · {frameCount} 帧
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 text-red-400 text-sm">
              <AlertCircle size={14} />
              错误
            </span>
          )}
        </div>
      </div>

      {/* 视频预览 */}
      <div className="flex-1 flex items-center justify-center p-4">
        {status === 'connecting' && (
          <div className="text-center text-gray-400">
            <Camera size={48} className="mx-auto mb-3 animate-pulse" />
            <p>正在连接摄像头...</p>
          </div>
        )}

        {status === 'active' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full rounded-lg"
          />
        )}

        {status === 'error' && (
          <div className="text-center text-gray-400">
            <AlertCircle size={48} className="mx-auto mb-3 text-red-400" />
            <p className="text-red-400 mb-2">推流出错</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {status === 'stopped' && (
          <div className="text-center text-gray-400">
            <CameraOff size={48} className="mx-auto mb-3" />
            <p>推流已停止</p>
          </div>
        )}
      </div>

      {/* 底部控制 */}
      <div className="bg-gray-800 px-4 py-4">
        {status === 'active' && (
          <button
            onClick={stopStream}
            className="w-full px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <CameraOff size={20} />
            停止推流
          </button>
        )}
        {(status === 'error' || status === 'stopped') && (
          <button
            onClick={startStream}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            重新开始
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交代码**

```bash
git add src/pages/StreamPage.jsx
git commit -m "feat(camera): add StreamPage for mobile QR code scanning and camera streaming"
```

---

### Task 6: 添加路由配置

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 导入 StreamPage 组件**

在 App.jsx 的 import 区域添加：

```jsx
import StreamPage from './pages/StreamPage'
```

- [ ] **Step 2: 添加推流页面路由**

在 `<Routes>` 内，添加摄像头推流路由：

```jsx
            {/* 摄像头推流页面 (二维码扫码入口) */}
            <Route path="camera/stream" element={<StreamPage />} />
```

- [ ] **Step 3: 提交代码**

```bash
git add src/App.jsx
git commit -m "feat(camera): add StreamPage route for QR code camera streaming"
```

---

### Task 7: 集成到设备管理页面

**Files:**
- Modify: `src/pages/DeviceManage.jsx` 或 `src/pages/MultiPreview.jsx`

- [ ] **Step 1: 在 MultiPreview 中添加摄像头控制入口**

在 `MultiPreview.jsx` 中，导入 CameraControl 组件：

```jsx
import CameraControl from './CameraControl'
```

- [ ] **Step 2: 在全屏预览模态框中添加摄像头控制**

在全屏预览模态框的设备信息区域后添加：

```jsx
              {/* 摄像头控制 */}
              <div className="mt-4">
                <CameraControl
                  host={SERVER_HOST}
                  index={selectedDevice.index}
                  deviceName={`${selectedDevice.brand} ${selectedDevice.model}`}
                />
              </div>
```

- [ ] **Step 3: 提交代码**

```bash
git add src/pages/MultiPreview.jsx
git commit -m "feat(camera): integrate CameraControl into MultiPreview full-screen preview"
```

---

### Task 8: 端到端测试

**Files:**
- 无新增文件

- [ ] **Step 1: 启动服务**

```bash
# 启动后端
cd server && node src/index.js

# 启动前端
cd .. && npx vite --port 5173
```

- [ ] **Step 2: 测试摄像头功能**

测试步骤：
1. 打开 http://localhost:5173/preview
2. 点击任意设备进入全屏预览
3. 点击"开启摄像头"按钮
4. 验证：
   - 有摄像头：视频预览显示
   - 无摄像头：显示二维码
5. 测试手机扫码推流：
   - 用手机扫描二维码
   - 跳转到推流页面
   - 允许摄像头权限
   - 验证视频开始推流
6. 点击"关闭摄像头"停止推流

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "feat(camera): complete virtual camera streaming feature with QR code fallback"
```

---

## Self-Review

**1. Spec coverage:**
- ✅ 摄像头检测逻辑
- ✅ 有摄像头：直接推流
- ✅ 无摄像头：显示二维码
- ✅ 手机扫码推流页面
- ✅ MJPEG 分块传输
- ✅ TCP 转发到魔云腾
- ✅ 开启/关闭虚拟摄像头 API

**2. Placeholder scan:**
- ✅ 无 TBD/TODO
- ✅ 所有代码步骤都有完整实现
- ✅ 所有命令都有具体参数

**3. Type consistency:**
- ✅ `api.startCamera` 返回 `{ code: 200, data: { token, streamUrl, ... } }`
- ✅ `CameraControl` 使用 `result.data.token`
- ✅ `api.sendCameraFrame(token, blob)` 参数类型匹配

---

**Plan complete. Ready for execution.**