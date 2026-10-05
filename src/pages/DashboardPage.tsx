import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useNetworkData, alertText } from '../context/NetworkDataContext';
import { useAuth } from '../context/AuthContext';
import {
  Server,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  GitFork,
  ShieldAlert,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { CPU_THRESHOLD, RAM_THRESHOLD } from '../context/NetworkDataContext';

export const DashboardPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const { devices, alerts, vlans, refreshTelemetry, isTelemetrySyncing, lastSyncAt } = useNetworkData();
  const { currentUser, isViewer } = useAuth();
  const navigate = useNavigate();

  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const warningDevices = devices.filter(d => d.status === 'warning').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const highCpuDevices = devices.filter(d => d.cpu >= CPU_THRESHOLD).length;
  const highRamDevices = devices.filter(d => d.ram >= RAM_THRESHOLD).length;
  const activeCriticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status === 'active');

  // Realistic telemetry data points (Gbps)
  const trafficData = [
    { time: '12:00', inbound: 4.8, outbound: 3.2 },
    { time: '13:00', inbound: 5.4, outbound: 3.8 },
    { time: '14:00', inbound: 6.9, outbound: 4.5 },
    { time: '15:00', inbound: 7.8, outbound: 5.1 },
    { time: '16:00', inbound: 8.6, outbound: 5.9 },
    { time: '17:00', inbound: 8.2, outbound: 5.4 },
  ];

  // CPU & RAM telemetry
  const resourceData = [
    { time: '12:00', cpu: 28, ram: 44 },
    { time: '13:00', cpu: 32, ram: 46 },
    { time: '14:00', cpu: 45, ram: 52 },
    { time: '15:00', cpu: 58, ram: 60 },
    { time: '16:00', cpu: 64, ram: 65 },
    { time: '17:00', cpu: 48, ram: 58 },
  ];

  // Top VLANs traffic consumption
  const vlanChartData = vlans.slice(0, 5).map(v => ({
    name: `VLAN ${v.id}`,
    traffic: v.trafficRateMbps,
    fullName: v.name,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('navDashboard')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cisco DNA Center & PRTG Enterprise NOC Telemetry Suite · Welcome, {currentUser?.name} ({currentUser?.role})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{t('lastSyncTime')}: {lastSyncAt.slice(11)}</span>
          </div>

          <button
            onClick={refreshTelemetry}
            disabled={isTelemetrySyncing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTelemetrySyncing ? 'animate-spin' : ''}`} />
            <span>{t('refreshData')}</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards: device counts by status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Devices */}
        <div onClick={() => navigate('/devices')} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-cyan-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">{t('totalHardware')}</span>
            <Server className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">{totalDevices}</div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">Router · Switch · Firewall · Server</div>
        </div>

        {/* Online */}
        <div onClick={() => navigate('/devices?status=online')} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-emerald-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">{t('statusOnline')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">{onlineDevices}</div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
            {totalDevices > 0 ? ((onlineDevices / totalDevices) * 100).toFixed(1) : '0.0'}%
          </div>
        </div>

        {/* Warning (CPU / Memory over threshold) */}
        <div onClick={() => navigate('/devices?status=warning')} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">{t('statusWarning')}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-500 tabular-nums">{warningDevices}</div>
          <div className="mt-1 text-[11px] text-amber-500 font-mono">
            CPU ≥ {CPU_THRESHOLD}%: {highCpuDevices} · RAM ≥ {RAM_THRESHOLD}%: {highRamDevices}
          </div>
        </div>

        {/* Offline */}
        <div onClick={() => navigate('/devices?status=offline')} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-rose-400 transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-medium uppercase tracking-wider">{t('statusOffline')}</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">{offlineDevices}</div>
          <div className="mt-1 text-[11px] text-slate-500 font-mono">ICMP unreachable</div>
        </div>
      </div>

      {/* Middle Row: Real-time Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Traffic Load Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-500" />
                {t('telemetryTitle')}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Inbound WAN vs Outbound LAN Traffic Load
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500"></span> Inbound (Peak 8.6 Gbps)
              </span>
              <span className="flex items-center gap-1.5 text-blue-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span> Outbound (5.9 Gbps)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="G" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Area type="monotone" dataKey="inbound" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" />
                <Area type="monotone" dataKey="outbound" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health & PRTG Scoreboard */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {t('systemHealth')}
              </h2>
              <span className="text-xs font-mono font-bold text-emerald-500">96.4% NOMINAL</span>
            </div>

            {/* Health Meter Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mb-4">
              <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full w-[96.4%] rounded-full"></div>
            </div>

            {/* Mini Probe Counters */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
                <span className="text-slate-600 dark:text-slate-300">SNMP Probe Status</span>
                <span className={`font-mono font-semibold ${offlineDevices > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{totalDevices - offlineDevices} / {totalDevices} Responding</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
                <span className="text-slate-600 dark:text-slate-300">Core BGP Peering</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">2 / 2 Established</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50">
                <span className="text-slate-600 dark:text-slate-300">Active High-Priority Alarms</span>
                <span className="font-mono text-rose-500 font-bold">{activeCriticalAlerts.length} Critical</span>
              </div>
            </div>
          </div>

          {/* Interactive Topology Quick Preview Card */}
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-cyan-500" />
                {t('topologyPreview')}
              </span>
              <button
                onClick={() => navigate('/topology')}
                className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
              >
                {t('viewFullTopology')} →
              </button>
            </div>
            <div
              onClick={() => navigate('/topology')}
              className="h-24 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-2 relative overflow-hidden cursor-pointer group flex items-center justify-center"
            >
              {/* Abstract mini topology nodes visualization */}
              <div className="absolute inset-0 bg-radial from-cyan-100/60 dark:from-cyan-900/20 to-transparent"></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-[10px] text-white font-mono shadow-xs">
                  WAN
                </div>
                <div className="w-8 h-0.5 bg-cyan-500"></div>
                <div className="w-7 h-7 rounded-md bg-cyan-600 flex items-center justify-center text-[10px] text-white font-mono shadow-xs">
                  CORE
                </div>
                <div className="w-8 h-0.5 bg-cyan-500"></div>
                <div className="w-6 h-6 rounded-md bg-purple-600 flex items-center justify-center text-[10px] text-white font-mono shadow-xs">
                  DIST
                </div>
              </div>
              <div className="absolute bottom-1 right-2 text-[9px] text-slate-500 font-mono group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                Click to explore 5-tier topology map
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Top VLANs Usage & Critical Alerts Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top VLANs Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                {t('topVlansTitle')}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Active segment consumption (Mbps)
              </span>
            </div>
            {!isViewer && (
              <button
                onClick={() => navigate('/vlans')}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
              >
                {t('vlanAnalytics')} →
              </button>
            )}
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vlanChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="M" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Bar dataKey="traffic" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Critical Alerts Incident Stream */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                {t('criticalIncidents')}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Actionable NOC alerts requiring investigation
              </span>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
            >
              {t('viewAllAlerts')} →
            </button>
          </div>

          <div className="space-y-2.5">
            {alerts.slice(0, 3).map(alert => (
              <div
                key={alert.id}
                onClick={() => navigate('/alerts')}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  alert.severity === 'critical'
                    ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 hover:border-rose-500'
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60 hover:border-amber-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                        alert.severity === 'critical' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">{alert.deviceName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp.slice(11)}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{alertText(alert, lang).message}</p>
                {alert.notes.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <span>Note:</span>
                    <span className="italic truncate">{alert.notes[0].text}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
