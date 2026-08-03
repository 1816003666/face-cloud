// 魔云腾容器级 API 客户端 (基于 MYT_ANDROID_API 文档)
// 参考: https://dev.moyunteng.com/docs/NewMYTOS/MYT_ANDROID_API
//
// 支持两种端口模式:
//   1. 桥接模式 (bridge) - 每个容器独立 IP, 固定端口: 10000-10008, 9082-9083
//   2. 非桥接模式 (NAT/non-bridge) - 共享宿主 IP, 端口按 index 计算:
//      端口公式: 30000 + (index-1)*100 + offset
//      offset: 0=ADB, 1=API, 2=RPA, 3=投屏TCP, 4=控制UDP, 5=摄像头TCP, 6=摄像头UDP, 7=webRTC TCP, 8=webRTC UDP

import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

const DEFAULT_TIMEOUT = 10000

/**
 * 根据实例位 (index) 和模式计算容器各端口
 * @param {number} index 实例位 (1-based)
 * @param {'bridge'|'non-bridge'} mode
 * @returns {object} 各功能对应的端口号
 */
export function computeContainerPorts(index, mode = 'non-bridge') {
  if (mode === 'bridge') {
    return {
      adb: 5555,
      api: 9082,
      rpa: 9083,
      cast: 10000,
      control: 10001,
      cameraTcp: 10006,
      cameraUdp: 10007,
      webrtcTcp: 10008,
      webrtcUdp: 10008,
      index,
      mode,
    }
  }
  const base = 30000 + (index - 1) * 100
  return {
    adb: base + 0,
    api: base + 1,
    rpa: base + 2,
    cast: base + 3,
    control: base + 4,
    cameraTcp: base + 5,
    cameraUdp: base + 6,
    webrtcTcp: base + 7,
    webrtcUdp: base + 8,
    index,
    mode: 'non-bridge',
  }
}

/**
 * 创建魔云腾容器级 API 客户端
 * @param {object} opts
 * @param {string} opts.host              容器 IP (非桥接模式下为宿主 IP)
 * @param {number} [opts.port=30001]      API 端口 (非桥接默认 30001)
 * @param {number} [opts.index=1]         实例位 (用于非桥接模式计算端口)
 * @param {'bridge'|'non-bridge'} [opts.mode='non-bridge']  端口模式
 * @param {number} [opts.timeout=10000]   请求超时
 */
