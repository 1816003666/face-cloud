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
  const [deviceLogs, setDeviceLogs] = useState(mockData.deviceLogs)
  const [files, setFiles] = useState(mockData.files)
  const [statistics] = useState(mockData.statistics)
  const [images, setImages] = useState(mockData.images)

  const value = {
    devices, setDevices,
    groups, setGroups,
    apps, setApps,
    scripts, setScripts,
    tasks, setTasks,
    alerts, setAlerts,
    users, setUsers,
    auditLogs, setAuditLogs,
    deviceLogs, setDeviceLogs,
    files, setFiles,
    statistics,
    images, setImages,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)