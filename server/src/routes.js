// 把魔云腾 Docker Engine API 包装成前端能直接调用的 REST 接口
// 支持多台魔云腾服务器同时管理
// 支持三种模式：docker (2375端口)、sdk (8000端口HTTP API)、container (容器级API)

import { scanNetwork } from './scanner.js'
import { createMytSdkClient } from './mytSdkClient.js'
import { createMytContainerClient, discoverContainers, computeContainerPorts } from './mytContainerClient.js'
import {
  startRtmpServer,
  getContainerFullName,
  setCamStream,
  cameraHotStart,
  getCamStream,
  setContainerCamera,
  createFfmpegTranscoder,
  cameraSessions,
  stopSession,
} from './mytCameraClient.js'
import { WebSocketServer } from 'ws'
import os from 'node:os'

// SDK 客户端缓存
const sdkClientCache = new Map()

function getSdkClient(serverId, config) {
  if (!sdkClientCache.has(serverId)) {
    sdkClientCache.set(serverId, createMytSdkClient(config))
  }
  return sdkClientCache.get(serverId)
}

function resetSdkClient(serverId) {
  sdkClientCache.delete(serverId)
}

// 自动检测局域网 IP
function detectLanIp() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return '127.0.0.1'
}

export function registerRoutes(app, { authRequired, getClient, getServers, addServer, removeServer, resetClient, getServerConfig, httpServer }) {
  // SDK 服务地址（魔云腾本地管理服务，默认 127.0.0.1:5000）
  const SDK_HOST = process.env.MYT_SDK_HOST || '127.0.0.1:5000'
  // 本机局域网 IP（云手机通过此 IP 访问 RTMP 服务器）
  const LAN_IP = process.env.LAN_IP || detectLanIp()
  // RTMP 服务器端口（与 mytCameraClient.js 保持一致）
  const RTMP_PORT = parseInt(process.env.RTMP_PORT || '1937', 10)

  console.log(`[配置] SDK_HOST=${SDK_HOST}, LAN_IP=${LAN_IP}, RTMP_PORT=${RTMP_PORT}`)
  console.log(`[配置] 云手机将拉流: rtmp://${LAN_IP}:${RTMP_PORT}/live/<token>`)

  // 启动 RTMP 服务器
  startRtmpServer()

  // WebSocket 服务器：接收手机推流的视频帧
  const wss = new WebSocketServer({ noServer: true })

  if (httpServer) {
    httpServer.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, `http://${req.headers.host}`)
      if (url.pathname === '/api/camera/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req)
        })
      }
    })
  }

  // 处理 WebSocket 推流连接
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`)
    const token = url.searchParams.get('token')

    if (!token) {
      ws.close(1008, '缺少 token')
      return
    }

    const session = cameraSessions.get(token)
    if (!session) {
      ws.close(1008, '无效或过期的 token')
      return
    }

    console.log(`[WS] 推流连接建立: token=${token}`)

    // 启动 ffmpeg 转码进程（如果尚未启动）
    if (!session.ffmpeg) {
      session.ffmpeg = createFfmpegTranscoder(session.rtmpUrl)
      session.ffmpeg.stdin.on('error', (err) => {
        console.error('[WS] ffmpeg stdin 错误:', err.message)
      })
    }

    let totalBytes = 0
    let cameraStarted = false
    let logCounter = 0

    ws.on('message', (data, isBinary) => {
      if (isBinary && session.ffmpeg && session.ffmpeg.stdin.writable) {
        session.ffmpeg.stdin.write(data)
        totalBytes += data.length
        session.frameCount = (session.frameCount || 0) + 1
        session.lastActivity = Date.now()

        // 每 10 帧打印一次日志
        logCounter++
        if (logCounter % 10 === 0) {
          console.log(`[WS] 已收到 ${session.frameCount} 帧, 总字节=${totalBytes}, 单帧大小=${data.length}`)
        }

        // 收到前几帧数据后，ffmpeg 已开始向 RTMP 服务器推流，此时调用 camera 热启动
        if (!cameraStarted && session.frameCount >= 3 && session.containerName) {
          cameraStarted = true
          console.log(`[摄像头] 收到 ${session.frameCount} 帧，准备热启动...`)
          // 延迟 1 秒，确保 ffmpeg 已将数据推送到 RTMP 服务器
          setTimeout(async () => {
            try {
              console.log(`[摄像头] 调用 cameraHotStart: SDK=${SDK_HOST}, host=${session.host}, container=${session.containerName}, rtmpUrl=${session.rtmpUrl}`)
              await cameraHotStart(SDK_HOST, session.host, session.containerName, 'start', session.rtmpUrl)
              console.log(`[摄像头] 推流开始后虚拟摄像头热启动成功`)
            } catch (e) {
              console.warn(`[摄像头] 推流开始后热启动失败: ${e.message}`)
              // 重试一次
              setTimeout(async () => {
                try {
                  await cameraHotStart(SDK_HOST, session.host, session.containerName, 'start')
                  console.log(`[摄像头] 重试热启动成功`)
                } catch (e2) {
                  console.warn(`[摄像头] 重试热启动仍失败: ${e2.message}`)
                }
              }, 2000)
            }
          }, 1000)
        }
      }
    })

    ws.on('close', () => {
      console.log(`[WS] 推流连接断开: token=${token}, 总字节=${totalBytes}, 总帧=${session.frameCount || 0}`)
      // 不立即关闭 ffmpeg，等会话停止时再关闭
    })

    ws.on('error', (err) => {
      console.error('[WS] 错误:', err.message)
    })

    ws.send(JSON.stringify({ type: 'connected', rtmpUrl: session.rtmpUrl }))
  })
  // ============================
  // 服务器管理
  // ============================

  // 列出所有已配置的服务器
  app.get('/api/servers', authRequired, (_req, res) => {
    res.json(getServers())
  })

  // 添加或更新服务器（支持 docker 和 sdk 两种模式）
  app.post('/api/servers', authRequired, (req, res) => {
    const { id, label, host, port, tls, mode, username, password } = req.body || {}
    if (!host || !port) {
      return res.status(400).json({ code: 400, message: 'host/port 必填' })
    }
    const server = addServer({ id, label, host, port: parseInt(port, 10), tls: Boolean(tls), mode: mode || 'docker', username, password })
    res.json({ ok: true, server })
  })

  // 删除服务器
  app.delete('/api/servers/:serverId', authRequired, (req, res) => {
    try {
      removeServer(req.params.serverId)
      res.json({ ok: true })
    } catch (e) {
      res.status(404).json({ code: 404, message: e.message })
    }
  })

  // 测试服务器连接
  app.post('/api/servers/:serverId/test', authRequired, async (req, res) => {
    try {
      resetClient(req.params.serverId)
      const c = getClient(req.params.serverId)
      const r = await c.ping()
      res.json({ ok: true, message: '连接成功', detail: r })
    } catch (e) {
      res.status(502).json({ code: 502, message: '连接失败：' + e.message })
    }
  })

  // 局域网自动扫描魔云腾服务器
  app.post('/api/servers/scan', authRequired, async (req, res) => {
    try {
      const { subnets, ports, ranges, ips } = req.body || {}
      const result = await scanNetwork({ subnets, ports, ranges, ips })
      res.json(result)
    } catch (e) {
      res.status(500).json({ code: 500, message: '扫描失败：' + e.message })
    }
  })

  // ============================
  // 云手机（容器）相关
  // ============================

  // 聚合列出所有服务器的云手机
  app.get('/api/devices', authRequired, async (_req, res) => {
    const allServers = getServers()
    if (allServers.length === 0) {
      return res.json([])
    }
    const results = []
    for (const srv of allServers) {
      try {
        const c = getClient(srv.id)
        const list = await c.listContainers({ all: true })
        const transformed = transformContainers(list, srv.id, srv.label, srv.host)
        results.push(...transformed)
      } catch (e) {
        // 某台服务器不可达，跳过并继续聚合其他服务器
        results.push({
          id: `_err_${srv.id}`,
          name: `[${srv.label} 连接失败]`,
          serverId: srv.id,
          serverLabel: srv.label,
          serverHost: srv.host,
          status: '离线',
          state: 'error',
          error: e.message,
          image: '',
          imageId: '',
          ip: '',
          lastActive: '',
          created: 0,
        })
      }
    }
    res.json(results)
  })

  // 启动一台云手机
  app.post('/api/devices/:serverId/:id/start', authRequired, async (req, res) => {
    try {
      await getClient(req.params.serverId).startContainer(req.params.id)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 停止一台云手机
  app.post('/api/devices/:serverId/:id/stop', authRequired, async (req, res) => {
    try {
      await getClient(req.params.serverId).stopContainer(req.params.id)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 重启一台云手机
  app.post('/api/devices/:serverId/:id/restart', authRequired, async (req, res) => {
    try {
      await getClient(req.params.serverId).restartContainer(req.params.id)
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 批量操作
  app.post('/api/devices/:serverId/batch', authRequired, async (req, res) => {
    const { ids = [], action } = req.body || {}
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ code: 400, message: 'ids 不能为空' })
    }
    const c = getClient(req.params.serverId)
    const results = []
    for (const id of ids) {
      try {
        if (action === 'start') await c.startContainer(id)
        else if (action === 'stop') await c.stopContainer(id)
        else if (action === 'restart') await c.restartContainer(id)
        else throw new Error('未知操作：' + action)
        results.push({ id, ok: true })
      } catch (e) {
        results.push({ id, ok: false, message: e.message })
      }
    }
    res.json({ results })
  })

  // 建机（创建并启动一个容器）
  app.post('/api/devices/:serverId', authRequired, async (req, res) => {
    try {
      const { image, name } = req.body || {}
      if (!image || !name) {
        return res.status(400).json({ code: 400, message: 'image/name 必填' })
      }
      const c = getClient(req.params.serverId)
      const created = await c.createContainer({ image, name })
      await c.startContainer(created.Id)
      res.json({ ok: true, id: created.Id })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 删除一台云手机
  app.delete('/api/devices/:serverId/:id', authRequired, async (req, res) => {
    try {
      const c = getClient(req.params.serverId)
      try { await c.stopContainer(req.params.id) } catch { /* 已停止则忽略 */ }
      await c.removeContainer(req.params.id, { force: true })
      res.json({ ok: true })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // ============================
  // 镜像相关
  // ============================

  // 聚合列出所有服务器的本地镜像
  app.get('/api/images', authRequired, async (_req, res) => {
    const allServers = getServers()
    const results = []
    for (const srv of allServers) {
      try {
        const c = getClient(srv.id)
        const list = await c.listImages()
        const transformed = transformImages(list, srv.id, srv.label)
        results.push(...transformed)
      } catch {
        // 跳过不可达的服务器
      }
    }
    res.json(results)
  })

  // ============================
  // SDK 模式设备管理
  // ============================

  // 获取 SDK 设备列表
  app.get('/api/sdk/devices', authRequired, async (_req, res) => {
    const allServers = getServers().filter(s => s.mode === 'sdk')
    if (allServers.length === 0) {
      return res.json([])
    }
    const results = []
    for (const srv of allServers) {
      try {
        const cfg = getServerConfig(srv.id)
        const sdkClient = getSdkClient(srv.id, cfg)
        // 使用新的 listDevices 方法（自动开启 Docker API 并获取列表）
        const containers = await sdkClient.listDevices()
        const transformed = transformSdkDevicesFromDocker(containers, srv.id, srv.label, srv.host)
        sdkClient.cacheDevicePorts(transformed)
        results.push(...transformed)
      } catch (e) {
        results.push({
          id: `_err_${srv.id}`,
          name: `[${srv.label} 连接失败]`,
          serverId: srv.id,
          serverLabel: srv.label,
          serverHost: srv.host,
          status: '离线',
          state: 'error',
          error: e.message,
          image: '',
          imageId: '',
          ip: '',
          lastActive: '',
          created: 0,
          mode: 'sdk',
        })
      }
    }
    res.json(results)
  })

  // SDK: 测试服务器登录
  app.post('/api/sdk/servers/:serverId/login', authRequired, async (req, res) => {
    try {
      const cfg = getServerConfig(req.params.serverId)
      const sdkClient = getSdkClient(req.params.serverId, cfg)
      if (req.body?.username) sdkClient.username = req.body.username
      if (req.body?.password) sdkClient.password = req.body.password
      resetSdkClient(req.params.serverId)
      const newClient = createMytSdkClient({ ...cfg, username: req.body?.username || cfg.username, password: req.body?.password || cfg.password })
      sdkClientCache.set(req.params.serverId, newClient)
      const result = await newClient.login()
      res.json({ ok: true, message: '登录成功', detail: result })
    } catch (e) {
      res.status(401).json({ code: 401, message: '登录失败：' + e.message })
    }
  })

  // SDK: 获取设备截图
  app.get('/api/sdk/devices/:serverId/:deviceName/screenshot', authRequired, async (req, res) => {
    try {
      const cfg = getServerConfig(req.params.serverId)
      const sdkClient = getSdkClient(req.params.serverId, cfg)
      const deviceName = decodeURIComponent(req.params.deviceName)
      const screenshot = await sdkClient.getScreenshot(deviceName)
      res.json(screenshot)
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // SDK: 批量截图 (用于多画面预览)
  app.post('/api/sdk/devices/:serverId/screenshots', authRequired, async (req, res) => {
    try {
      const cfg = getServerConfig(req.params.serverId)
      const sdkClient = getSdkClient(req.params.serverId, cfg)
      const { deviceNames = [] } = req.body || {}
      // 并行截图，避免单个设备超时阻塞全部
      const tasks = deviceNames.map(async (name) => {
        try {
          const shot = await sdkClient.getScreenshot(name)
          return [name, shot]
        } catch (e) {
          return [name, { error: e.message }]
        }
      })
      const settled = await Promise.allSettled(tasks)
      const results = {}
      for (const s of settled) {
        if (s.status === 'fulfilled') {
          results[s.value[0]] = s.value[1]
        }
      }
      res.json(results)
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // SDK: RPA 操作通用接口
  // 实际请求通过 SDK 暴露的设备控制端口（30200+instanceNum）以设备级 API 格式发送
  app.post('/api/sdk/devices/:serverId/:deviceName/rpa', authRequired, async (req, res) => {
    try {
      const cfg = getServerConfig(req.params.serverId)
      const sdkClient = getSdkClient(req.params.serverId, cfg)
      const { action, x, y, x1, y1, x2, y2, duration, keycode, text, packageName, command, rotation, host } = req.body || {}
      const deviceName = decodeURIComponent(req.params.deviceName)

      let result
      switch (action) {
        case 'click':
          result = await sdkClient.rpaClick(deviceName, x, y, host)
          break
        case 'swipe':
          result = await sdkClient.rpaSwipe(deviceName, x1, y1, x2, y2, duration, host)
          break
        case 'keyevent':
          result = await sdkClient.rpaKeyevent(deviceName, keycode, host)
          break
        case 'text':
          result = await sdkClient.rpaType(deviceName, text, host)
          break
        case 'touch':
          result = await sdkClient.rpaTouch(deviceName, x, y, req.body?.touchAction, host)
          break
        case 'open_app':
          result = await sdkClient.rpaOpenApp(deviceName, packageName, host)
          break
        case 'stop_app':
          result = await sdkClient.rpaStopApp(deviceName, packageName, host)
          break
        case 'shell':
          result = await sdkClient.rpaShell(deviceName, command, host)
          break
        case 'screenshot':
          result = await sdkClient.rpaScreenshot(deviceName, host)
          break
        case 'rotation':
          result = await sdkClient.rpaRotation(deviceName, rotation, host)
          break
        default:
          return res.status(400).json({ message: `未知操作: ${action}` })
      }
      res.json({ ok: true, result })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // SDK: 开启 Docker API 端口
  app.post('/api/sdk/servers/:serverId/docker-api', authRequired, async (req, res) => {
    try {
      const cfg = getServerConfig(req.params.serverId)
      const sdkClient = getSdkClient(req.params.serverId, cfg)
      const { enable = true } = req.body || {}
      const result = await sdkClient.enableDockerApi(enable)
      res.json({ ok: true, result })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // ============================
  // 容器级 API (MYT_ANDROID_API)
  // ============================

  // 探测指定服务器的容器（非桥接模式批量扫描 index 1..maxIndex）
  app.get('/api/containers/discover', authRequired, async (req, res) => {
    try {
      const { host, maxIndex = 12, mode = 'non-bridge', concurrency = 6 } = req.query
      if (!host) return res.status(400).json({ message: 'host 必填' })
      const containers = await discoverContainers(host, parseInt(maxIndex, 10), mode, {
        concurrency: parseInt(concurrency, 10),
      })
      res.json(containers)
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 计算容器端口 (工具接口)
  app.get('/api/containers/ports', authRequired, (req, res) => {
    try {
      const { index = 1, mode = 'non-bridge' } = req.query
      res.json(computeContainerPorts(parseInt(index, 10), mode))
    } catch (e) {
      res.status(500).json({ message: e.message })
    }
  })

  // 聚合所有服务器上的容器级设备 (遍历 SDK/Docker 服务器, 尝试容器级 API)
  app.get('/api/containers', authRequired, async (_req, res) => {
    const allServers = getServers()
    if (allServers.length === 0) return res.json([])
    const results = []
    for (const srv of allServers) {
      const cfg = getServerConfig(srv.id)
      // 默认非桥接模式, 扫描 1..12
      const mode = cfg?.containerMode || 'non-bridge'
      try {
        const containers = await discoverContainers(srv.host, 12, mode, { concurrency: 6, timeout: 1500 })
        for (const c of containers) {
          results.push({
            id: `${srv.id}_${c.index}`,
            name: c.name || `container_${c.index}`,
            status: c.available ? '运行中' : '离线',
            state: c.available ? 'online' : 'offline',
            instance: c.index,
            mode,
            containerHost: c.available ? c.hostIp || srv.host : srv.host,
            containerIp: c.hostIp || '',
            ports: c.ports,
            serverId: srv.id,
            serverLabel: srv.label,
            serverHost: srv.host,
            buildTime: c.buildTime || '',
            available: c.available,
            error: c.error || '',
          })
        }
      } catch (e) {
        for (let i = 1; i <= 12; i++) {
          results.push({
            id: `${srv.id}_${i}`,
            name: `container_${i}`,
            status: '离线',
            state: 'error',
            instance: i,
            mode,
            serverId: srv.id,
            serverLabel: srv.label,
            serverHost: srv.host,
            available: false,
            error: e.message,
          })
        }
      }
    }
    res.json(results)
  })

  // 获取单个容器信息
  app.get('/api/containers/:host/:index/info', authRequired, async (req, res) => {
    try {
      const { host, index } = req.params
      const { mode = 'non-bridge' } = req.query
      const client = createMytContainerClient({ host, index: parseInt(index, 10), mode })
      const result = await client.getInfo()
      res.json(result)
    } catch (e) {
      res.status(500).json({ message: e.message })
    }
  })

  // 获取容器版本
  app.get('/api/containers/:host/:index/version', authRequired, async (req, res) => {
    try {
      const { host, index } = req.params
      const { mode = 'non-bridge' } = req.query
      const client = createMytContainerClient({ host, index: parseInt(index, 10), mode })
      const result = await client.getVersion()
      res.json(result)
    } catch (e) {
      res.status(500).json({ message: e.message })
    }
  })

  // 容器截图
  app.get('/api/containers/:host/:index/screenshot', authRequired, async (req, res) => {
    try {
      const { host, index } = req.params
      const { mode = 'non-bridge' } = req.query
      const client = createMytContainerClient({ host, index: parseInt(index, 10), mode })
      const result = await client.screenshot()
      if (!result?.data) return res.status(500).json({ message: '截图失败: 无数据' })
      res.setHeader('Content-Type', result.contentType || 'image/jpeg')
      res.setHeader('Content-Length', result.data.length)
      res.setHeader('Cache-Control', 'no-store')
      res.send(result.data)
    } catch (e) {
      res.status(500).json({ message: e.message })
    }
  })

  // 批量截图 (多画面预览)
  app.post('/api/containers/screenshots', authRequired, async (req, res) => {
    try {
      const { targets = [] } = req.body || {}
      // targets: [{ host, index, mode }]
      const results = {}
      const concurrency = 4
      const pool = [...targets]
      async function worker() {
        while (pool.length > 0) {
          const t = pool.shift()
          if (!t) break
          const key = `${t.host}_${t.index}`
          try {
            const client = createMytContainerClient({ host: t.host, index: parseInt(t.index, 10), mode: t.mode || 'non-bridge' })
            const r = await client.screenshot()
            results[key] = r?.data ? {
              data: r.data.toString('base64'),
              contentType: r.contentType,
            } : { error: '截图失败' }
          } catch (e) {
            results[key] = { error: e.message }
          }
        }
      }
      const workers = Array.from({ length: Math.min(concurrency, targets.length) }, () => worker())
      await Promise.all(workers)
      res.json(results)
    } catch (e) {
      res.status(500).json({ message: e.message })
    }
  })

  // 容器操作 (点击/滑动/按键/输入等)
  app.post('/api/containers/:host/:index/action', authRequired, async (req, res) => {
    try {
      const { host, index } = req.params
      const { mode = 'non-bridge' } = req.query
      const { action, ...params } = req.body || {}
      const client = createMytContainerClient({ host, index: parseInt(index, 10), mode })
      let result
      switch (action) {
        case 'click':
          result = await client.click(params.x, params.y)
          break
        case 'swipe':
          result = await client.swipe(params.x1, params.y1, params.x2, params.y2, params.duration)
          break
        case 'keyevent':
          result = await client.keyevent(params.keycode)
          break
        case 'input':
          result = await client.inputText(params.text)
          break
        case 'longpress':
          result = await client.longPress(params.x, params.y, params.duration)
          break
        case 'doubleclick':
          result = await client.doubleClick(params.x, params.y)
          break
        case 'touch':
          result = await client.touch(params.x, params.y, params.touchAction || 'down')
          break
        case 'screenshot':
          result = await client.screenshot()
          break
        case 'info':
          result = await client.getInfo()
          break
        case 'version':
          result = await client.getVersion()
          break
        case 'apps':
          result = await client.listApps()
          break
        case 'start_app':
          result = await client.startApp(params.packageName)
          break
        case 'stop_app':
          result = await client.stopApp(params.packageName)
          break
        case 'install_apk':
          result = await client.installApk(params.path)
          break
        case 'uninstall_app':
          result = await client.uninstallApp(params.packageName)
          break
        case 'contacts':
          result = await client.listContacts()
          break
        case 'send_sms':
          result = await client.sendSms(params.phone, params.text)
          break
        case 'call':
          result = await client.makeCall(params.phone)
          break
        case 'clipboard_get':
          result = await client.getClipboard()
          break
        case 'clipboard_set':
          result = await client.setClipboard(params.text)
          break
        case 'config':
          result = await client.getConfig()
          break
        case 'fingerprint':
          result = await client.getFingerprint()
          break
        case 'proxy_set':
          result = await client.setProxy(params.proxyHost, params.proxyPort)
          break
        case 'proxy_clear':
          result = await client.clearProxy()
          break
        case 'virtual_camera':
          result = await client.setVirtualCamera(params.on !== false)
          break
        case 'cast':
          result = await client.getCastUrl()
          break
        case 'download':
          result = await client.downloadFile(params.path)
          break
        case 'list_files':
          result = await client.listFiles(params.path)
          break
        case 'delete_file':
          result = await client.deleteFile(params.path)
          break
        case 'reboot':
          result = await client.reboot()
          break
        case 'shutdown':
          result = await client.shutdown()
          break
        case 'battery':
          result = await client.getBattery()
          break
        case 'volume':
          result = await client.getVolume()
          break
        case 'rotate':
          result = await client.rotate(params.duration || 0)
          break
        case 'network':
          result = await client.getNetwork()
          break
        case 'location':
          result = await client.getLocation()
          break
        case 'ping':
          result = { available: await client.ping() }
          break
        default:
          return res.status(400).json({ message: `未知操作: ${action}` })
      }
      if (result && result.data && Buffer.isBuffer(result.data)) {
        // 二进制数据 (如下载文件、截图)
        res.setHeader('Content-Type', result.contentType || 'application/octet-stream')
        res.send(result.data)
      } else {
        res.json({ ok: true, result })
      }
    } catch (e) {
      res.status(500).json({ message: e.message })
    }
  })

  // 容器批量操作
  app.post('/api/containers/batch-action', authRequired, async (req, res) => {
    try {
      const { targets = [], action, ...params } = req.body || {}
      if (!targets.length || !action) {
        return res.status(400).json({ message: 'targets 和 action 必填' })
      }
      const results = {}
      const concurrency = 4
      const pool = [...targets]
      async function worker() {
        while (pool.length > 0) {
          const t = pool.shift()
          if (!t) break
          const key = `${t.host}_${t.index}`
          try {
            const client = createMytContainerClient({ host: t.host, index: parseInt(t.index, 10), mode: t.mode || 'non-bridge' })
            let r
            switch (action) {
              case 'click': r = await client.click(params.x, params.y); break
              case 'swipe': r = await client.swipe(params.x1, params.y1, params.x2, params.y2, params.duration); break
              case 'keyevent': r = await client.keyevent(params.keycode); break
              case 'input': r = await client.inputText(params.text); break
              case 'longpress': r = await client.longPress(params.x, params.y, params.duration); break
              case 'doubleclick': r = await client.doubleClick(params.x, params.y); break
              case 'screenshot': r = await client.screenshot(); break
              case 'info': r = await client.getInfo(); break
              case 'apps': r = await client.listApps(); break
              case 'reboot': r = await client.reboot(); break
              case 'shutdown': r = await client.shutdown(); break
              case 'battery': r = await client.getBattery(); break
              case 'volume': r = await client.getVolume(); break
              case 'rotate': r = await client.rotate(params.duration || 0); break
              case 'network': r = await client.getNetwork(); break
              case 'location': r = await client.getLocation(); break
              case 'contacts': r = await client.listContacts(); break
              case 'fingerprint': r = await client.getFingerprint(); break
              case 'config': r = await client.getConfig(); break
              case 'ping': r = { available: await client.ping() }; break
              default: r = { ok: false, error: `未知操作: ${action}` }
            }
            results[key] = { ok: true, result: r?.data && Buffer.isBuffer(r.data) ? { base64: r.data.toString('base64'), contentType: r.contentType } : r }
          } catch (e) {
            results[key] = { ok: false, error: e.message }
          }
        }
      }
      const workers = Array.from({ length: Math.min(concurrency, targets.length) }, () => worker())
      await Promise.all(workers)
      res.json({ results })
    } catch (e) {
      res.status(500).json({ message: e.message })
    }
  })

  // ============================
  // 摄像头推流 API (RTMP 模式)
  // 流程：set_cam_stream 设置推流地址 → camera 热启动 → WebSocket 推流 → ffmpeg 转 RTMP
  // ============================

  // 开启虚拟摄像头
  app.post('/api/camera/:host/:index/start', authRequired, async (req, res) => {
    try {
      const { host, index } = req.params
      const idx = parseInt(index, 10)
      const ports = computeContainerPorts(idx, 'non-bridge')

      // 1. 通过旧版容器 API 开启虚拟摄像头（兼容）
      try {
        await setContainerCamera(host, ports.api, true)
        console.log(`[摄像头] 容器 API 已开启虚拟摄像头: ${host}:${ports.api}`)
      } catch (e) {
        console.warn(`[摄像头] 容器 API 开启失败 (非致命): ${e.message}`)
      }

      // 2. 获取容器全名（通过 SDK）
      let containerName = null
      try {
        containerName = await getContainerFullName(SDK_HOST, host, idx)
        console.log(`[摄像头] 容器全名: ${containerName}`)
      } catch (e) {
        console.warn(`[摄像头] 获取容器全名失败: ${e.message}`)
      }

      // 3. 生成推流 token 和 RTMP 地址（指向本地 node-media-server）
      const token = `cam_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const streamKey = token
      const rtmpUrl = `rtmp://${LAN_IP}:${RTMP_PORT}/live/${streamKey}`

      cameraSessions.set(token, {
        host,
        index: idx,
        containerName,
        rtmpUrl,
        streamKey,
        ffmpeg: null,
        sdkHost: SDK_HOST,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        frameCount: 0,
      })

      // 4. 通过 set_cam_stream 设置推流地址和类型 (v_type=1 RTMP)
      // 注意：camera 热启动会在 WebSocket 推流开始后自动调用（此时 RTMP 服务器才有流可拉）
      if (containerName) {
        try {
          await setCamStream(SDK_HOST, host, containerName, rtmpUrl, 1)
          console.log(`[摄像头] 推流地址已设置: ${rtmpUrl}`)
        } catch (e) {
          console.warn(`[摄像头] 设置推流地址失败 (非致命): ${e.message}`)
        }
      }

      res.json({
        code: 200,
        data: {
          token,
          streamKey,
          rtmpUrl,
          wsUrl: '/api/camera/ws',
          qrcodeUrl: `/api/camera/qrcode?token=${token}`,
          host,
          index: idx,
          containerName,
          lanIp: LAN_IP,
          lanPort: parseInt(process.env.FRONTEND_PORT || '5173', 10),
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
      const idx = parseInt(index, 10)
      const ports = computeContainerPorts(idx, 'non-bridge')

      // 关闭所有相关会话
      for (const [token, session] of cameraSessions.entries()) {
        if (session.host === host && session.index === idx) {
          await stopSession(token, SDK_HOST)
        }
      }

      // 通过旧版容器 API 关闭虚拟摄像头
      try {
        await setContainerCamera(host, ports.api, false)
      } catch (e) {
        console.warn(`[摄像头] 容器 API 关闭失败: ${e.message}`)
      }

      res.json({ code: 200, message: '摄像头已关闭' })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })

  // 获取摄像头状态
  app.get('/api/camera/:host/:index/status', authRequired, async (req, res) => {
    try {
      const { host, index } = req.params
      const idx = parseInt(index, 10)

      const activeSession = [...cameraSessions.values()].find(
        (s) => s.host === host && s.index === idx
      )

      // 如果有活跃会话，尝试从 SDK 获取真实推流状态
      let streamInfo = null
      if (activeSession?.containerName) {
        try {
          streamInfo = await getCamStream(SDK_HOST, host, activeSession.containerName)
        } catch (e) {
          console.warn(`[摄像头] 获取推流状态失败: ${e.message}`)
        }
      }

      res.json({
        code: 200,
        data: {
          active: !!activeSession,
          frameCount: activeSession?.frameCount || 0,
          rtmpUrl: activeSession?.rtmpUrl || null,
          streamInfo: streamInfo || null,
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

      res.json({
        code: 200,
        data: {
          token,
        },
      })
    } catch (e) {
      res.status(500).json({ code: 500, message: e.message })
    }
  })
}

// 把 SDK 设备列表转成前端期望的格式
function transformSdkDevices(list, serverId, serverLabel, serverHost) {
  return (list || []).map((d) => {
    const name = d.name || d.Name || `dev_${d.instance || d.instanceNum || ''}`
    const instanceNum = d.instance || d.instanceNum || parseInt((name.match(/_(\d+)$/) || [])[1] || '0')
    const state = d.state || d.State || (d.running ? 'running' : 'stopped')
    const status = state === 'running' ? '运行中' : '已停止'
    const adbPort = 30200 + instanceNum

    // 从 Docker 端口映射提取真实的 9082 公网端口（RPA/截图用）
    let rpaPort = adbPort
    if (c.Ports) {
      const port9082 = c.Ports.find(p => p.PrivatePort === 9082 && p.PublicPort)
      if (port9082) rpaPort = port9082.PublicPort
    }

    return {
      id: name,
      name,
      status,
      state,
      image: d.image || d.Image || d.romVersion || '',
      imageId: d.imageId || '',
      ip: d.ip || d.host || serverHost,
      adbPort,
      instanceNum,
      lastActive: d.status || d.State || '',
      created: d.created ? new Date(d.created).getTime() : Date.now(),
      serverId,
      serverLabel,
      serverHost,
      brand: d.brand || '',
      model: d.model || '',
      androidVersion: d.androidVersion || d.android_version || '',
      // SDK 特有字段
      mode: 'sdk',
      sdkData: d,
    }
  })
}

// 把 Docker 容器列表转成 SDK 设备格式（从 Docker API 获取的设备）
function transformSdkDevicesFromDocker(containers, serverId, serverLabel, serverHost) {
  return (containers || []).map((c) => {
    // 从容器名解析实例号 (格式通常为: container_0, container_1 等)
    const rawName = (c.Names && c.Names[0] || '').replace(/^\//, '')
    const instanceMatch = rawName.match(/(\d+)$/)
    const instanceNum = instanceMatch ? parseInt(instanceMatch[1]) : 0
    const state = c.State || 'unknown'
    const statusMap = {
      running: '运行中',
      exited: '已停止',
      created: '已停止',
      paused: '已停止',
      restarting: '运行中',
      removing: '已停止',
      dead: '离线',
    }
    const status = statusMap[state] || '离线'
    const adbPort = 30200 + instanceNum
    const rpaPort = (c.Ports || []).reduce((found, p) => {
      if (found) return found
      return p.PrivatePort === 9082 ? p.PublicPort : null
    }, null) || (30200 + instanceNum)

    // 使用服务器 IP（容器内部 Docker 网络 IP 不可用于 RPA 操作）
    const ip = serverHost

    return {
      id: rawName || c.Id,
      name: rawName || `device_${instanceNum}`,
      status,
      state,
      image: c.Image || '',
      imageId: c.ImageID || '',
      ip,
      adbPort,
      instanceNum,
      lastActive: c.Status || '',
      created: c.Created ? c.Created * 1000 : Date.now(),
      serverId,
      serverLabel,
      serverHost,
      // SDK 特有字段
      mode: 'sdk',
      containerId: c.Id,
      ports: c.Ports || [],
      rpaPort,
      sizeRw: c.SizeRw,
      sizeRootFs: c.SizeRootFs,
    }
  })
}

// 把 Docker 容器列表转成前端期望的格式
function transformContainers(list, serverId, serverLabel, serverHost) {
  return (list || []).map((c) => {
    const name = (c.Names && c.Names[0] || '').replace(/^\//, '')
    const state = c.State || 'unknown'
    const status = ({
      running: '运行中',
      exited: '已停止',
      created: '已停止',
      paused: '已停止',
      restarting: '运行中',
      removing: '已停止',
      dead: '离线',
    })[state] || '离线'

    return {
      id: c.Id,
      name: name || c.Id.slice(0, 12),
      status,
      state,
      image: c.Image,
      imageId: c.ImageID,
      ip: (c.NetworkSettings?.Networks && Object.values(c.NetworkSettings.Networks)[0]?.IPAddress) || '',
      ports: c.Ports || [],
      lastActive: c.Status || '',
      created: c.Created * 1000,
      // 多服务器字段
      serverId,
      serverLabel,
      serverHost,
    }
  })
}

function transformImages(list, serverId, serverLabel) {
  return (list || []).map((img) => {
    const tags = img.RepoTags || []
    const tag = tags.find((t) => t && t !== '<none>:<none>') || (tags[0] || '<none>:<none>')
    const [name, version] = tag.split(':')
    return {
      id: img.Id,
      name: name || '<none>',
      version: version || '<none>',
      tags,
      size: formatSize(img.Size),
      created: img.Created * 1000,
      virtualSize: img.VirtualSize,
      serverId,
      serverLabel,
    }
  })
}

function formatSize(bytes) {
  if (!bytes) return '0B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(1)}${units[i]}`
}