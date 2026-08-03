// 魔云腾云手机镜像数据
export const images = [
  // C1/Q1/R1S 机型
  {
    id: 'img-cq10-gms',
    name: 'MYT-CQ10-GMS-v2.1.0',
    model: 'C1/Q1/R1S',
    android: 'Android 10',
    variant: 'GMS',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:Q10_gms_202512051727',
    size: '1.8GB',
    status: '已拉取',
    pullTime: '2026-07-28 16:00:00',
    desc: '含谷歌服务套件',
  },
  {
    id: 'img-cq10-xp',
    name: 'MYT-CQ10-XP-v2.1.0',
    model: 'C1/Q1/R1S',
    android: 'Android 10',
    variant: 'XP',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:Q10_xp_202512051541',
    size: '2.1GB',
    status: '已拉取',
    pullTime: '2026-07-28 16:10:00',
    desc: '含Xposed框架+Magisk+LSPosed',
  },
  {
    id: 'img-cq12-gms',
    name: 'MYT-CQ12-GMS-v24.12.0',
    model: 'C1/Q1/R1S',
    android: 'Android 12',
    variant: 'GMS',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:Q12_gms_202510101644',
    size: '2.0GB',
    status: '已拉取',
    pullTime: '2026-07-28 16:20:00',
    desc: '含谷歌服务套件',
  },
  {
    id: 'img-cq12-base',
    name: 'MYT-CQ12-BASE-v24.12.0',
    model: 'C1/Q1/R1S',
    android: 'Android 12',
    variant: 'BASE',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:Q12_base_202510101731',
    size: '1.5GB',
    status: '已拉取',
    pullTime: '2026-07-28 16:30:00',
    desc: '基础版，无谷歌服务',
  },
  {
    id: 'img-cqr14-gms',
    name: '特别版-CQR14-GMS-v0.1.1',
    model: 'C1/Q1/R1S',
    android: 'Android 14',
    variant: 'GMS',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:Q14_vivo_V2302A_gms_202512081750',
    size: '2.3GB',
    status: '未拉取',
    pullTime: null,
    desc: 'vivo V2302A机型+谷歌服务',
  },
  {
    id: 'img-cqr14-base',
    name: '特别版-CQR14-BASE-v0.1.0',
    model: 'C1/Q1/R1S',
    android: 'Android 14',
    variant: 'BASE',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:Q14_vivo_V2302A_base_202512021649',
    size: '1.8GB',
    status: '未拉取',
    pullTime: null,
    desc: 'vivo V2302A机型基础版',
  },
  // P1 机型
  {
    id: 'img-p10-base',
    name: 'MYT-P10-BASE-v0.4.0',
    model: 'P1',
    android: 'Android 10',
    variant: 'BASE',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:P10_base_202509221352',
    size: '1.4GB',
    status: '已拉取',
    pullTime: '2026-07-27 09:00:00',
    desc: 'P1基础版',
  },
  {
    id: 'img-p10-gms',
    name: 'MYT-P10-GMS-v0.4.0',
    model: 'P1',
    android: 'Android 10',
    variant: 'GMS',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:P10_gms_202509221226',
    size: '1.7GB',
    status: '已拉取',
    pullTime: '2026-07-27 09:10:00',
    desc: 'P1含谷歌服务套件',
  },
  {
    id: 'img-p14-gms',
    name: 'MYT-P14-GMS-v0.8.0',
    model: 'P1',
    android: 'Android 14',
    variant: 'GMS',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:P14_gms_202509221801',
    size: '2.2GB',
    status: '未拉取',
    pullTime: null,
    desc: 'P1 Android14含谷歌服务',
  },
  {
    id: 'img-p14-base',
    name: 'MYT-P14-BASE-v0.8.0',
    model: 'P1',
    android: 'Android 14',
    variant: 'BASE',
    registry: 'registry.cn-guangzhou.aliyuncs.com/mytos/dobox:P14_base_202509221851',
    size: '1.7GB',
    status: '未拉取',
    pullTime: null,
    desc: 'P1 Android14基础版',
  },
]

