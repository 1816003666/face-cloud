// 魔云腾虚拟摄像头推流客户端（重写版）
// 正确流程：set_cam_stream 设置推流地址和类型 → camera?action=start 热启动虚拟摄像头
// 推流链路：手机/浏览器 → WebSocket → ffmpeg 转 RTMP → node-media-server (1936) → 云手机拉流
//
// 核心API（来自 http://127.0.0.1:5000/openapi.json）：
//   POST /and_api/v1/set_cam_stream/{ip}/{name}/{v_type}  设置推流地址和类型
//     v_type: 1=RTMP流/本地视频  2=WebRTC流  3=本地/网络图片
//     body: {"addr": "rtmp://..."}
//     query: resolution=1(1920x1080@30) | 2(1280x720@30)
//   GET  /and_api/v1/camera/{ip}/{name}?action=start|stop  虚拟摄像头热启动/停止
//   GET  /and_api/v1/get_cam_stream/{ip}/{name}  获取当前推流地址和类型

import { spawn } from 'node:child_process'
import http from 'node:http'
import NodeMediaServer from 'node-media-server'

// 完整版 ffmpeg 路径（支持 RTMP + pipe）
const FFMPEG_PATH = process.env.FFMPEG_PATH || findFfmpeg()

function findFfmpeg() {
  const candidates = [
    'C:\\Users\\HS\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe',
    'ffmpeg',
  ]
  return candidates[0]
}

// RTMP 服务器端口（1935 被魔云腾 SDK 占用，1936 可能被其他进程占用，使用 1937）
const RTMP_PORT = parseInt(process.env.RTMP_PORT || '1937', 10)

let rtmpServerInstance = null

/**
 * 启动 node-media-server 作为 RTMP 接收服务器
 * 云手机从该服务器拉流作为虚拟摄像头画面
 */
export function startRtmpServer() {
  if (rtmpServerInstance) {
    console.log(`[RTMP] 服务器已在运行 (端口 ${RTMP_PORT})`)
    return rtmpServerInstance
  }

  const config = {
    rtmp: {
      port: RTMP_PORT,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60,
    },
    http: {
      port: 8002,
      allow_origin: '*',
    },
  }

  rtmpServerInstance = new NodeMediaServer(config)
  rtmpServerInstance.on('prePublish', (id, streamPath) => {
    console.log(`[RTMP] 推流连接: id=${id} path=${streamPath}`)
  })
  rtmpServerInstance.on('donePublish', (id, streamPath) => {
    console.log(`[RTMP] 推流断开: id=${id} path=${streamPath}`)
  })
  rtmpServerInstance.run()
  console.log(`[RTMP] node-media-server 已启动 (RTMP 端口 ${RTMP_PORT}, HTTP 端口 8002)`)
  return rtmpServerInstance
}

/**
 * 获取魔云腾 SDK 管理的容器全名
 * SDK 返回的容器名格式: {timestamp}_{index}_T{xxxx}
 * @param {string} sdkHost - SDK 服务地址 (如 127.0.0.1:5000)
 * @param {string} hostIp - 宿主机 IP
 * @param {number} index - 实例位号
 * @returns {Promise<string>} 容器全名
 */
export async function getContainerFullName(sdkHost, hostIp, index) {
  const url = `http://${sdkHost}/get/${hostIp}`
  const data = await httpGet(url)
  if (data.code !== 200 || !Array.isArray(data.msg)) {
    throw new Error(`获取容器列表失败: ${data.message || '未知错误'}`)
  }
  const container = data.msg.find((c) => c.index === index && c.State === 'running')
  if (!container) {
    throw new Error(`未找到运行中的容器 (index=${index})`)
  }
  return container.Names
}

/**
 * 设置摄像头推流地址和类型（核心接口）
 * POST /and_api/v1/set_cam_stream/{ip}/{name}/{v_type}
 * @param {string} sdkHost - SDK 服务地址
 * @param {string} hostIp - 宿主机 IP
 * @param {string} containerName - 容器全名
 * @param {string} addr - 资源地址 (rtmp://... 或本地文件路径)
 * @param {number} vType - 1=RTMP流  2=WebRTC流  3=图片
 * @param {number} [resolution] - 1=1920x1080@30  2=1280x720@30（不传则使用默认）
 * @returns {Promise<object>}
 */
