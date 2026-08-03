// 魔云腾 SDK HTTP API 客户端
// 通过魔云腾管理后台 HTTP API 获取设备列表和控制云手机
// 端口: 8000 (管理API) + 30200+index (单设备控制端口)

import http from 'node:http'
import https from 'node:https'

const MANAGEMENT_PORT = 8000
const DEVICE_PORT_BASE = 30200
const REQUEST_TIMEOUT = 15000

/**
 * 创建魔云腾 SDK 客户端
 * @param {object} opts
 * @param {string} opts.host        魔云腾服务器 IP
 * @param {number} [opts.port=8000] 管理端口
 * @param {string} [opts.username]  魔云腾后台用户名
 * @param {string} [opts.password]  魔云腾后台密码
 */
export function createMytSdkClient(opts) {
  const { host, port = MANAGEMENT_PORT, username, password } = opts

  if (!host) {
    throw new Error('魔云腾服务器地址未配置')
  }

  let token = null
  let tokenExpireAt = 0
  const devicePortMap = new Map() // deviceName → 真实公网端口（每个服务器实例独立维护）

  /**
   * 通用 HTTP 请求
   */
  function request(path, { method = 'GET', body, headers = {}, timeout = REQUEST_TIMEOUT, port: reqPort } = {}) {
    return new Promise((resolve, reject) => {
      const reqOptions = {
        host,
        port: reqPort || port,
        method,
        path,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }

      const req = http.request(reqOptions, (res) => {
        let chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8')
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const json = JSON.parse(text)
              if (json.code !== undefined && json.code !== 0 && json.code !== 200) {
                reject(new Error(`${json.message || 'API错误'} (code: ${json.code})`))
              } else {
                resolve(json)
              }
            } catch {
              resolve(text)
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${text}`))
          }
        })
      })

      req.on('error', reject)
      req.setTimeout(timeout, () => {
        req.destroy(new Error(`请求超时 (${timeout}ms)`))
      })

      if (body !== undefined) {
        req.write(JSON.stringify(body))
      }
      req.end()
    })
  }

  /**
   * 构建 query string（用于设备级 API）
   */
  function buildQuery(params = {}) {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    if (entries.length === 0) return ''
    return '&' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
  }

  /**
   * 直连设备级 API 的 HTTP 请求
   */
  function deviceRequest(targetHost, targetPort, path, { method = 'GET', timeout = REQUEST_TIMEOUT } = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        host: targetHost,
        port: targetPort,
        path,
        method,
        timeout,
      }, (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8')
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(text))
            } catch {
              resolve(text)
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${text}`))
          }
        })
      })
      req.on('error', reject)
      req.setTimeout(timeout, () => {
        req.destroy(new Error(`请求超时 (${timeout}ms)`))
      })
      req.end()
    })
  }

  /**
   * 尝试两种设备级 API 地址：
   * 1. 桥接模式：设备独立 IP:9082
   * 2. 非桥接/SDK 控制端口：服务器宿主机 IP:(30200+instanceNum)
   */
  async function tryDeviceAction(deviceName, deviceHost, path) {
    const errors = []
    if (deviceHost && deviceHost !== host) {
      try {
        return await deviceRequest(deviceHost, 9082, path, { timeout: 5000 })
      } catch (e) {
        errors.push(`${deviceHost}:9082 -> ${e.message}`)
      }
    }
    // 优先使用 Docker 端口映射中的真实公网端口（按设备名查找），回退到从设备名提取 instanceNum 计算
    let actualPort = devicePortMap.get(deviceName)
    if (!actualPort) {
      const instanceMatch = deviceName.match(/(\d+)$/)
      const instanceNum = instanceMatch ? parseInt(instanceMatch[1]) : 0
      actualPort = DEVICE_PORT_BASE + instanceNum
    }
    try {
      return await deviceRequest(host, actualPort, path, { timeout: 10000 })
    } catch (e) {
      errors.push(`${host}:${actualPort} -> ${e.message}`)
      throw new Error('设备级 API 调用失败: ' + errors.join('; '))
    }
  }

  /**
   * 带 Token 认证的请求
   */
  async function authRequest(path, options = {}) {
    if (username && password && !token) {
      try {
        await login()
      } catch {
        // 登录失败则跳过
      }
    }
    const headers = token ? { ...options.headers, Authorization: `Bearer ${token}` } : options.headers
    return request(path, { ...options, headers })
  }

  /**
   * 登录获取 Token
   */
  async function login() {
    if (!username || !password) {
      throw new Error('未配置魔云腾后台账号密码')
    }
    const result = await request('/user/loginIn', {
      method: 'POST',
      body: { username, password },
    })
    token = result.data?.token || result.token
    if (!token) {
      throw new Error('登录失败，未获取到 Token')
    }
    tokenExpireAt = Date.now() + (result.data?.expires || 7200000)
    return result
  }

  return {
    host,
    port,
    username,

    login,

    /**
     * 测试连通性（不需要登录）
     */
    async ping() {
      try {
        const result = await request('/info')
        return result.code === 200
      } catch {
        return false
      }
    },

    /**
     * 获取服务器信息
     */
    async getServerInfo() {
      return request('/info')
    },

    /**
     * 开启 Docker API 端口（可选，用于获取设备列表）
     */
    async enableDockerApi(enable = true) {
      const result = await authRequest('/server/dockerApi', {
        method: 'POST',
        body: { enable },
      })
      return result
    },

    /**
     * 获取服务器网络信息
     */
    async getNetwork() {
      return authRequest('/server/network')
    },

    /**
     * 通过 Docker API 获取设备列表
     * 需要先调用 enableDockerApi(true) 开启端口
     */
    async listContainersViaDocker() {
      return new Promise((resolve, reject) => {
        const dockerPort = 2375
        const req = http.request({
          host,
          port: dockerPort,
          path: '/containers/json?all=1',
          method: 'GET',
          timeout: 10000,
        }, (res) => {
          let chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => {
            try {
              const containers = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
              resolve(containers)
            } catch {
              reject(new Error('解析容器列表失败'))
            }
          })
        })
        req.on('error', (e) => reject(new Error(`Docker API 连接失败: ${e.message}`)))
        req.setTimeout(10000, () => {
          req.destroy(new Error('Docker API 请求超时'))
        })
        req.end()
      })
    },

    /**
     * 通过 SDK 直接获取设备列表
     * 注意：魔云腾 SDK 本身没有独立的设备列表 API
     * 需要通过 Docker API 或其他方式获取
     */
    async listDevices() {
      try {
        // 先尝试开启 Docker API
        await this.enableDockerApi(true)
        // 等待端口生效
        await new Promise(resolve => setTimeout(resolve, 500))
        // 通过 Docker API 获取设备列表
        return await this.listContainersViaDocker()
      } catch (e) {
        throw new Error(`获取设备列表失败: ${e.message}`)
      }
    },

    /**
     * 获取指定实例位的设备信息
     */
    async getDeviceInfo(instanceNum) {
      const actualPort = devicePortMap.get(instanceNum) || (DEVICE_PORT_BASE + instanceNum)
      return new Promise((resolve, reject) => {
        const req = http.request({
          host,
          port: actualPort,
          path: '/info',
          method: 'GET',
          timeout: 3000,
        }, (res) => {
          let chunks = []
          res.on('data', (c) => chunks.push(c))
          res.on('end', () => {
            try {
              const json = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
              resolve(json.data || json)
            } catch {
              reject(new Error('解析设备信息失败'))
            }
          })
        })
        req.on('error', reject)
        req.setTimeout(3000, () => {
          req.destroy(new Error('连接设备超时'))
        })
        req.end()
      })
    },

    /**
     * 获取设备截图（通过设备端口）
     */
    async getScreenshot(deviceName) {
      let actualPort = devicePortMap.get(deviceName)
      if (!actualPort) {
        const instanceMatch = deviceName.match(/(\d+)$/)
        const instanceNum = instanceMatch ? parseInt(instanceMatch[1]) : 0
        actualPort = DEVICE_PORT_BASE + instanceNum
      }
      return new Promise((resolve, reject) => {
        const req = http.request({
          host,
          port: actualPort,
          path: '/snapshot',
          method: 'GET',
          timeout: 5000,
        }, (res) => {
          if (res.statusCode === 200) {
            const chunks = []
            res.on('data', (c) => chunks.push(c))
            res.on('end', () => {
              const body = Buffer.concat(chunks)
              resolve({
                data: body.toString('base64'),
                contentType: res.headers['content-type'] || 'image/jpeg',
              })
            })
          } else {
            reject(new Error(`截图失败: HTTP ${res.statusCode}`))
          }
        })
        req.on('error', reject)
        req.setTimeout(10000, () => {
          req.destroy(new Error('截图请求超时'))
        })
        req.end()
      })
    },

    /**
     * RPA: 点击（通过 SDK 暴露的设备控制端口，使用设备级 API 格式）
     */
    async rpaClick(deviceName, x, y, deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=click${buildQuery({ x, y })}`)
    },

    /**
     * RPA: 滑动
     */
    async rpaSwipe(deviceName, x1, y1, x2, y2, duration = 300, deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=swipe${buildQuery({ x1, y1, x2, y2, duration })}`)
    },

    /**
     * RPA: 按键
     */
    async rpaKeyevent(deviceName, keycode, deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=keyevent${buildQuery({ keycode })}`)
    },

    /**
     * RPA: 文本输入
     */
    async rpaType(deviceName, text, deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=input&text=${encodeURIComponent(text || '')}`)
    },

    /**
     * RPA: 多指触控
     */
    async rpaTouch(deviceName, x, y, action = 'down', deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=touch${buildQuery({ x, y, action })}`)
    },

    /**
     * RPA: 打开 App
     */
    async rpaOpenApp(deviceName, packageName, deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=app_start&package=${encodeURIComponent(packageName || '')}`)
    },

    /**
     * RPA: 停止 App
     */
    async rpaStopApp(deviceName, packageName, deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=app_stop&package=${encodeURIComponent(packageName || '')}`)
    },

    /**
     * RPA: Shell 命令（设备级 API 未直接提供，降级为输入文本）
     */
    async rpaShell(deviceName, command, deviceHost) {
      return this.rpaType(deviceName, command, deviceHost)
    },

    /**
     * RPA: 截图
     */
    async rpaScreenshot(deviceName, deviceHost) {
      const errors = []
      if (deviceHost && deviceHost !== host) {
        try {
          const result = await deviceRequest(deviceHost, 9082, '/snapshot', { timeout: 5000 })
          if (result.data) return result
        } catch (e) {
          errors.push(`${deviceHost}:9082/snapshot -> ${e.message}`)
        }
      }
      try {
        let actualPort = devicePortMap.get(deviceName)
        if (!actualPort) {
          const instanceMatch = deviceName.match(/(\d+)$/)
          const instanceNum = instanceMatch ? parseInt(instanceMatch[1]) : 0
          actualPort = DEVICE_PORT_BASE + instanceNum
        }
        return await new Promise((resolve, reject) => {
          const req = http.request({
            host,
            port: actualPort,
            path: '/snapshot',
            method: 'GET',
            timeout: 5000,
          }, (res) => {
            if (res.statusCode === 200) {
              const chunks = []
              res.on('data', (c) => chunks.push(c))
              res.on('end', () => {
                const body = Buffer.concat(chunks)
                resolve({
                  data: body.toString('base64'),
                  contentType: res.headers['content-type'] || 'image/jpeg',
                })
              })
            } else {
              reject(new Error(`截图失败: HTTP ${res.statusCode}`))
            }
          })
          req.on('error', reject)
          req.setTimeout(10000, () => {
            req.destroy(new Error('截图请求超时'))
          })
          req.end()
        })
      } catch (e) {
        errors.push(`${host}:${actualPort}/snapshot -> ${e.message}`)
        throw new Error('截图失败: ' + errors.join('; '))
      }
    },

    /**
     * RPA: 旋转屏幕
     */
    async rpaRotation(deviceName, rotation, deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=rotate&direction=${rotation}`)
    },

    /**
     * RPA: 双击
     */
    async rpaDoubleClick(deviceName, x, y, deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=doubleclick${buildQuery({ x, y })}`)
    },

    /**
     * RPA: 长按
     */
    async rpaLongPress(deviceName, x, y, duration = 500, deviceHost) {
      return tryDeviceAction(deviceName, deviceHost, `/?task=longpress${buildQuery({ x, y, duration })}`)
    },

    /**
     * RPA: 检查连接状态
     */
    async rpaCheck(instanceNum) {
      return authRequest('/rpa/check', {
        method: 'POST',
        body: { instanceNum },
      })
    },

    /**
     * RPA: 连接设备
     */
    async rpaConnect(instanceNum) {
      return authRequest('/rpa/connect', {
        method: 'POST',
        body: { instanceNum },
      })
    },

    /**
     * RPA: 断开连接
     */
    async rpaDisconnect(instanceNum) {
      return authRequest('/rpa/disconnect', {
        method: 'POST',
        body: { instanceNum },
      })
    },

    /**
     * RPA: 屏幕是否亮起
     */
    async rpaIsScreenOn(instanceNum) {
      return authRequest('/rpa/is_screen_on', {
        method: 'POST',
        body: { instanceNum },
      })
    },

    /**
     * RPA: 转储 UI 层级
     */
    async rpaDumpUi(instanceNum) {
      return authRequest('/rpa/dump_ui', {
        method: 'POST',
        body: { instanceNum },
      })
    },

    /**
     * 重启设备
     */
    async rebootDevice(instanceNum) {
      return authRequest('/server/device/reboot', {
        method: 'POST',
        body: { instanceNum },
      })
    },

    /**
     * 清空设备数据（高危！）
     */
    async resetDevice(instanceNum) {
      return authRequest('/server/device/reset', {
        method: 'POST',
        body: { instanceNum },
      })
    },

    /**
     * 缓存设备端口映射（从 Docker 容器数据中提取 9082 公网端口）
     */
    cacheDevicePorts(devices) {
      for (const d of devices) {
        if (d.name && d.rpaPort) {
          devicePortMap.set(d.name, d.rpaPort)
        }
      }
    },
  }
}
