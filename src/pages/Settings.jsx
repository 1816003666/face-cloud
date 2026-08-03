import { useEffect, useState } from 'react'
import { api } from '../api/backend'
import { Server, Wifi, CheckCircle, XCircle, Loader2, Settings as SettingsIcon, AlertTriangle, Plus, Trash2, Edit3, Zap, Search } from 'lucide-react'
import Modal from '../components/Modal'

export default function Settings() {
  const [backendOk, setBackendOk] = useState(null)
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(false)

  // 添加/编辑弹窗
  const [editModal, setEditModal] = useState({ open: false, server: null })
  const [editForm, setEditForm] = useState({ label: '', host: '', port: 8000, tls: false, mode: 'sdk', username: '', password: '' })
  const [saving, setSaving] = useState(false)

  // SDK 登录状态
  const [sdkLoggingIn, setSdkLoggingIn] = useState(false)
  const [sdkLoginResult, setSdkLoginResult] = useState({})

  // 测试状态
  const [testingId, setTestingId] = useState(null)
  const [testResults, setTestResults] = useState({})

  // 扫描状态
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [addingIds, setAddingIds] = useState(new Set())
  const [scanMode, setScanMode] = useState('auto') // 'auto' or 'custom'
  const [customRange, setCustomRange] = useState('192.168.9.100-192.168.9.199')
  const [scanPorts, setScanPorts] = useState('2375,2376,8000')

  useEffect(() => { init() }, [])

  async function init() {
    setLoading(true)
    try {
      const ok = await api.ping()
      setBackendOk(ok)
      if (ok) {
        const list = await api.listServers()
        setServers(list)
      }
    } catch {
      setBackendOk(false)
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditForm({ label: '', host: '', port: 8000, tls: false, mode: 'sdk', username: '', password: '' })
    setEditModal({ open: true, server: null })
  }

  function openEdit(srv) {
    const mode = srv.mode || 'docker'
    setEditForm({
      label: srv.label || '',
      host: srv.host || '',
      port: srv.port || (mode === 'sdk' ? 8000 : 2375),
      tls: srv.tls || false,
      mode,
      username: srv.username || '',
      password: srv.password || '',
    })
    setEditModal({ open: true, server: srv })
  }

  async function handleSave() {
    if (!editForm.host.trim()) return alert('服务器 IP 不能为空')
    setSaving(true)
    try {
      await api.addServer({
        id: editModal.server?.id,
        label: editForm.label.trim() || editForm.host.trim(),
        host: editForm.host.trim(),
        port: parseInt(editForm.port, 10),
        tls: editForm.tls,
        mode: editForm.mode,
        username: editForm.username || undefined,
        password: editForm.password || undefined,
      })
      await init()
      setEditModal({ open: false, server: null })
    } catch (e) {
      alert('保存失败：' + e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSdkLogin() {
    if (!editModal.server) return
    setSdkLoggingIn(true)
    setSdkLoginResult({})
    try {
      const result = await api.sdkLogin(editModal.server.id, editForm.username, editForm.password)
      setSdkLoginResult({ ok: true, message: '登录成功', detail: result })
    } catch (e) {
      setSdkLoginResult({ ok: false, message: e.message })
    } finally {
      setSdkLoggingIn(false)
    }
  }

  async function handleDelete(serverId) {
    if (!window.confirm('确定要删除该服务器配置吗？')) return
    try {
      await api.removeServer(serverId)
      await init()
    } catch (e) {
      alert('删除失败：' + e.message)
    }
  }

  async function handleTest(serverId) {
    setTestingId(serverId)
    setTestResults((prev) => ({ ...prev, [serverId]: null }))
    try {
      const r = await api.testServer(serverId)
      setTestResults((prev) => ({ ...prev, [serverId]: { ok: true, message: r.message || '连接成功' } }))
    } catch (e) {
      setTestResults((prev) => ({ ...prev, [serverId]: { ok: false, message: e.message } }))
    } finally {
      setTestingId(null)
    }
  }

  async function handleScan() {
    setScanning(true)
    setScanResult(null)
    try {
      const ports = scanPorts.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p))
      const params = { ports }
      
      if (scanMode === 'custom' && customRange.trim()) {
        const ranges = customRange.split(',').map(r => r.trim()).filter(Boolean)
        if (ranges.length > 0) {
          params.ranges = ranges
          params.subnets = [] // 不扫描默认子网，只扫描指定范围
        }
      }
      
      const r = await api.scanNetwork(params)
      setScanResult(r)
    } catch (e) {
      setScanResult({ error: e.message, discovered: [] })
    } finally {
      setScanning(false)
    }
  }

  async function handleAddDiscovered(srv) {
    const key = `${srv.host}:${srv.port}`
    setAddingIds((prev) => new Set(prev).add(key))
    try {
      const mode = srv.port === 8000 ? 'sdk' : 'docker'
      await api.addServer({
        label: `魔云腾-${srv.host.split('.').pop()}`,
        host: srv.host,
        port: srv.port,
        tls: srv.port === 2376,
        mode,
      })
      await init()
      // 标记已添加
      setScanResult((prev) => prev ? {
        ...prev,
        discovered: prev.discovered.map((d) =>
          d.host === srv.host && d.port === srv.port ? { ...d, added: true } : d
        ),
      } : null)
    } catch (e) {
      alert('添加失败：' + e.message)
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">系统设置</h2>
        <p className="text-sm text-gray-500 mt-1">管理多台魔云腾服务器连接</p>
      </header>

      <main className="flex-1 overflow-auto p-6 max-w-4xl">
        {/* 后端服务状态 */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <SettingsIcon size={18} />
            后端服务（中间层）
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500">状态：</span>
              {backendOk === null ? (
                <span className="text-gray-400">检测中...</span>
              ) : backendOk ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle size={16} />已连接
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-600">
                  <XCircle size={16} />无法连接
                </span>
              )}
              <button onClick={init} className="ml-2 text-xs text-blue-500 hover:underline">重新检测</button>
            </div>
            {!backendOk && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium mb-1">后端服务未运行</div>
                    <pre className="mt-2 text-xs bg-amber-100 rounded p-2 overflow-auto">
{`cd server
npm install
npm run dev`}
                    </pre>
                    <button onClick={() => setShowGuide(true)} className="mt-2 text-xs text-amber-700 hover:underline">查看详细说明 →</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 魔云腾服务器列表 */}
        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Server size={18} />
              魔云腾服务器 ({servers.length})
            </h3>
            <button
              onClick={openAdd}
              disabled={!backendOk}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 text-sm"
            >
              <Plus size={14} />添加服务器
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-400 flex items-center gap-2 py-8 justify-center">
              <Loader2 size={14} className="animate-spin" />加载中...
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Server size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">尚未添加任何魔云腾服务器</p>
              <p className="text-xs mt-1">点击「添加服务器」开始配置</p>
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map((srv) => {
                const tr = testResults[srv.id]
                const isTesting = testingId === srv.id
                return (
                  <div key={srv.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${tr ? (tr.ok ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-300'}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">{srv.label}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${srv.mode === 'sdk' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {srv.mode === 'sdk' ? 'SDK' : 'Docker'}
                            </span>
                            {srv.hasCredentials && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">已配置账号</span>}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{srv.host}:{srv.port} {srv.tls ? '(TLS)' : '(明文)'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTest(srv.id)}
                          disabled={isTesting}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Wifi size={12} className={isTesting ? 'animate-pulse' : ''} />
                          {isTesting ? '测试中' : '测试'}
                        </button>
                        <button
                          onClick={() => openEdit(srv)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Edit3 size={12} />编辑
                        </button>
                        <button
                          onClick={() => handleDelete(srv.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50"
                        >
                          <Trash2 size={12} />删除
                        </button>
                      </div>
                    </div>
                    {tr && (
                      <div className={`mt-2 p-2 rounded text-xs flex items-start gap-1.5 ${tr.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {tr.ok ? <CheckCircle size={12} className="mt-0.5" /> : <XCircle size={12} className="mt-0.5" />}
                        {tr.message}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 mt-4">
            <div className="font-medium mb-1">提示</div>
            <div>• 支持同时管理多台魔云腾服务器，设备列表会自动聚合所有服务器的云手机</div>
            <div>• 同局域网请使用内网 IP（如 192.168.1.50）</div>
            <div>• 公网请使用 TLS（2376），不要直接暴露 2375</div>
            <div>• 添加后点击「测试」验证连接</div>
            <div>• 点击「扫描网络」自动发现局域网内的魔云腾服务器</div>
          </div>

          {/* 扫描网络按钮 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-gray-900">网络扫描</div>
                <div className="text-xs text-gray-500">自动发现局域网内的魔云腾服务器</div>
              </div>
              <button
                onClick={handleScan}
                disabled={scanning || !backendOk}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm"
              >
                <Search size={14} className={scanning ? 'animate-pulse' : ''} />
                {scanning ? '扫描中...' : '扫描网络'}
              </button>
            </div>
            
            {/* 扫描模式选择 */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="scanMode"
                    value="auto"
                    checked={scanMode === 'auto'}
                    onChange={(e) => setScanMode(e.target.value)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>自动扫描所有网段</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="scanMode"
                    value="custom"
                    checked={scanMode === 'custom'}
                    onChange={(e) => setScanMode(e.target.value)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span>自定义范围</span>
                </label>
              </div>
              
              {scanMode === 'custom' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">IP 范围（格式: 192.168.9.100-192.168.9.199，多个用逗号分隔）</label>
                    <input
                      type="text"
                      value={customRange}
                      onChange={(e) => setCustomRange(e.target.value)}
                      placeholder="192.168.9.100-192.168.9.199"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                    />
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">扫描端口（用逗号分隔）</label>
                <input
                  type="text"
                  value={scanPorts}
                  onChange={(e) => setScanPorts(e.target.value)}
                  placeholder="2375,2376"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                />
              </div>
            </div>
          </div>

          {/* 扫描结果 */}
          {scanning && (
            <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-purple-700">
                <Loader2 size={14} className="animate-spin" />
                正在扫描局域网，请稍候...（扫描整个 /24 子网约需 30-60 秒）
              </div>
            </div>
          )}

          {scanResult && !scanning && (
            <div className="mt-3">
              {scanResult.error ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <XCircle size={14} className="inline mr-1" />{scanResult.error}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-gray-500">
                    扫描范围：{scanResult.subnets?.join(', ')} · 共扫描 {scanResult.scanned} 个端口 · 发现 {scanResult.discovered?.length || 0} 台服务器
                  </div>
                  {scanResult.discovered?.length > 0 ? (
                    scanResult.discovered.map((srv) => {
                      const key = `${srv.host}:${srv.port}`
                      const isAdding = addingIds.has(key)
                      const existingServer = servers.find((s) => s.host === srv.host && s.port === srv.port)
                      const isAdded = srv.added || !!existingServer
                      return (
                        <div key={key} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle size={14} className="text-green-500" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {srv.host}:{srv.port}
                                <span className={`text-xs px-1.5 py-0.5 rounded ${srv.port === 8000 ? 'bg-purple-200 text-purple-700' : 'bg-blue-200 text-blue-700'}`}>
                                  {srv.port === 8000 ? 'SDK API' : 'Docker API'}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">{srv.version ? `Docker ${srv.version}` : '魔云腾管理服务'}</div>
                            </div>
                          </div>
                          {isAdded ? (
                            <span className="text-xs text-green-600 font-medium">已添加</span>
                          ) : (
                            <button
                              onClick={() => handleAddDiscovered(srv)}
                              disabled={isAdding}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                            >
                              <Plus size={12} />
                              {isAdding ? '添加中' : '添加'}
                            </button>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      {scanResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* 添加/编辑服务器弹窗 */}
      <Modal isOpen={editModal.open} onClose={() => { setEditModal({ open: false, server: null }); setSdkLoginResult({}) }} title={editModal.server ? '编辑服务器' : '添加服务器'}>
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">连接模式</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="sdk"
                  checked={editForm.mode === 'sdk'}
                  onChange={() => setEditForm({ ...editForm, mode: 'sdk', port: 8000 })}
                  className="text-purple-600"
                />
                <span className="text-purple-700">SDK 模式（推荐）</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="docker"
                  checked={editForm.mode === 'docker'}
                  onChange={() => setEditForm({ ...editForm, mode: 'docker', port: 2375 })}
                  className="text-blue-600"
                />
                <span className="text-blue-700">Docker 模式</span>
              </label>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {editForm.mode === 'sdk'
                ? '通过魔云腾管理 API（端口 8000）获取设备列表，无需开启 Docker 2375 端口'
                : '直接通过 Docker Engine API（端口 2375/2376）获取设备列表，需服务器已开启 Docker 远程访问'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标签名</label>
            <input
              type="text"
              value={editForm.label}
              onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
              placeholder="例如：机房A、生产环境"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">服务器 IP <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={editForm.host}
              onChange={(e) => setEditForm({ ...editForm, host: e.target.value })}
              placeholder="例如 192.168.9.105"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">端口</label>
              <select
                value={editForm.port}
                onChange={(e) => setEditForm({ ...editForm, port: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {editForm.mode === 'sdk' ? (
                  <>
                    <option value={8000}>8000（魔云腾管理 API）</option>
                    <option value={443}>443（HTTPS）</option>
                  </>
                ) : (
                  <>
                    <option value={2375}>2375（明文）</option>
                    <option value={2376}>2376（TLS）</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">TLS</label>
              <select
                value={editForm.tls ? 'true' : 'false'}
                onChange={(e) => setEditForm({ ...editForm, tls: e.target.value === 'true' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="false">关闭</option>
                <option value="true">开启</option>
              </select>
            </div>
          </div>

          {/* SDK 模式: 账号密码 */}
          {editForm.mode === 'sdk' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
              <div className="text-sm font-medium text-purple-900">魔云腾管理后台账号</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">用户名</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    placeholder="魔云腾后台用户名"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">密码</label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="魔云腾后台密码"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              {editModal.server && editForm.username && editForm.password && (
                <div>
                  <button
                    onClick={handleSdkLogin}
                    disabled={sdkLoggingIn}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm"
                  >
                    <Zap size={14} className={sdkLoggingIn ? 'animate-pulse' : ''} />
                    {sdkLoggingIn ? '登录中...' : '测试登录'}
                  </button>
                  {sdkLoginResult.ok !== undefined && (
                    <div className={`mt-2 p-2 rounded text-xs ${sdkLoginResult.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {sdkLoginResult.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => { setEditModal({ open: false, server: null }); setSdkLoginResult({}) }} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showGuide} onClose={() => setShowGuide(false)} title="如何启动后端服务" size="lg">
        <div className="text-sm space-y-3">
          <p>浏览器不能直接访问魔云腾的 2375/2376 端口（CORS 限制 + 安全隐患），所以需要启动一个本地 Node 中间层服务。</p>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>打开终端，进入项目 <code className="bg-gray-100 px-1 rounded">server</code> 目录</li>
            <li>执行 <code className="bg-gray-100 px-1 rounded">npm install</code> 安装依赖</li>
            <li>执行 <code className="bg-gray-100 px-1 rounded">npm run dev</code> 启动</li>
            <li>默认监听 <code className="bg-gray-100 px-1 rounded">http://localhost:4520</code></li>
            <li>回到本页，后端状态变为「已连接」后，添加服务器</li>
          </ol>
        </div>
      </Modal>
    </div>
  )
}