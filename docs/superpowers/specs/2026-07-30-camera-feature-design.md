# 云手机虚拟摄像头功能设计

**版本**: 1.0 | **日期**: 2026-07-30 | **作者**: AI Assistant

## 概述

实现云手机虚拟摄像头功能，允许用户通过本地摄像头或手机扫码推流，将视频流传输到魔云腾云手机。

## 用户场景

- **身份认证**：人脸识别、扫码验证等需要临时使用摄像头
- **支持设备**：电脑浏览器和手机浏览器
- **延迟要求**：中等延迟（1-3秒），HTTP 分块传输可接受
- **触发方式**：手动点击按钮触发，或自动检测 App 调用

## 系统架构

### 核心组件

| 组件 | 技术栈 | 职责 |
|---|---|---|
| CameraControl 页面 | React + Tailwind | 用户界面：检测摄像头、显示二维码、控制开关 |
| StreamPage 页面 | React + Canvas | 获取摄像头画面、分块传输到后端 |
| Camera Router | Express | API：生成二维码、接收视频流、转发到云手机 |
| MytCameraClient | Node.js | 封装魔云腾摄像头 TCP 推流协议 |

### 数据流

```
┌─────────────────┐
│ 电脑浏览器      │
│ (检测摄像头)    │
└────────┬────────┘
         │ 有摄像头?
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ↓         ↓
┌───────┐  ┌─────────────┐
│直接   │  │ 显示二维码   │
│推流   │  │ 等待手机扫码 │
└───┬───┘  └──────┬──────┘
    │             │
    │      ┌──────┴──────┐
    │      │ 手机扫码    │
    │      │ 跳转推流页  │
    │      └──────┬──────┘
    │             │
    └──────┬──────┘
           ↓
    ┌──────────────┐
    │ POST /api/   │
    │ camera/stream│
    │ (MJPEG 分块) │
    └──────┬───────┘
           ↓
    ┌──────────────┐
    │ Node 后端    │
    │ 转发到 TCP   │
    └──────┬───────┘
           ↓
    ┌──────────────┐
    │ 魔云腾       │
    │ 摄像头端口   │
    │ 30005 (TCP)  │
    └──────┬───────┘
           ↓
    ┌──────────────┐
    │ 云手机       │
    │ 虚拟摄像头   │
    └──────────────┘
```

## API 接口设计

### 后端 API

| 接口 | 方法 | 功能 |
|---|---|---|
| `/api/camera/:host/:index/start` | POST | 开启虚拟摄像头，返回推流 token |
| `/api/camera/:host/:index/stop` | POST | 关闭虚拟摄像头 |
| `/api/camera/stream` | POST | 接收 MJPEG 视频流并转发 |
| `/api/camera/:host/:index/status` | GET | 获取摄像头状态 |
| `/api/camera/qrcode` | GET | 生成推流页面二维码 |

### 请求/响应示例

**开启摄像头：**
```json
// POST /api/camera/192.168.9.105/1/start
// Request: {}
// Response
{
  "code": 200,
  "data": {
    "token": "cam_xxx",
    "streamUrl": "/api/camera/stream?token=cam_xxx",
    "qrcodeUrl": "/api/camera/qrcode?token=cam_xxx",
    "cameraPort": 30005
  }
}
```

**推流接口：**
```
// POST /api/camera/stream?token=cam_xxx
// Content-Type: application/octet-stream
// Body: JPEG 帧二进制数据
```

## 前端组件设计

### CameraControl 组件

摄像头控制面板，集成在设备管理或多画面预览页面。

**功能：**
1. 检测本地摄像头 (`navigator.mediaDevices.getUserMedia`)
2. 有摄像头：显示"开启摄像头"按钮
3. 无摄像头：显示二维码，提示用户扫码
4. 状态显示：未连接/连接中/推流中

### StreamPage 组件

手机扫码后的推流页面，独立路由 `/camera/stream?token=xxx`

**功能：**
1. 获取摄像头权限
2. 实时预览摄像头画面
3. 每 100ms 捕获一帧 JPEG，POST 到后端
4. 停止推流按钮

### 关键逻辑