// 设备数据（已关联魔云腾镜像）
export const devices = [
  { id: 1, name: 'MYT-Q1-001', status: '运行中', model: 'Zeus Q1', groupId: 'group-1', ip: '192.168.1.101', lastActive: '2026-07-29 10:30:00', imageId: 'img-cq12-gms', image: 'MYT-CQ12-GMS-v24.12.0' },
  { id: 2, name: 'MYT-Q1-002', status: '运行中', model: 'Zeus Q1', groupId: 'group-1', ip: '192.168.1.102', lastActive: '2026-07-29 10:28:00', imageId: 'img-cq12-gms', image: 'MYT-CQ12-GMS-v24.12.0' },
  { id: 3, name: 'MYT-Q1-003', status: '运行中', model: 'Zeus Q1', groupId: 'group-2', ip: '192.168.1.103', lastActive: '2026-07-29 10:25:00', imageId: 'img-cq12-base', image: 'MYT-CQ12-BASE-v24.12.0' },
  { id: 4, name: 'MYT-Q1-004', status: '运行中', model: 'Zeus Q1', groupId: 'group-1', ip: '192.168.1.104', lastActive: '2026-07-29 10:22:00', imageId: 'img-cq10-xp', image: 'MYT-CQ10-XP-v2.1.0' },
  { id: 5, name: 'MYT-Q1-005', status: '已停止', model: 'Zeus Q1', groupId: 'group-2', ip: '192.168.1.105', lastActive: '2026-07-29 09:45:00', imageId: 'img-cq10-gms', image: 'MYT-CQ10-GMS-v2.1.0' },
  { id: 6, name: 'MYT-P1-001', status: '运行中', model: 'P1', groupId: 'group-1', ip: '192.168.1.106', lastActive: '2026-07-29 10:20:00', imageId: 'img-p10-gms', image: 'MYT-P10-GMS-v0.4.0' },
  { id: 7, name: 'MYT-P1-002', status: '运行中', model: 'P1', groupId: 'group-1', ip: '192.168.1.107', lastActive: '2026-07-29 10:18:00', imageId: 'img-p10-base', image: 'MYT-P10-BASE-v0.4.0' },
  { id: 8, name: 'MYT-Q1-006', status: '运行中', model: 'Zeus Q1', groupId: 'group-2', ip: '192.168.1.108', lastActive: '2026-07-29 10:15:00', imageId: 'img-cq12-gms', image: 'MYT-CQ12-GMS-v24.12.0' },
  { id: 9, name: 'MYT-Q1-007', status: '运行中', model: 'Zeus Q1', groupId: 'group-1', ip: '192.168.1.109', lastActive: '2026-07-29 10:12:00', imageId: 'img-cq10-gms', image: 'MYT-CQ10-GMS-v2.1.0' },
  { id: 10, name: 'MYT-P1-003', status: '离线', model: 'P1', groupId: 'group-1', ip: '192.168.1.110', lastActive: '2026-07-28 23:30:00', imageId: 'img-p10-base', image: 'MYT-P10-BASE-v0.4.0' },
  { id: 11, name: 'MYT-Q1-008', status: '运行中', model: 'Zeus Q1', groupId: 'group-2', ip: '192.168.1.111', lastActive: '2026-07-29 10:05:00', imageId: 'img-cq10-xp', image: 'MYT-CQ10-XP-v2.1.0' },
  { id: 12, name: 'MYT-Q1-009', status: '运行中', model: 'Zeus Q1', groupId: 'group-1', ip: '192.168.1.112', lastActive: '2026-07-29 10:00:00', imageId: 'img-cq12-base', image: 'MYT-CQ12-BASE-v24.12.0' },
]

// 分组数据
export const groups = [
  { id: 'group-1', name: '默认分组', createdAt: '2026-01-15' },
  { id: 'group-2', name: '测试分组', createdAt: '2026-02-20' },
  { id: 'group-3', name: '生产环境', createdAt: '2026-03-10' },
]

// 应用数据
export const apps = [
  { id: 'app-1', name: '微信', packageName: 'com.tencent.mm', version: '8.0.42', installed: 12, size: '258MB' },
  { id: 'app-2', name: '抖音', packageName: 'com.ss.android.ugc.aweme', version: '24.5.0', installed: 10, size: '186MB' },
  { id: 'app-3', name: '支付宝', packageName: 'com.eg.android.AlipayGphone', version: '10.5.26', installed: 11, size: '145MB' },
  { id: 'app-4', name: '淘宝', packageName: 'com.taobao.taobao', version: '10.26.10', installed: 9, size: '198MB' },
  { id: 'app-5', name: '京东', packageName: 'com.jingdong.app.mall', version: '12.4.2', installed: 8, size: '167MB' },
  { id: 'app-6', name: '美团', packageName: 'com.sankuai.meituan', version: '12.10.202', installed: 7, size: '123MB' },
]

// 脚本数据
export const scripts = [
  { id: 'script-1', name: '自动点赞脚本', status: '就绪', runs: 156, lastRun: '2026-07-28 15:30:00', duration: '2分30秒' },
  { id: 'script-2', name: '批量关注脚本', status: '运行中', runs: 89, lastRun: '2026-07-29 09:00:00', duration: '1分15秒' },
  { id: 'script-3', name: '自动评论脚本', status: '就绪', runs: 234, lastRun: '2026-07-27 18:45:00', duration: '3分00秒' },
  { id: 'script-4', name: '每日签到脚本', status: '就绪', runs: 45, lastRun: '2026-07-29 08:00:00', duration: '0分45秒' },
]

