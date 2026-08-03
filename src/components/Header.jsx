import { User } from 'lucide-react'

export default function Header({ onlineCount, totalCount }) {
  return (
    <header className="bg-header-bg border-b border-header-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">主流程演示</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-gray-600">在线设备 {onlineCount}/{totalCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <User size={20} className="text-gray-400" />
            <span className="text-sm text-gray-600">admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}