export async function setCamStream(sdkHost, hostIp, containerName, addr, vType = 1, resolution) {
  let url = `http://${sdkHost}/and_api/v1/set_cam_stream/${hostIp}/${containerName}/${vType}`
  // resolution 参数可能导致 SDK 内部错误，仅在明确指定时传递
  if (resolution !== undefined && resolution !== null) {
    url += `?resolution=${resolution}`
  }
  console.log(`[摄像头] 设置推流地址: POST ${url} addr=${addr}`)
  const data = await httpPostJson(url, { addr })
  if (data.code !== 200) {
    throw new Error(`设置推流地址失败: code=${data.code} message=${data.message || data.msg}`)
  }
  console.log(`[摄像头] 推流地址设置成功: code=${data.code}`)
  return data
}

/**
 * 获取当前摄像头推流地址和类型
 * GET /and_api/v1/get_cam_stream/{ip}/{name}
 * @param {string} sdkHost - SDK 服务地址
 * @param {string} hostIp - 宿主机 IP
 * @param {string} containerName - 容器全名
 * @returns {Promise<object>} { code, message, data }
 *   code: 200=正常  201=未启动或超时  2=容器不存在  1=主机不通  3=获取失败
 */
export async function getCamStream(sdkHost, hostIp, containerName) {
  const url = `http://${sdkHost}/and_api/v1/get_cam_stream/${hostIp}/${containerName}`
  const data = await httpGet(url)
  return data
}

/**
 * 虚拟摄像头热启动/停止
 * GET /and_api/v1/camera/{ip}/{name}?action=start|stop
 * @param {string} sdkHost - SDK 服务地址
 * @param {string} hostIp - 宿主机 IP
 * @param {string} containerName - 容器全名
 * @param {'start'|'stop'} action - 启动/停止
 * @param {string} [path] - 首次启动需要传 rtmp 地址，后续可不传
 * @returns {Promise<object>}
 */
export async function cameraHotStart(sdkHost, hostIp, containerName, action, path) {
  let url = `http://${sdkHost}/and_api/v1/camera/${hostIp}/${containerName}?action=${action}`
  if (path) {
    url += `&path=${encodeURIComponent(path)}`
  }
  console.log(`[摄像头] 虚拟摄像头${action === 'start' ? '热启动' : '停止'}: GET ${url}`)
  const data = await httpGet(url)
  if (data.code !== 200) {
    throw new Error(`虚拟摄像头${action}失败: code=${data.code} message=${data.message || data.msg}`)
  }
  console.log(`[摄像头] 虚拟摄像头${action}成功: code=${data.code}`)
  return data
}

/**
 * 通过旧版容器 API 开启/关闭虚拟摄像头（兼容接口）
 * GET /?task=camera&on=true/false
 * @param {string} host - 宿主机 IP
 * @param {number} apiPort - 容器 API 端口
 * @param {boolean} on - 开启/关闭
 */
export async function setContainerCamera(host, apiPort, on) {
  const url = `http://${host}:${apiPort}/?task=camera&on=${on}`
  try {
    await httpGet(url)
  } catch (e) {
    console.warn(`[摄像头] 旧版容器API调用失败 (非致命): ${e.message}`)
  }
}

/**
 * 创建 ffmpeg 进程，将 WebSocket 传来的 JPEG 帧流转为 RTMP 流
 * 前端使用 Canvas 逐帧捕获发送 JPEG 图片
 * @param {string} rtmpUrl - RTMP 推流目标地址
 * @returns {import('child_process').ChildProcess}
 */
