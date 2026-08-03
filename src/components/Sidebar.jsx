import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Smartphone,
  FolderOpen,
  MonitorPlay,
  RefreshCw,
  AppWindow,
  FileText,
  Clock,
  AlertTriangle,
  BarChart3,
  Database,
  Upload,
  User,
  FileCheck,
  Box,
  Cog,
} from 'lucide-react'

const menuItems = [
  { icon: LayoutDashboard, label: '数据看板', path: '/' },
  { icon: Box, label: '镜像管理', path: '/images' },
  { icon: Smartphone, label: '设备管理', path: '/devices' },
  { icon: FolderOpen, label: '分组管理', path: '/groups' },
  { icon: MonitorPlay, label: '多画面预览', path: '/preview' },
  { icon: RefreshCw, label: '批量操控', path: '/batch' },
  { icon: AppWindow, label: '应用管理', path: '/apps' },
  { icon: FileText, label: '脚本回放', path: '/scripts' },
  { icon: Clock, label: '任务调度', path: '/tasks' },
  { icon: AlertTriangle, label: '告警监控', path: '/alerts' },
  { icon: BarChart3, label: '统计报表', path: '/statistics' },
  { icon: Database, label: '设备日志', path: '/logs' },
  { icon: Upload, label: '文件互传', path: '/transfer' },
  { icon: User, label: '用户管理', path: '/users' },
  { icon: FileCheck, label: '操作审计', path: '/audit' },
  { icon: Cog, label: '系统设置', path: '/settings' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-sidebar-bg text-sidebar-text min-h-screen flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-white">云手机群控平台</h1>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-sidebar-active text-white'
                      : 'text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text'
                  }`
                }
              >
                <item.icon size={20} />
                <span className="text-sm">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}