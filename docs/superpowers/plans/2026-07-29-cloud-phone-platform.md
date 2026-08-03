# 云手机群控平台完整功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现云手机群控平台的13个核心功能页面，打造完整的设备管理解决方案

**Architecture:** 采用 React Router 实现多页面路由，共享侧边栏布局，每个功能模块独立页面组件。状态使用 React Context 集中管理，模拟数据存储在中央 store 中。

**Tech Stack:** React 19, React Router 7, Tailwind CSS 4, Lucide Icons, Vite

---

## 文件结构

```
src/
├── pages/                    # 13个页面组件
│   ├── Dashboard.jsx         # 数据看板
│   ├── DeviceManage.jsx      # 设备管理（已实现）
│   ├── GroupManage.jsx       # 分组管理
│   ├── MultiPreview.jsx      # 多画面预览
│   ├── BatchControl.jsx      # 批量操控
│   ├── AppManage.jsx         # 应用管理
│   ├── ScriptReplay.jsx      # 脚本回放
│   ├── TaskSchedule.jsx      # 任务调度
│   ├── AlertMonitor.jsx      # 告警监控
│   ├── Statistics.jsx        # 统计报表
│   ├── DeviceLogs.jsx        # 设备日志
│   ├── FileTransfer.jsx      # 文件互传
│   ├── UserManage.jsx        # 用户管理
│   └── AuditLog.jsx          # 操作审计
├── components/
│   ├── Layout.jsx            # 共享布局（侧边栏+路由）
│   ├── Sidebar.jsx           # 侧边栏（已实现）
│   ├── Header.jsx            # 顶部栏（已实现）
│   ├── Modal.jsx             # 弹窗组件（已实现）
│   ├── DataTable.jsx         # 通用数据表格
│   ├── Charts.jsx            # 图表组件
│   └── StatusBadge.jsx       # 状态徽章
├── context/
│   └── AppContext.jsx        # 全局状态管理
├── data/
│   └── mockData.js           # 模拟数据
├── App.jsx                   # 路由配置
└── main.jsx                  # 入口
```

---

## Task 1: 安装依赖并配置路由

**Files:**
- Modify: `package.json`
- Create: `src/App.jsx` (路由版本)

- [ ] **Step 1: 安装 react-router-dom**

Run: `npm install react-router-dom`