// 任务数据
export const tasks = [
  { id: 'task-1', name: '每日签到', schedule: '0 8 * * *', status: '启用', nextRun: '2026-07-30 08:00:00', devices: 10 },
  { id: 'task-2', name: '数据备份', schedule: '0 2 * * *', status: '启用', nextRun: '2026-07-30 02:00:00', devices: 12 },
  { id: 'task-3', name: '自动发布', schedule: '0 10,18 * * *', status: '禁用', nextRun: '-', devices: 5 },
  { id: 'task-4', name: '清理缓存', schedule: '0 4 * * 0', status: '启用', nextRun: '2026-08-04 04:00:00', devices: 12 },
]

// 告警数据
export const alerts = [
  { id: 'alert-1', type: '设备离线', message: '演示机-010 已离线超过12小时', level: 'warning', time: '2026-07-29 10:15:00', handled: false },
  { id: 'alert-2', type: '存储不足', message: '演示机-005 存储空间不足20%', level: 'error', time: '2026-07-29 09:45:00', handled: false },
  { id: 'alert-3', type: '任务失败', message: '每日签到任务执行失败', level: 'error', time: '2026-07-29 08:05:00', handled: true },
  { id: 'alert-4', type: '电池异常', message: '演示机-003 电池温度过高', level: 'warning', time: '2026-07-28 22:30:00', handled: true },
]

// 用户数据
export const users = [
  { id: 'user-1', username: 'admin', role: '管理员', status: '正常', lastLogin: '2026-07-29 08:00:00', email: 'admin@example.com' },
  { id: 'user-2', username: 'operator', role: '操作员', status: '正常', lastLogin: '2026-07-28 16:30:00', email: 'operator@example.com' },
  { id: 'user-3', username: 'viewer', role: '观察员', status: '禁用', lastLogin: '2026-07-20 10:00:00', email: 'viewer@example.com' },
]

// 审计日志数据
export const auditLogs = [
  { id: 'log-1', user: 'admin', action: '创建设备', target: '演示机-012', time: '2026-07-29 10:00:00', ip: '192.168.1.100', detail: '创建新设备' },
  { id: 'log-2', user: 'operator', action: '启动脚本', target: '批量关注脚本', time: '2026-07-29 09:30:00', ip: '192.168.1.105', detail: '在10台设备上执行' },
  { id: 'log-3', user: 'admin', action: '删除设备', target: '演示机-009', time: '2026-07-29 09:00:00', ip: '192.168.1.100', detail: '设备已移除' },
  { id: 'log-4', user: 'admin', action: '修改分组', target: '默认分组', time: '2026-07-28 17:00:00', ip: '192.168.1.100', detail: '重命名分组' },
  { id: 'log-5', user: 'operator', action: '批量重启', target: '5台设备', time: '2026-07-28 15:30:00', ip: '192.168.1.105', detail: '批量操作成功' },
]

// 设备日志数据
export const deviceLogs = [
  { id: 'dlog-1', deviceId: 1, deviceName: '演示机-001', level: 'INFO', message: '设备启动成功', time: '2026-07-29 08:00:00' },
  { id: 'dlog-2', deviceId: 2, deviceName: '演示机-002', level: 'INFO', message: '应用微信启动', time: '2026-07-29 08:05:00' },
  { id: 'dlog-3', deviceId: 5, deviceName: '演示机-005', level: 'ERROR', message: '存储空间不足', time: '2026-07-29 09:45:00' },
  { id: 'dlog-4', deviceId: 10, deviceName: '演示机-010', level: 'WARNING', message: '设备连接超时', time: '2026-07-28 23:30:00' },
]

// 文件数据
export const files = [
  { id: 'file-1', name: '配置文件.zip', size: '2.5MB', uploadTime: '2026-07-29 09:00:00', type: '配置' },
  { id: 'file-2', name: '脚本包.zip', size: '1.2MB', uploadTime: '2026-07-28 14:30:00', type: '脚本' },
  { id: 'file-3', name: '图片素材.zip', size: '15.8MB', uploadTime: '2026-07-27 10:00:00', type: '素材' },
]

// 统计数据
export const statistics = {
  deviceUsage: [
    { date: '07-23', online: 10, offline: 2 },
    { date: '07-24', online: 11, offline: 1 },
    { date: '07-25', online: 9, offline: 3 },
    { date: '07-26', online: 12, offline: 0 },
    { date: '07-27', online: 11, offline: 1 },
    { date: '07-28', online: 10, offline: 2 },
    { date: '07-29', online: 11, offline: 1 },
  ],
  taskExecution: [
    { date: '07-23', success: 45, failed: 2 },
    { date: '07-24', success: 52, failed: 1 },
    { date: '07-25', success: 38, failed: 3 },
    { date: '07-26', success: 60, failed: 0 },
    { date: '07-27', success: 55, failed: 1 },
    { date: '07-28', success: 48, failed: 2 },
    { date: '07-29', success: 50, failed: 1 },
  ],
  appUsage: [
    { name: '微信', sessions: 1250 },
    { name: '抖音', sessions: 980 },
    { name: '支付宝', sessions: 756 },
    { name: '淘宝', sessions: 623 },
    { name: '京东', sessions: 512 },
  ],
}