```javascript
// 检测本地摄像头
async function checkCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    stream.getTracks().forEach(t => t.stop())
    return { hasCamera: true }
  } catch (e) {
    return { hasCamera: false }
  }
}

// 推流核心
async function startStreaming(videoElement, streamUrl, token) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const fps = 10 // 10帧/秒

  return setInterval(async () => {
    canvas.width = videoElement.videoWidth
    canvas.height = videoElement.videoHeight
    ctx.drawImage(videoElement, 0, 0)
    
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8))
    await fetch(`${streamUrl}?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: blob
    })
  }, 1000 / fps)
}
```

## 后端实现设计

### MytCameraClient 模块

封装魔云腾摄像头 TCP 推流协议。

**关键方法：**
- `connect()` - 建立 TCP 连接到摄像头端口
- `sendFrame(jpegBuffer)` - 发送 JPEG 帧数据
- `disconnect()` - 关闭连接

**魔云腾协议：**
- TCP 连接到摄像头端口（非桥接模式：30005 + (index-1)*100）
- 发送 JPEG 帧，带帧头标识

### Express 路由

```javascript
// 活跃的摄像头会话
const cameraSessions = new Map()

// 开启摄像头
app.post('/api/camera/:host/:index/start', authRequired, async (req, res) => {
  const { host, index } = req.params
  const ports = computeContainerPorts(parseInt(index), 'non-bridge')
  
  // 调用魔云腾 API 开启虚拟摄像头
  const client = createMytContainerClient({ host, index, mode: 'non-bridge' })
  await client.setVirtualCamera(true)
  
  // 生成推流 token
  const token = `cam_${Date.now()}_${Math.random().toString(36).slice(2)}`
  cameraSessions.set(token, { host, index, cameraPort: ports.cameraTcp, createdAt: Date.now() })
  
  res.json({
    code: 200,
    data: {
      token,
      streamUrl: `/api/camera/stream`,
      qrcodeUrl: `/api/camera/qrcode?token=${token}`,
      cameraPort: ports.cameraTcp,
    }
  })
})

// 推流接口
app.post('/api/camera/stream', authRequired, async (req, res) => {
  const { token } = req.query
  const session = cameraSessions.get(token)
  if (!session) return res.status(404).json({ message: '无效 token' })
  
  // 建立 TCP 连接
  const camera = createMytCameraClient(session.host, session.cameraPort)
  await camera.connect()
  
  // 转发帧数据
  req.on('data', (chunk) => camera.sendFrame(chunk))
  req.on('end', () => {
    camera.disconnect()
    res.json({ code: 200 })
  })
})
```

## 文件结构

```
server/src/
├── mytCameraClient.js     # 新增：魔云腾摄像头 TCP 客户端
├── routes.js              # 修改：新增摄像头路由
└── index.js               # 修改：导入新模块

src/
├── pages/
│   ├── CameraControl.jsx  # 新增：摄像头控制组件
│   └── StreamPage.jsx     # 新增：推流页面
├── api/
│   └── backend.js         # 修改：新增摄像头 API 方法
└── App.jsx                # 修改：新增推流页面路由
```

## 依赖

### 前端
- 无新增依赖（使用原生 Canvas + Fetch API）

### 后端
- 无新增依赖（使用 Node.js 原生 `net` 模块）

## 测试计划

1. **单元测试**
   - MytCameraClient TCP 连接/断开
   - 帧数据发送格式

2. **集成测试**
   - 开启/关闭摄像头 API
   - 推流接口转发

3. **端到端测试**
   - 电脑有摄像头：直接推流
   - 电脑无摄像头：扫码推流
   - 手机浏览器：直接推流

## 风险与缓解

| 风险 | 缓解措施 |
|---|---|
| 魔云腾 TCP 协议不明确 | 先测试端口连通性，抓包分析协议 |
| 浏览器摄像头权限被拒 | 提示用户授权，或引导使用扫码方式 |
| 高帧率导致带宽压力 | 限制 10fps，压缩质量 0.8 |
| Token 泄露 | 设置 5 分钟过期时间，使用 HTTPS |

## 成功标准

1. 电脑有摄像头时，点击"开启摄像头"可在 2 秒内开始推流
2. 电脑无摄像头时，扫码后可在 3 秒内开始推流
3. 推流延迟稳定在 1-2 秒内
4. 云手机内的 App 可正常获取摄像头画面