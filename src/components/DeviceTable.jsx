import { ChevronDown } from 'lucide-react'

function StatusBadge({ status }) {
  const statusStyles = {
    '运行中': 'bg-green-100 text-green-800',
    '已停止': 'bg-amber-100 text-amber-800',
    '离线': 'bg-gray-100 text-gray-800',
  }

  const dotColors = {
    '运行中': 'bg-green-500',
    '已停止': 'bg-amber-500',
    '离线': 'bg-gray-500',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles['离线']}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColors[status] || dotColors['离线']}`}></span>
      {status}
    </span>
  )
}

function ActionButton({ children, variant = 'default', onClick, disabled }) {
  const variants = {
    default: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
    warning: 'bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

export default function DeviceTable({
  devices,
  onControl,
  onDetail,
  onFingerprint,
  onSkin,
  onToggleStatus,
  onRename,
  onDelete,
}) {
  if (devices.length === 0) {
    return (
      <div className="bg-white mx-6 mt-6 rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <p className="text-gray-500">暂无符合条件的设备</p>
      </div>
    )
  }

  return (
    <div className="bg-white mx-6 mt-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">机型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {devices.map((device, index) => (
              <tr key={device.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{device.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{device.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={device.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{device.model}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <ActionButton onClick={() => onControl(device)}>操控</ActionButton>
                    <ActionButton onClick={() => onDetail(device)}>详情</ActionButton>
                    <ActionButton onClick={() => onFingerprint(device)}>指纹</ActionButton>
                    <ActionButton variant="warning" onClick={() => onSkin(device)}>
                      换肤
                      <ChevronDown size={12} className="inline ml-0.5" />
                    </ActionButton>
                    <ActionButton
                      variant="warning"
                      onClick={() => onToggleStatus(device.id)}
                    >
                      {device.status === '运行中' ? '停止' : '启动'}
                    </ActionButton>
                    <ActionButton onClick={() => onRename(device)}>改名</ActionButton>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <ActionButton variant="danger" onClick={() => onDelete(device.id)}>删除</ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