export function createMytContainerClient(opts) {
  const { host, index = 1, mode = 'non-bridge', timeout = DEFAULT_TIMEOUT } = opts

  if (!host) {
    throw new Error('容器 IP (host) 未配置')
  }

  const ports = computeContainerPorts(index, mode)
  const apiPort = opts.port || ports.api

  /**
   * 通用 HTTP 请求
   */
  function request(path, { method = 'GET', port = apiPort, body, headers = {}, isBinaryOut = false, timeout: reqTimeout = timeout } = {}) {
    return new Promise((resolve, reject) => {
      const reqOptions = {
        host,
        port,
        method,
        path,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
      }

      const req = http.request(reqOptions, (res) => {
        if (isBinaryOut) {
          const chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => resolve({
            data: Buffer.concat(chunks),
            contentType: res.headers['content-type'] || '',
            statusCode: res.statusCode,
            headers: res.headers,
          }))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8')
          // 魔云腾 API 约定: 200=成功, 201=通用错误, 202=操作失败
          try {
            const json = JSON.parse(text)
            if (json.code !== undefined && json.code !== 200) {
              reject(new Error(`${json.error || json.reason || 'API 错误'} (code: ${json.code})`))
            } else {
              resolve(json)
            }
          } catch {
            resolve(text)
          }
        })
      })

      req.on('error', reject)
      req.setTimeout(reqTimeout, () => {
        req.destroy(new Error(`请求超时 (${reqTimeout}ms)`))
      })

      if (body !== undefined) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body))
      }
      req.end()
    })
  }

  /**
   * 构建 query string
   */
  function buildQuery(params = {}) {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    if (entries.length === 0) return ''
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  }

  return {
    host,
    index,
    mode,
    ports,
    apiPort,

    // ========================
    // 一、基础信息
    // ========================

    /**
     * 容器信息
     * GET /info -> { code, msg, data: { hostIp, instance, name, buildTime } }
     */
    async getInfo() {
      return request('/info')
    },

    /**
     * 版本查询
     * GET /queryversion -> { code, msg }
     */
    async getVersion() {
      return request('/queryversion')
    },

    // ========================
    // 二、文件操作
    // ========================

    /**
     * 下载文件
     * GET /?task=download&path={filepath}
     */
    async downloadFile(filepath) {
      if (!filepath) throw new Error('filepath 必填')
      return request(`/?task=download&path=${encodeURIComponent(filepath)}`, { isBinaryOut: true })
    },

    /**
     * 上传文件 (multipart/form-data)
     * POST /upload
     */
    async uploadFile(fileContent, filename = 'file') {
      const boundary = '----mytboundary' + Date.now()
      const payload = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="file"; filename="${filename}"`,
        'Content-Type: application/octet-stream',
        '',
      ].join('\r\n')
      const ending = `\r\n--${boundary}--\r\n`
      const body = Buffer.concat([
        Buffer.from(payload, 'utf8'),
        Buffer.isBuffer(fileContent) ? fileContent : Buffer.from(fileContent),
        Buffer.from(ending, 'utf8'),
      ])
      return request('/upload', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      })
    },

    /**
     * 通过 URL 上传文件
     * GET /?task=upload&file={url}
     */
    async uploadFileFromUrl(fileUrl) {
      if (!fileUrl) throw new Error('fileUrl 必填')
      return request(`/?task=upload&file=${encodeURIComponent(fileUrl)}`)
    },

    /**
     * 列出文件目录
     * GET /?task=file&cmd=list&path={path}
     */
    async listFiles(path = '/sdcard') {
      return request(`/?task=file&cmd=list&path=${encodeURIComponent(path)}`)
    },

    /**
     * 删除文件
     * GET /?task=file&cmd=delete&path={path}
     */
    async deleteFile(path) {
      if (!path) throw new Error('path 必填')
      return request(`/?task=file&cmd=delete&path=${encodeURIComponent(path)}`)
    },

    // ========================
    // 三、剪贴板操作
    // ========================

    /**
     * 获取剪贴板内容
     * GET /clipboard
     */
    async getClipboard() {
      return request('/clipboard')
    },

    /**
     * 设置剪贴板内容
     * GET /setclipboard?text={text}
     */
    async setClipboard(text) {
      if (text === undefined || text === null) throw new Error('text 必填')
      return request(`/setclipboard?text=${encodeURIComponent(text)}`)
    },

    // ========================
    // 四、屏幕与输入
    // ========================

    /**
     * 截图
     * GET /snapshot (直接访问, 返回 JPEG 二进制)
     */
    async screenshot() {
      return request('/snapshot', { isBinaryOut: true })
    },

    /**
     * 点击
     * GET /?task=click&x={x}&y={y}
     */
    async click(x, y) {
      return request(`/?task=click${buildQuery({ x, y })}`)
    },

    /**
     * 滑动
     * GET /?task=swipe&x1={x1}&y1={y1}&x2={x2}&y2={y2}&duration={duration}
     */
    async swipe(x1, y1, x2, y2, duration = 300) {
      return request(`/?task=swipe${buildQuery({ x1, y1, x2, y2, duration })}`)
    },

    /**
     * 按键
     * GET /?task=keyevent&keycode={keycode}
     */
    async keyevent(keycode) {
      return request(`/?task=keyevent${buildQuery({ keycode })}`)
    },

    /**
     * 长按
     * GET /?task=longpress&x={x}&y={y}&duration={duration}
     */
    async longPress(x, y, duration = 500) {
      return request(`/?task=longpress${buildQuery({ x, y, duration })}`)
    },

    /**
     * 双击
     * GET /?task=doubleclick&x={x}&y={y}
     */
    async doubleClick(x, y) {
      return request(`/?task=doubleclick${buildQuery({ x, y })}`)
    },

    /**
     * 文本输入
     * GET /?task=input&text={text}
     */
    async inputText(text) {
      return request(`/?task=input&text=${encodeURIComponent(text)}`)
    },

    /**
     * 触摸
     * GET /?task=touch&x={x}&y={y}&action={action}
     */
    async touch(x, y, action = 'down') {
      return request(`/?task=touch${buildQuery({ x, y, action })}`)
    },

    // ========================
    // 五、代理
    // ========================

    /**
     * 设置 HTTP 代理
     * GET /?task=proxy&host={host}&port={port}
     */
    async setProxy(hostname, port) {
      return request(`/?task=proxy${buildQuery({ host: hostname, port })}`)
    },

    /**
     * 清除代理
     * GET /?task=proxy_clear
     */
    async clearProxy() {
      return request('/?task=proxy_clear')
    },

    // ========================
    // 六、应用管理
    // ========================

    /**
     * 获取已安装应用列表
     * GET /?task=apps
     */
    async listApps() {
      return request('/?task=apps')
    },

    /**
     * 启动应用
     * GET /?task=app_start&package={packageName}
     */
    async startApp(packageName) {
      return request(`/?task=app_start&package=${encodeURIComponent(packageName)}`)
    },

    /**
     * 停止应用
     * GET /?task=app_stop&package={packageName}
     */
    async stopApp(packageName) {
      return request(`/?task=app_stop&package=${encodeURIComponent(packageName)}`)
    },

    /**
     * 安装 APK
     * GET /?task=app_install&path={apkPath}
     */
    async installApk(apkPath) {
      return request(`/?task=app_install&path=${encodeURIComponent(apkPath)}`)
    },

    /**
     * 卸载应用
     * GET /?task=app_uninstall&package={packageName}
     */
    async uninstallApp(packageName) {
      return request(`/?task=app_uninstall&package=${encodeURIComponent(packageName)}`)
    },

    // ========================
    // 七、通信与联系人
    // ========================

    /**
     * 获取联系人
     * GET /?task=contacts
     */
    async listContacts() {
      return request('/?task=contacts')
    },

    /**
     * 发送短信
     * GET /?task=sms&phone={phone}&text={text}
     */
    async sendSms(phone, text) {
      return request(`/?task=sms${buildQuery({ phone, text })}`)
    },

    /**
     * 拨打电话
     * GET /?task=call&phone={phone}
     */
    async makeCall(phone) {
      return request(`/?task=call&phone=${encodeURIComponent(phone)}`)
    },

    // ========================
    // 八、虚拟摄像头
    // ========================

    /**
     * 开启/关闭虚拟摄像头
     * GET /?task=camera&on={true|false}
     */
    async setVirtualCamera(on = true) {
      return request(`/?task=camera&on=${on}`)
    },

    // ========================
    // 九、设备配置与指纹
    // ========================

    /**
     * 获取设备配置
     * GET /?task=config
     */
    async getConfig() {
      return request('/?task=config')
    },

    /**
     * 设置设备配置
     * GET /?task=config&...params
     */
    async setConfig(params) {
      return request(`/?task=config${buildQuery(params)}`)
    },

    /**
     * 获取设备指纹
     * GET /?task=fingerprint
     */
    async getFingerprint() {
      return request('/?task=fingerprint')
    },

    // ========================
    // 十、投屏与播放器
    // ========================

    /**
     * 获取投屏地址
     * GET /?task=cast
     */
    async getCastUrl() {
      return request('/?task=cast')
    },

    // ========================
    // 十一、设备控制
    // ========================

    /**
     * 重启容器
     * GET /?task=reboot
     */
    async reboot() {
      return request('/?task=reboot')
    },

    /**
     * 关闭容器
     * GET /?task=shutdown
     */
    async shutdown() {
      return request('/?task=shutdown')
    },

    /**
     * 获取电池状态
     * GET /?task=battery
     */
    async getBattery() {
      return request('/?task=battery')
    },

    /**
     * 获取音量
     * GET /?task=volume
     */
    async getVolume() {
      return request('/?task=volume')
    },

    /**
     * 旋转屏幕
     * GET /?task=rotate&direction={0|1|2|3}
     */
    async rotate(direction = 0) {
      return request(`/?task=rotate&direction=${direction}`)
    },

    /**
     * 获取网络状态
     * GET /?task=network
     */
    async getNetwork() {
      return request('/?task=network')
    },

    /**
     * 获取位置
     * GET /?task=location
     */
    async getLocation() {
      return request('/?task=location')
    },

    // ========================
    // 实用方法
    // ========================

    /**
     * 测试容器连通性
     */
    async ping() {
      try {
        const r = await this.getInfo()
        return r.code === 200
      } catch {
        return false
      }
    },

    /**
     * 批量获取容器信息（用于设备列表聚合）
     */
    async getContainerSummary() {
      try {
        const info = await this.getInfo()
        const d = info.data || {}
        return {
          index,
          mode,
          host,
          ports,
          available: true,
          instance: d.instance || String(index),
          name: d.name || `container_${index}`,
          hostIp: d.hostIp || host,
          buildTime: d.buildTime || '',
          brand: d.brand || '',
          model: d.model || '',
          android_version: d.android_version || '',
          sn: d.sn || '',
          imei: d.imei || '',
        }
      } catch (e) {
        return {
          index,
          mode,
          host,
          ports,
          available: false,
          error: e.message,
        }
      }
    },
  }
}

/**
 * 探测指定 IP 上的所有魔云腾容器 (非桥接模式, index 1..maxIndex)
 * @param {string} host 宿主 IP
 * @param {number} [maxIndex=12] 最大实例位
 * @param {'bridge'|'non-bridge'} [mode='non-bridge'] 端口模式
 * @param {object} [opts]
 * @param {number} [opts.concurrency=6] 并发数
 * @param {number} [opts.timeout=1500] 单容器超时 (ms)
 */
export async function discoverContainers(host, maxIndex = 12, mode = 'non-bridge', opts = {}) {
  const { concurrency = 6, timeout = 1500 } = opts
  const results = []
  const pool = []

  async function worker() {
    while (pool.length > 0) {
      const index = pool.shift()
      if (!index) break
      const client = createMytContainerClient({ host, index, mode, timeout })
      const summary = await client.getContainerSummary()
      results.push(summary)
    }
  }

  for (let i = 1; i <= maxIndex; i++) pool.push(i)
  const workers = Array.from({ length: Math.min(concurrency, maxIndex) }, () => worker())
  await Promise.all(workers)

  return results.sort((a, b) => a.index - b.index)
}