- [ ] **Step 2: 创建 App.jsx 路由配置**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DeviceManage from './pages/DeviceManage'
import GroupManage from './pages/GroupManage'
import MultiPreview from './pages/MultiPreview'
import BatchControl from './pages/BatchControl'
import AppManage from './pages/AppManage'
import ScriptReplay from './pages/ScriptReplay'
import TaskSchedule from './pages/TaskSchedule'
import AlertMonitor from './pages/AlertMonitor'
import Statistics from './pages/Statistics'
import DeviceLogs from './pages/DeviceLogs'
import FileTransfer from './pages/FileTransfer'
import UserManage from './pages/UserManage'
import AuditLog from './pages/AuditLog'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="devices" element={<DeviceManage />} />
          <Route path="groups" element={<GroupManage />} />
          <Route path="preview" element={<MultiPreview />} />
          <Route path="batch" element={<BatchControl />} />
          <Route path="apps" element={<AppManage />} />
          <Route path="scripts" element={<ScriptReplay />} />
          <Route path="tasks" element={<TaskSchedule />} />
          <Route path="alerts" element={<AlertMonitor />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="logs" element={<DeviceLogs />} />
          <Route path="transfer" element={<FileTransfer />} />
          <Route path="users" element={<UserManage />} />
          <Route path="audit" element={<AuditLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: 创建 Layout 组件**

```jsx
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}
```

---

## Task 2: 创建全局状态管理

**Files:**
- Create: `src/context/AppContext.jsx`
- Create: `src/data/mockData.js`

- [ ] **Step 1: 创建模拟数据**

```javascript
// src/data/mockData.js
export const devices = [
  { id: 1, name: '演示机-001', status: '运行中', model: 'NE2213', groupId: 'group-1', ip: '192.168.1.101', lastActive: '2026-07-29 10:30:00' },
  { id: 2, name: '演示机-002', status: '运行中', model: 'Pixel 7 Pro', groupId: 'group-1', ip: '192.168.1.102', lastActive: '2026-07-29 10:28:00' },
  // ... 更多设备
]

export const groups = [
  { id: 'group-1', name: '默认分组', deviceCount: 15, createdAt: '2026-01-15' },
  { id: 'group-2', name: '测试分组', deviceCount: 8, createdAt: '2026-02-20' },
]

export const apps = [
  { id: 'app-1', name: '微信', packageName: 'com.tencent.mm', version: '8.0.42', installed: 30 },
  { id: 'app-2', name: '抖音', packageName: 'com.ss.android.ugc.aweme', version: '24.5.0', installed: 28 },
]

export const scripts = [
  { id: 'script-1', name: '自动点赞脚本', status: '就绪', runs: 156, lastRun: '2026-07-28 15:30:00' },
  { id: 'script-2', name: '批量关注脚本', status: '运行中', runs: 89, lastRun: '2026-07-29 09:00:00' },
]

export const tasks = [
  { id: 'task-1', name: '每日签到', schedule: '0 8 * * *', status: '启用', nextRun: '2026-07-30 08:00:00' },
  { id: 'task-2', name: '数据备份', schedule: '0 2 * * *', status: '启用', nextRun: '2026-07-30 02:00:00' },
]

export const alerts = [
  { id: 'alert-1', type: '设备离线', message: '演示机-005 已离线', level: 'warning', time: '2026-07-29 10:15:00' },
  { id: 'alert-2', type: '存储不足', message: '演示机-012 存储空间不足', level: 'error', time: '2026-07-29 09:45:00' },
]

export const users = [
  { id: 'user-1', username: 'admin', role: '管理员', status: '正常', lastLogin: '2026-07-29 08:00:00' },
  { id: 'user-2', username: 'operator', role: '操作员', status: '正常', lastLogin: '2026-07-28 16:30:00' },
]

export const auditLogs = [
  { id: 'log-1', user: 'admin', action: '创建设备', target: '演示机-001', time: '2026-07-29 10:00:00', ip: '192.168.1.100' },
  { id: 'log-2', user: 'operator', action: '启动脚本', target: '自动点赞脚本', time: '2026-07-29 09:30:00', ip: '192.168.1.105' },
]
```

- [ ] **Step 2: 创建 AppContext**

```jsx
import { createContext, useContext, useState } from 'react'
import * as mockData from '../data/mockData'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [devices, setDevices] = useState(mockData.devices)
  const [groups, setGroups] = useState(mockData.groups)
  const [apps, setApps] = useState(mockData.apps)
  const [scripts, setScripts] = useState(mockData.scripts)
  const [tasks, setTasks] = useState(mockData.tasks)
  const [alerts, setAlerts] = useState(mockData.alerts)
  const [users, setUsers] = useState(mockData.users)
  const [auditLogs, setAuditLogs] = useState(mockData.auditLogs)

  const value = {
    devices, setDevices,
    groups, setGroups,
    apps, setApps,
    scripts, setScripts,
    tasks, setTasks,
    alerts, setAlerts,
    users, setUsers,
    auditLogs, setAuditLogs,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
```

- [ ] **Step 3: 在 main.jsx 中包裹 Provider**

---

## Task 3: 实现数据看板页面

**Files:**
- Create: `src/pages/Dashboard.jsx`

**功能点:**
- 设备总数/在线数/离线数统计卡片
- 设备状态分布饼图
- 近7天任务执行趋势折线图
- 实时告警列表
- 快捷操作入口

- [ ] **Step 1: 创建 Dashboard.jsx**

```jsx
import { useApp } from '../context/AppContext'
import { Smartphone, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default function Dashboard() {
  const { devices, alerts, tasks } = useApp()

  const totalDevices = devices.length
  const onlineDevices = devices.filter(d => d.status === '运行中').length
  const offlineDevices = totalDevices - onlineDevices

  const stats = [
    { label: '设备总数', value: totalDevices, icon: Smartphone, color: 'blue' },
    { label: '在线设备', value: onlineDevices, icon: CheckCircle, color: 'green' },
    { label: '离线设备', value: offlineDevices, icon: XCircle, color: 'red' },
    { label: '今日任务', value: tasks.filter(t => t.status === '启用').length, icon: Activity, color: 'purple' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">数据看板</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(stat => (
          <div key={stat.label} className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <stat.icon className={`w-10 h-10 text-${stat.color}-500`} />
              <div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">设备状态分布</h2>
          <div className="flex items-center justify-center h-64">
            {/* 简化版饼图展示 */}
            <div className="text-center">
              <div className="text-6xl font-bold text-green-500">{onlineDevices}</div>
              <div className="text-gray-500 mt-2">在线设备</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">近7天任务执行趋势</h2>
          <div className="h-64 flex items-end gap-2 px-4">
            {[65, 72, 58, 80, 75, 90, 85].map((height, i) => (
              <div key={i} className="flex-1 bg-blue-500 rounded-t" style={{ height: `${height}%` }}></div>
            ))}
          </div>
        </div>
      </div>

      {/* 实时告警 */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="text-amber-500" />
          实时告警
        </h2>
        <div className="space-y-3">
          {alerts.slice(0, 5).map(alert => (
            <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <div>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${alert.level === 'error' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                <span className="font-medium">{alert.type}</span>
                <span className="text-gray-500 ml-2">{alert.message}</span>
              </div>
              <span className="text-sm text-gray-400">{alert.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## Task 4: 实现分组管理页面

**Files:**
- Create: `src/pages/GroupManage.jsx`

**功能点:**
- 分组列表表格
- 新建/编辑/删除分组
- 分组内设备查看
- 批量移动设备到分组

- [ ] **Step 1: 创建 GroupManage.jsx**

```jsx
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Plus, Edit, Trash2, Smartphone } from 'lucide-react'
import Modal from '../components/Modal'

export default function GroupManage() {
  const { groups, setGroups, devices } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [form, setForm] = useState({ name: '' })

  const handleSave = () => {
    if (editingGroup) {
      setGroups(groups.map(g => g.id === editingGroup.id ? { ...g, name: form.name } : g))
    } else {
      setGroups([...groups, { id: `group-${Date.now()}`, name: form.name, deviceCount: 0, createdAt: new Date().toISOString().split('T')[0] }])
    }
    setShowModal(false)
    setEditingGroup(null)
    setForm({ name: '' })
  }

  const handleDelete = (id) => {
    if (confirm('确定删除该分组？')) {
      setGroups(groups.filter(g => g.id !== id))
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">分组管理</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
          <Plus size={18} /> 新建分组
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分组名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备数量</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {groups.map(group => (
              <tr key={group.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{group.name}</td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1">
                    <Smartphone size={16} className="text-gray-400" />
                    {devices.filter(d => d.groupId === group.id).length}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{group.createdAt}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingGroup(group); setForm({ name: group.name }); setShowModal(true) }} className="text-blue-500 hover:text-blue-600">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(group.id)} className="text-red-500 hover:text-red-600">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingGroup(null) }} title={editingGroup ? '编辑分组' : '新建分组'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">分组名称</label>
            <input value={form.name} onChange={e => setForm({ name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setShowModal(false); setEditingGroup(null) }} className="px-4 py-2 border rounded-lg">取消</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-lg">保存</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
```

---

## Task 5: 实现多画面预览页面

**Files:**
- Create: `src/pages/MultiPreview.jsx`

**功能点:**
- 设备画面网格展示（支持2x2/3x3/4x4切换）
- 单击设备全屏查看
- 实时画面模拟
- 设备状态叠加显示

- [ ] **Step 1: 创建 MultiPreview.jsx**

```jsx
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Grid3x3, Grid2x2, Grid4x4, Maximize2 } from 'lucide-react'

export default function MultiPreview() {
  const { devices } = useApp()
  const [gridSize, setGridSize] = useState(3)
  const [selectedDevice, setSelectedDevice] = useState(null)

  const gridStyles = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">多画面预览</h1>
        <div className="flex gap-2">
          <button onClick={() => setGridSize(2)} className={`p-2 rounded ${gridSize === 2 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            <Grid2x2 size={20} />
          </button>
          <button onClick={() => setGridSize(3)} className={`p-2 rounded ${gridSize === 3 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            <Grid3x3 size={20} />
          </button>
          <button onClick={() => setGridSize(4)} className={`p-2 rounded ${gridSize === 4 ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            <Grid4x4 size={20} />
          </button>
        </div>
      </div>

      <div className={`grid ${gridStyles[gridSize]} gap-2`}>
        {devices.map(device => (
          <div
            key={device.id}
            onClick={() => setSelectedDevice(device)}
            className="relative aspect-[9/16] bg-gray-900 rounded-lg overflow-hidden cursor-pointer group"
          >
            {/* 模拟手机屏幕 */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="text-white text-opacity-30 text-4xl font-bold">{device.name}</div>
            </div>

            {/* 设备信息叠加层 */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2">
              <div className="text-white text-sm font-medium">{device.name}</div>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${device.status === '运行中' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-gray-300 text-xs">{device.status}</span>
              </div>
            </div>

            {/* 放大按钮 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1 bg-black bg-opacity-50 rounded">
                <Maximize2 size={16} className="text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 全屏预览 */}
      {selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center" onClick={() => setSelectedDevice(null)}>
          <div className="w-96 bg-gray-900 rounded-3xl aspect-[9/16] relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-opacity-30 text-6xl font-bold">{selectedDevice.name}</div>
            </div>
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 p-4 rounded-xl">
              <div className="text-white font-medium">{selectedDevice.name}</div>
              <div className="text-gray-400 text-sm">{selectedDevice.model} - {selectedDevice.status}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Task 6: 实现批量操控页面

**Files:**
- Create: `src/pages/BatchControl.jsx`

**功能点:**
- 设备多选
- 批量操作按钮组（重启/关机/清理/安装等）
- 操作进度显示
- 操作结果汇总

- [ ] **Step 1: 创建 BatchControl.jsx**

```jsx
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { RefreshCw, Power, Trash2, Download, CheckSquare, Square } from 'lucide-react'

export default function BatchControl() {
  const { devices, setDevices } = useApp()
  const [selectedIds, setSelectedIds] = useState([])
  const [executing, setExecuting] = useState(false)
  const [results, setResults] = useState([])

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleAll = () => {
    if (selectedIds.length === devices.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(devices.map(d => d.id))
    }
  }

  const executeBatch = async (action) => {
    setExecuting(true)
    const newResults = []

    for (const id of selectedIds) {
      await new Promise(resolve => setTimeout(resolve, 500))
      newResults.push({ deviceId: id, action, status: 'success', message: '执行成功' })
    }

    setResults(newResults)
    setExecuting(false)
  }

  const actions = [
    { label: '批量重启', icon: RefreshCw, color: 'blue', action: 'restart' },
    { label: '批量关机', icon: Power, color: 'red', action: 'shutdown' },
    { label: '清理后台', icon: Trash2, color: 'amber', action: 'clear' },
    { label: '同步时间', icon: Download, color: 'green', action: 'sync' },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">批量操控</h1>

      {/* 操作按钮 */}
      <div className="bg-white rounded-lg p-4 shadow mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={toggleAll} className="flex items-center gap-2 text-sm">
              {selectedIds.length === devices.length ? <CheckSquare className="text-blue-500" /> : <Square />}
              {selectedIds.length === devices.length ? '取消全选' : '全选'}
            </button>
            <span className="text-gray-500 text-sm">已选择 {selectedIds.length} 台设备</span>
          </div>
        </div>

        <div className="flex gap-3">
          {actions.map(item => (
            <button
              key={item.action}
              onClick={() => executeBatch(item.action)}
              disabled={selectedIds.length === 0 || executing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white bg-${item.color}-500 hover:bg-${item.color}-600 disabled:opacity-50`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 设备列表 */}
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-12 px-6 py-3"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">机型</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {devices.map(device => (
              <tr key={device.id} className={`hover:bg-gray-50 ${selectedIds.includes(device.id) ? 'bg-blue-50' : ''}`}>
                <td className="px-6 py-4">
                  <button onClick={() => toggleSelect(device.id)}>
                    {selectedIds.includes(device.id) ? <CheckSquare className="text-blue-500" /> : <Square className="text-gray-300" />}
                  </button>
                </td>
                <td className="px-6 py-4 font-medium">{device.name}</td>
                <td className="px-6 py-4">{device.status}</td>
                <td className="px-6 py-4">{device.model}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 执行结果 */}
      {results.length > 0 && (
        <div className="mt-6 bg-white rounded-lg p-4 shadow">
          <h2 className="font-semibold mb-3">执行结果</h2>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>{devices.find(d => d.id === r.deviceId)?.name}</span>
                <span className="text-green-500">{r.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Task 7-16: 实现剩余页面

（由于篇幅限制，以下为简要描述，实际执行时会完整实现）

### Task 7: 应用管理页面
- 应用列表表格
- 批量安装/卸载
- 应用市场搜索

### Task 8: 脚本回放页面
- 脚本列表
- 创建/编辑脚本
- 执行脚本

### Task 9: 任务调度页面
- 定时任务列表
- 创建/编辑任务
- 启用/禁用任务

### Task 10: 告警监控页面
- 告警列表
- 告警级别筛选
- 告警处理/忽略

### Task 11: 统计报表页面
- 设备使用统计
- 任务执行统计
- 数据导出

### Task 12: 设备日志页面
- 日志列表筛选
- 日志详情查看
- 日志导出

### Task 13: 文件互传页面
- 上传文件
- 文件列表
- 批量推送

### Task 14: 用户管理页面
- 用户列表
- 添加/编辑用户
- 角色权限管理

### Task 15: 操作审计页面
- 审计日志列表
- 时间/用户/操作筛选
- 日志详情

### Task 16: 更新侧边栏导航
- 修改 Sidebar.jsx 添加路由链接
- 高亮当前页面

---

## 执行说明

计划完成后，建议使用 **Subagent-Driven Development** 方式执行：
- 每个任务由独立的子代理执行
- 任务间有依赖时顺序执行
- 无依赖的任务可并行执行
- 每个任务完成后进行验证和提交