export function createFfmpegTranscoder(rtmpUrl) {
  const args = [
    '-f', 'image2pipe',                 // 输入格式：图片管道
    '-vcodec', 'mjpeg',                 // 输入编码：MJPEG（JPEG 序列）
    '-i', '-',                          // 从 stdin 读取
    '-c:v', 'libx264',                  // 视频编码 H.264
    '-preset', 'ultrafast',             // 最快编码速度
    '-tune', 'zerolatency',             // 零延迟
    '-pix_fmt', 'yuv420p',              // 像素格式兼容性
    '-f', 'flv',                        // 输出 FLV 格式（RTMP 要求）
    '-flvflags', 'no_duration_filesize',
    '-r', '5',                          // 帧率 5fps（前端每 200ms 一帧）
    '-g', '10',                         // GOP
    '-s', '480x360',                    // 分辨率
    '-b:v', '300k',                     // 视频码率
    '-an',                              // 无音频
    rtmpUrl,                            // RTMP 输出地址
  ]

  console.log(`[FFmpeg] 启动转码到 ${rtmpUrl}`)
  console.log(`[FFmpeg] 命令: ${FFMPEG_PATH} ${args.join(' ')}`)

  const ffmpeg = spawn(FFMPEG_PATH, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let stderrBuffer = ''
  ffmpeg.stderr.on('data', (data) => {
    const msg = data.toString()
    stderrBuffer += msg
    // 打印所有 stderr 输出（ffmpeg 诊断信息在 stderr）
    if (msg.includes('Error') || msg.includes('error') || msg.includes('Invalid')) {
      console.error(`[FFmpeg] ${msg.trim()}`)
    } else {
      // 打印关键信息（编码器、流信息等）
      const lines = msg.split('\n').filter(l => l.trim())
      for (const line of lines) {
        if (line.includes('Stream') || line.includes('frame=') || line.includes('Press') || line.includes('Duration')) {
          console.log(`[FFmpeg] ${line.trim()}`)
        }
      }
    }
  })

  ffmpeg.on('close', (code) => {
    console.log(`[FFmpeg] 进程退出，code=${code}`)
    if (code !== 0 && stderrBuffer) {
      console.error(`[FFmpeg] 最后输出: ${stderrBuffer.slice(-500)}`)
    }
  })

  ffmpeg.on('error', (err) => {
    console.error(`[FFmpeg] 启动失败:`, err.message)
  })

  return ffmpeg
}

// ============================
// HTTP 工具函数
// ============================

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          resolve({ code: -1, message: `JSON 解析失败: ${body.substring(0, 200)}` })
        }
      })
    }).on('error', (err) => {
      reject(err)
    })
  })
}

function httpPostJson(url, bodyObj) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const bodyStr = JSON.stringify(bodyObj || {})
    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => { body += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(body))
          } catch {
            resolve({ code: -1, message: `JSON 解析失败: ${body.substring(0, 200)}` })
          }
        })
      }
    )
    req.on('error', (err) => reject(err))
    req.write(bodyStr)
    req.end()
  })
}

// ============================
// 摄像头会话管理
// ============================

/**
 * 活跃的摄像头会话管理
 * token -> { host, index, containerName, rtmpUrl, streamKey, ffmpeg, sdkHost, createdAt, lastActivity, frameCount }
 */
export const cameraSessions = new Map()

/**
 * 清理过期会话 (超过 30 分钟未活动)
 */
export function cleanupExpiredSessions() {
  const now = Date.now()
  const maxAge = 30 * 60 * 1000

  for (const [token, session] of cameraSessions.entries()) {
    if (now - (session.lastActivity || session.createdAt) > maxAge) {
      console.log(`[摄像头] 清理过期会话: ${token}`)
      stopSession(token, session.sdkHost)
    }
  }
}

/**
 * 停止指定会话
 * @param {string} token - 会话 token
 * @param {string} [sdkHost] - SDK 服务地址（用于停止虚拟摄像头）
 */
export async function stopSession(token, sdkHost) {
  const session = cameraSessions.get(token)
  if (!session) return

  // 1. 停止虚拟摄像头
  if (sdkHost && session.containerName) {
    try {
      await cameraHotStart(sdkHost, session.host, session.containerName, 'stop')
    } catch (e) {
      console.warn(`[摄像头] 停止虚拟摄像头失败 (非致命): ${e.message}`)
    }
  }

  // 2. 杀掉 ffmpeg 进程
  if (session.ffmpeg && !session.ffmpeg.killed) {
    try {
      session.ffmpeg.stdin.end()
    } catch { /* 忽略 */ }
    session.ffmpeg.kill('SIGTERM')
    session.ffmpeg = null
  }

  cameraSessions.delete(token)
}

setInterval(cleanupExpiredSessions, 60 * 1000)
