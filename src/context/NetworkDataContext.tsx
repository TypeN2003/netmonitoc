import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  NetworkDevice,
  DeviceType,
  PortInfo,
  VlanInfo,
  AccessPoint,
  ClientSession,
  TopologyNode,
  TopologyLink,
  IncidentAlert,
  SyslogEntry,
  SystemSettings,
  Role,
  ConfigBackup,
} from '../types';

interface NetworkDataContextType {
  devices: NetworkDevice[];
  portsByDevice: Record<string, PortInfo[]>;
  vlans: VlanInfo[];
  accessPoints: AccessPoint[];
  clients: ClientSession[];
  topologyNodes: TopologyNode[];
  topologyLinks: TopologyLink[];
  alerts: IncidentAlert[];
  syslogs: SyslogEntry[];
  settings: SystemSettings;
  backups: ConfigBackup[];
  isBackingUp: boolean;
  addDevice: (device: Omit<NetworkDevice, 'id' | 'uptime' | 'lastSeen'>) => void;
  updateDevice: (id: string, updates: Partial<NetworkDevice>) => void;
  deleteDevice: (id: string) => void;
  provisionDeviceFromConfig: (
    device: Omit<NetworkDevice, 'id' | 'uptime' | 'lastSeen'>,
    topology: { parentNodeId: string | null; linkType: TopologyLink['linkType'] },
    author: string
  ) => NetworkDevice;
  createBackup: (
    deviceId: string,
    versionTag: string,
    triggerType: 'manual' | 'scheduled' | 'pre-change',
    author: string,
    notes?: string
  ) => ConfigBackup;
  deleteBackup: (backupId: string) => void;
  restoreBackup: (backupId: string, author: string) => void;
  runGlobalBackup: (author: string, onProgress?: (percent: number, currentDevice: string) => void) => Promise<void>;
  togglePortState: (deviceId: string, portId: number) => void;
  addVlan: (vlan: Omit<VlanInfo, 'activePorts' | 'trafficRateMbps'>) => void;
  rebootAccessPoint: (apId: string) => Promise<void>;
  updateTopologyNodePosition: (id: string, x: number, y: number) => void;
  addTopologyNode: (node: Omit<TopologyNode, 'id'>) => void;
  deleteTopologyNode: (id: string) => void;
  toggleSubtreeCollapse: (nodeId: string) => void;
  connectTopologyLink: (source: string, target: string, linkType: TopologyLink['linkType']) => boolean;
  updateTopologyLinkType: (linkId: string, linkType: TopologyLink['linkType']) => void;
  deleteTopologyLink: (linkId: string) => void;
  saveTopologyLayout: () => void;
  acknowledgeAlert: (alertId: string, noteText: string, author: string, role: Role) => void;
  resolveAlert: (alertId: string) => void;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  refreshTelemetry: () => void;
  isTelemetrySyncing: boolean;
  lastSyncAt: string;
}

const INITIAL_DEVICES: NetworkDevice[] = [
  {
    id: 'dev-rtr-01',
    name: 'WAN-Edge-RTR-01',
    ip: '192.168.100.1',
    mac: '00:1A:2B:3C:4D:01',
    type: 'Router',
    vendor: 'Cisco Systems',
    model: 'Catalyst 8300-1N1S-4T2X',
    location: 'Building A - Datacenter Core',
    rack: 'Rack-A1 (Unit 42)',
    status: 'online',
    uptime: '148d 14h 22m',
    cpu: 24,
    ram: 42,
    temp: 38,
    portsTotal: 8,
    portsUp: 7,
    pingMs: 1.2,
    lastSeen: 'Just now',
    firmware: 'IOS-XE 17.09.03a',
    snmpCommunity: 'public_ro',
    config: 'hostname WAN-Edge-RTR-01\nip routing\ninterface GigabitEthernet0/0/0\n ip address 192.168.100.1 255.255.255.0\n no shutdown',
  },
  {
    id: 'dev-fw-01',
    name: 'Perimeter-NGFW-Cluster',
    ip: '192.168.100.2',
    mac: '00:1A:2B:3C:4D:02',
    type: 'Firewall',
    vendor: 'Fortinet',
    model: 'FortiGate 200F Enterprise',
    location: 'Building A - Datacenter Core',
    rack: 'Rack-A1 (Unit 40)',
    status: 'online',
    uptime: '210d 06h 11m',
    cpu: 31,
    ram: 58,
    temp: 41,
    portsTotal: 18,
    portsUp: 16,
    pingMs: 0.8,
    lastSeen: 'Just now',
    firmware: 'FortiOS 7.4.2-build0503',
    snmpCommunity: 'public_ro',
  },
  {
    id: 'dev-core-01',
    name: 'Core-L3-SW-01',
    ip: '10.10.0.1',
    mac: '00:1A:2B:3C:4D:03',
    type: 'Core Switch',
    vendor: 'Cisco Systems',
    model: 'Catalyst 9500-48Y4C High-Perf',
    location: 'Building A - Datacenter Core',
    rack: 'Rack-A2 (Unit 36)',
    status: 'online',
    uptime: '92d 19h 45m',
    cpu: 18,
    ram: 37,
    temp: 36,
    portsTotal: 48,
    portsUp: 44,
    pingMs: 0.4,
    lastSeen: 'Just now',
    firmware: 'Cisco IOS-XE 17.11.01',
    snmpCommunity: 'public_ro',
  },
  {
    id: 'dev-dist-01',
    name: 'Dist-SW-EastWing',
    ip: '10.10.0.2',
    mac: '00:1A:2B:3C:4D:04',
    type: 'Distribution Switch',
    vendor: 'Cisco Systems',
    model: 'Catalyst 9300-48UXM mGig PoE+',
    location: 'Building B - East IDF Room',
    rack: 'IDF-B1 (Unit 12)',
    status: 'online',
    uptime: '64d 02h 10m',
    cpu: 27,
    ram: 45,
    temp: 39,
    portsTotal: 48,
    portsUp: 38,
    pingMs: 1.5,
    lastSeen: 'Just now',
    firmware: 'Cisco IOS-XE 17.10.01',
    snmpCommunity: 'public_ro',
  },
  {
    id: 'dev-dist-02',
    name: 'Dist-SW-WestWing',
    ip: '10.10.0.3',
    mac: '00:1A:2B:3C:4D:05',
    type: 'Distribution Switch',
    vendor: 'Cisco Systems',
    model: 'Catalyst 9300-48P PoE+',
    location: 'Building C - West IDF Room',
    rack: 'IDF-C2 (Unit 14)',
    status: 'warning',
    uptime: '38d 14h 50m',
    cpu: 89,
    ram: 78,
    temp: 54,
    portsTotal: 48,
    portsUp: 34,
    pingMs: 4.8,
    lastSeen: 'Just now',
    firmware: 'Cisco IOS-XE 17.10.01',
    snmpCommunity: 'public_ro',
  },
  {
    id: 'dev-edge-01',
    name: 'Edge-SW-ComputerLab',
    ip: '10.10.10.15',
    mac: '00:1A:2B:3C:4D:06',
    type: 'Edge Switch',
    vendor: 'Aruba Networks',
    model: 'CX 6200F 48G Class 4 PoE',
    location: 'Building B - Lab Floor 2',
    rack: 'Rack-Lab2 (Unit 04)',
    status: 'online',
    uptime: '42d 08h 12m',
    cpu: 22,
    ram: 34,
    temp: 35,
    portsTotal: 48,
    portsUp: 41,
    pingMs: 2.1,
    lastSeen: 'Just now',
    firmware: 'AOS-CX 10.12.0006',
    snmpCommunity: 'public_ro',
  },
  {
    id: 'dev-srv-01',
    name: 'SRV-HyperV-Cluster-01',
    ip: '10.10.100.10',
    mac: '00:1A:2B:3C:4D:07',
    type: 'Server',
    vendor: 'Dell Technologies',
    model: 'PowerEdge R750xs Rack Server',
    location: 'Building A - Datacenter Core',
    rack: 'Rack-A3 (Unit 20)',
    status: 'online',
    uptime: '112d 04h 30m',
    cpu: 45,
    ram: 68,
    temp: 32,
    portsTotal: 8,
    portsUp: 6,
    pingMs: 0.3,
    lastSeen: 'Just now',
    firmware: 'iDRAC9 Enterprise 6.10',
    snmpCommunity: 'public_ro',
  },
];

// Demo: one unreachable distribution switch, plus the alert and syslog entry it would have raised
const OFFLINE_DEMO_DEVICE: NetworkDevice = {
  id: 'dev-dist-03',
  name: 'Dist-SW-Library',
  ip: '10.10.0.4',
  mac: '00:1A:2B:3C:4D:08',
  type: 'Distribution Switch',
  vendor: 'Cisco Systems',
  model: 'Catalyst 9300-24P',
  location: 'Building D - Library IDF',
  rack: 'IDF-D1 (Unit 10)',
  status: 'offline',
  uptime: 'Offline',
  cpu: 0,
  ram: 0,
  temp: 0,
  portsTotal: 24,
  portsUp: 0,
  pingMs: 0,
  trafficInMbps: 0,
  trafficOutMbps: 0,
  lastSeen: '2026-09-28 15:42:10',
  firmware: 'Cisco IOS-XE 17.09.04',
  snmpCommunity: 'public_ro',
};

const OFFLINE_DEMO_ALERT: IncidentAlert = {
  id: 'alt-offline-dist-03',
  timestamp: '2026-09-28 15:42:10',
  deviceName: OFFLINE_DEMO_DEVICE.name,
  deviceIp: OFFLINE_DEMO_DEVICE.ip,
  severity: 'critical',
  category: 'Device Unreachable',
  message: 'Device stopped responding to ICMP ping and SNMP polling (3 consecutive timeouts). Uplink to Core-L3-SW-01 is down.',
  status: 'active',
  notes: [],
};

const OFFLINE_DEMO_LOG: SyslogEntry = {
  id: 'log-offline-dist-03',
  timestamp: '2026-09-28 15:42:10',
  facility: 'SYSTEM',
  severity: 'Critical',
  host: OFFLINE_DEMO_DEVICE.name,
  ip: OFFLINE_DEMO_DEVICE.ip,
  tag: '%NETMON-2-UNREACHABLE',
  message: 'ICMP/SNMP poll timeout x3 — device marked OFFLINE',
};

// The offline switch on the topology map, in the distribution row with a dead uplink from the core
const OFFLINE_DEMO_NODE: TopologyNode = {
  id: 'node-dist-library',
  label: 'Dist-SW-Library (Building D)',
  ip: '10.10.0.4',
  tier: 4,
  type: 'dist_switch',
  status: 'offline',
  x: 1100,
  y: 460,
  model: 'Catalyst 9300-24P',
};

const OFFLINE_DEMO_LINK: TopologyLink = {
  id: 'link-core-dist-library',
  source: 'node-core-sw',
  target: OFFLINE_DEMO_NODE.id,
  speed: '10 Gbps (DOWN)',
  linkType: 'fiber_10g',
  status: 'down',
};

// The demo switch is always present on load, even in data saved before it existed.
// An earlier version of the demo used an access-layer edge switch; those records are dropped.
const LEGACY_DEMO_IDS = new Set([
  'dev-edge-02',
  'alt-offline-edge-02',
  'log-offline-edge-02',
  'node-edge-sw-library',
  'link-dist-west-library',
]);
const REMOVED_ACCESS_NODE_IDS = new Set(['node-edge-sw-lab', 'node-ap-east', 'node-ap-west']);

// The distribution row was re-centred under the core switch. Saved layouts still at the old
// default x are moved; a node someone dragged elsewhere keeps its position.
const RECENTRED_DIST_X: Record<string, [number, number]> = {
  'node-dist-east': [300, 140],
  'node-dist-west': [620, 460],
  'node-srv-cluster': [940, 780],
  'node-dist-library': [1260, 1100],
};
const recentreDistRow = (n: TopologyNode): TopologyNode => {
  const move = RECENTRED_DIST_X[n.id];
  return move && n.x === move[0] && n.y === 460 ? { ...n, x: move[1] } : n;
};

const withDemoItem =<T extends { id: string }>(list: T[], item: T): T[] => {
  const kept = list.filter(x => !LEGACY_DEMO_IDS.has(x.id));
  return kept.some(x => x.id === item.id) ? kept : [...kept, item];
};

const INITIAL_VLANS: VlanInfo[] = [
  { id: 10, name: 'MGMT-Infrastructure', subnet: '10.10.10.0/24', gateway: '10.10.10.1', activePorts: 32, dhcpTotal: 254, dhcpUsed: 48, trafficRateMbps: 240, status: 'active', description: 'Network switch & router management out-of-band' },
  { id: 20, name: 'CORP-Workstations', subnet: '10.10.20.0/23', gateway: '10.10.20.1', activePorts: 142, dhcpTotal: 510, dhcpUsed: 395, trafficRateMbps: 1840, status: 'active', description: 'Corporate desktop PCs and official laptops' },
  { id: 30, name: 'VOIP-Telephony', subnet: '10.10.30.0/24', gateway: '10.10.30.1', activePorts: 64, dhcpTotal: 254, dhcpUsed: 78, trafficRateMbps: 120, status: 'active', description: 'Cisco IP Phones with QoS priority DSCP 46' },
  { id: 50, name: 'WIFI-Corporate-Secure', subnet: '10.10.50.0/22', gateway: '10.10.50.1', activePorts: 28, dhcpTotal: 1022, dhcpUsed: 780, trafficRateMbps: 3450, status: 'active', description: 'WPA3 Enterprise 802.1X Staff Wireless' },
  { id: 60, name: 'WIFI-Guest-Captive', subnet: '10.10.60.0/22', gateway: '10.10.60.1', activePorts: 28, dhcpTotal: 1022, dhcpUsed: 420, trafficRateMbps: 920, status: 'active', description: 'Isolated visitor Wi-Fi with web portal' },
  { id: 70, name: 'IOT-Facilities-CCTV', subnet: '10.10.70.0/24', gateway: '10.10.70.1', activePorts: 48, dhcpTotal: 254, dhcpUsed: 112, trafficRateMbps: 880, status: 'active', description: 'Axis Security Cameras, Access Control, HVAC' },
  { id: 100, name: 'SERVER-FARM-Core', subnet: '10.10.100.0/24', gateway: '10.10.100.1', activePorts: 24, dhcpTotal: 254, dhcpUsed: 84, trafficRateMbps: 2890, status: 'active', description: 'AD Domain Controllers, SAN Storage, Virtualization' },
];

const INITIAL_APS: AccessPoint[] = [
  {
    id: 'ap-01',
    name: 'AP-Admin-BldgA-Fl1',
    ip: '10.10.10.51',
    mac: 'D4:20:B0:11:01:A1',
    location: 'Building A - Lobby & Reception',
    building: 'Building A (Admin)',
    floor: 'Floor 1',
    ssidList: ['KMUTNB-Enterprise', 'KMUTNB-Guest-Web'],
    channels: { band24: 6, band5: 36, band6: 69 },
    txPowerDbm: 20,
    channelWidthMhz: 80,
    rssiAvg: -58,
    connectedClients: 42,
    cpu: 28,
    ram: 44,
    retryRate: 2.1,
    status: 'online',
    model: 'Cisco Catalyst 9130AX Series Wi-Fi 6',
    uptime: '48d 10h 15m',
  },
  {
    id: 'ap-02',
    name: 'AP-Admin-BldgA-Fl2',
    ip: '10.10.10.52',
    mac: 'D4:20:B0:11:01:A2',
    location: 'Building A - Executive Meeting Suites',
    building: 'Building A (Admin)',
    floor: 'Floor 2',
    ssidList: ['KMUTNB-Enterprise'],
    channels: { band24: 1, band5: 52, band6: 85 },
    txPowerDbm: 18,
    channelWidthMhz: 80,
    rssiAvg: -52,
    connectedClients: 36,
    cpu: 24,
    ram: 38,
    retryRate: 1.4,
    status: 'online',
    model: 'Cisco Catalyst 9130AX Series Wi-Fi 6',
    uptime: '48d 10h 15m',
  },
  {
    id: 'ap-03',
    name: 'AP-Eng-Lab-01',
    ip: '10.10.10.53',
    mac: 'D4:20:B0:11:01:A3',
    location: 'Building B - High-Performance Lab 101',
    building: 'Building B (Engineering)',
    floor: 'Floor 1',
    ssidList: ['KMUTNB-Enterprise', 'KMUTNB-Research-IoT'],
    channels: { band24: 11, band5: 149, band6: 101 },
    txPowerDbm: 23,
    channelWidthMhz: 160,
    rssiAvg: -64,
    connectedClients: 68,
    cpu: 48,
    ram: 62,
    retryRate: 4.8,
    status: 'online',
    model: 'Aruba AP-635 Campus Wi-Fi 6E',
    uptime: '32d 04h 50m',
  },
  {
    id: 'ap-04',
    name: 'AP-Eng-Lab-02',
    ip: '10.10.10.54',
    mac: 'D4:20:B0:11:01:A4',
    location: 'Building B - Embedded Systems Lab 204',
    building: 'Building B (Engineering)',
    floor: 'Floor 2',
    ssidList: ['KMUTNB-Enterprise'],
    channels: { band24: 6, band5: 100 },
    txPowerDbm: 21,
    channelWidthMhz: 80,
    rssiAvg: -68,
    connectedClients: 54,
    cpu: 39,
    ram: 51,
    retryRate: 3.2,
    status: 'online',
    model: 'Aruba AP-635 Campus Wi-Fi 6E',
    uptime: '32d 04h 50m',
  },
  {
    id: 'ap-05',
    name: 'AP-Auditorium-GrandHall',
    ip: '10.10.10.55',
    mac: 'D4:20:B0:11:01:A5',
    location: 'Central Hall - Main Auditorium Stage',
    building: 'Central Complex',
    floor: 'Ground Floor',
    ssidList: ['KMUTNB-Enterprise', 'KMUTNB-Guest-Web'],
    channels: { band24: 1, band5: 44, band6: 37 },
    txPowerDbm: 24,
    channelWidthMhz: 80,
    rssiAvg: -71,
    connectedClients: 115,
    cpu: 72,
    ram: 79,
    retryRate: 8.5,
    status: 'warning',
    model: 'Ruckus R850 Wi-Fi 6 High-Density',
    uptime: '15d 18h 05m',
  },
  {
    id: 'ap-06',
    name: 'AP-Library-EastWing',
    ip: '10.10.10.56',
    mac: 'D4:20:B0:11:01:A6',
    location: 'Learning Center - Silent Study Zone',
    building: 'Library Center',
    floor: 'Floor 3',
    ssidList: ['KMUTNB-Enterprise', 'KMUTNB-Guest-Web'],
    channels: { band24: 11, band5: 60 },
    txPowerDbm: 17,
    channelWidthMhz: 40,
    rssiAvg: -55,
    connectedClients: 49,
    cpu: 26,
    ram: 40,
    retryRate: 1.8,
    status: 'online',
    model: 'Cisco Catalyst 9120AX Series',
    uptime: '72d 11h 20m',
  },
  {
    id: 'ap-07',
    name: 'AP-Outdoor-Courtyard',
    ip: '10.10.10.57',
    mac: 'D4:20:B0:11:01:A7',
    location: 'Campus Quad - Outdoor Canopy Plaza',
    building: 'Outdoor Zone',
    floor: 'Open Air',
    ssidList: ['KMUTNB-Guest-Web'],
    channels: { band24: 6, band5: 157 },
    txPowerDbm: 27,
    channelWidthMhz: 40,
    rssiAvg: -74,
    connectedClients: 29,
    cpu: 31,
    ram: 43,
    retryRate: 5.1,
    status: 'online',
    model: 'Cisco Catalyst 9124AX Outdoor IP67',
    uptime: '19d 07h 40m',
  },
  {
    id: 'ap-08',
    name: 'AP-Canteen-Dining',
    ip: '10.10.10.58',
    mac: 'D4:20:B0:11:01:A8',
    location: 'Student Center - Food Court',
    building: 'Student Union',
    floor: 'Floor 1',
    ssidList: ['KMUTNB-Enterprise', 'KMUTNB-Guest-Web'],
    channels: { band24: 1, band5: 116 },
    txPowerDbm: 22,
    channelWidthMhz: 80,
    rssiAvg: -66,
    connectedClients: 82,
    cpu: 44,
    ram: 57,
    retryRate: 3.9,
    status: 'online',
    model: 'Aruba AP-555 Wi-Fi 6',
    uptime: '28d 14h 10m',
  },
];

const INITIAL_CLIENTS: ClientSession[] = [
  { id: 'cli-01', hostname: 'MacBook-Pro-Admin-04', ip: '10.10.50.114', mac: 'BC:D0:74:3E:99:A1', connectedNode: 'AP-Admin-BldgA-Fl2', nodeType: 'AP', vlanId: 50, ssid: 'KMUTNB-Enterprise', band: '6 GHz', rssi: -48, rxRateMbps: 1850, txRateMbps: 1200, duration: '4h 12m', osVendor: 'Apple Inc.', osType: 'Apple', status: 'active' },
  { id: 'cli-02', hostname: 'Dell-Precision-Lab-32', ip: '10.10.20.45', mac: '70:B5:E8:4A:11:D3', connectedNode: 'Edge-SW-ComputerLab', nodeType: 'Switch', vlanId: 20, band: 'Ethernet', rssi: -20, rxRateMbps: 1000, txRateMbps: 1000, duration: '28h 05m', osVendor: 'Dell Technologies', osType: 'Windows', status: 'active' },
  { id: 'cli-03', hostname: 'iPhone-15-Pro-Dean', ip: '10.10.50.88', mac: 'F4:34:F0:8A:23:C9', connectedNode: 'AP-Admin-BldgA-Fl2', nodeType: 'AP', vlanId: 50, ssid: 'KMUTNB-Enterprise', band: '5 GHz', rssi: -54, rxRateMbps: 866, txRateMbps: 650, duration: '1h 45m', osVendor: 'Apple Inc.', osType: 'Apple', status: 'active' },
  { id: 'cli-04', hostname: 'ThinkPad-T14-Researcher', ip: '10.10.50.198', mac: '48:2A:E3:66:BB:04', connectedNode: 'AP-Eng-Lab-01', nodeType: 'AP', vlanId: 50, ssid: 'KMUTNB-Enterprise', band: '5 GHz', rssi: -62, rxRateMbps: 1200, txRateMbps: 840, duration: '6h 30m', osVendor: 'Lenovo', osType: 'Linux', status: 'active' },
  { id: 'cli-05', hostname: 'Samsung-Galaxy-S24-Ultra', ip: '10.10.60.102', mac: '2C:54:CF:91:EE:82', connectedNode: 'AP-Auditorium-GrandHall', nodeType: 'AP', vlanId: 60, ssid: 'KMUTNB-Guest-Web', band: '5 GHz', rssi: -72, rxRateMbps: 433, txRateMbps: 280, duration: '45m', osVendor: 'Samsung', osType: 'Android', status: 'active' },
  { id: 'cli-06', hostname: 'HP-ColorLaserJet-M553', ip: '10.10.70.40', mac: '00:1E:0B:AA:55:12', connectedNode: 'Dist-SW-EastWing', nodeType: 'Switch', vlanId: 70, band: 'Ethernet', rssi: -20, rxRateMbps: 100, txRateMbps: 100, duration: '142d 10m', osVendor: 'Hewlett-Packard', osType: 'IoT', status: 'idle' },
  { id: 'cli-07', hostname: 'Axis-P3245-CCTV-Corridor', ip: '10.10.70.82', mac: 'AC:CC:8E:12:44:90', connectedNode: 'Dist-SW-WestWing', nodeType: 'Switch', vlanId: 70, band: 'Ethernet', rssi: -20, rxRateMbps: 100, txRateMbps: 100, duration: '84d 18m', osVendor: 'Axis Communications', osType: 'IoT', status: 'active' },
  { id: 'cli-08', hostname: 'iPad-Air-DesignStudio', ip: '10.10.50.210', mac: '60:F8:1D:90:3A:45', connectedNode: 'AP-Library-EastWing', nodeType: 'AP', vlanId: 50, ssid: 'KMUTNB-Enterprise', band: '5 GHz', rssi: -58, rxRateMbps: 866, txRateMbps: 580, duration: '3h 14m', osVendor: 'Apple Inc.', osType: 'Apple', status: 'active' },
  { id: 'cli-09', hostname: 'ASUS-ROG-GamingLab-08', ip: '10.10.20.180', mac: '90:FB:A6:41:00:23', connectedNode: 'Edge-SW-ComputerLab', nodeType: 'Switch', vlanId: 20, band: 'Ethernet', rssi: -20, rxRateMbps: 1000, txRateMbps: 1000, duration: '12h 00m', osVendor: 'ASUSTeK', osType: 'Windows', status: 'active' },
  { id: 'cli-10', hostname: 'Pixel-8-Pro-Guest', ip: '10.10.60.144', mac: '34:7E:5C:DE:09:66', connectedNode: 'AP-Canteen-Dining', nodeType: 'AP', vlanId: 60, ssid: 'KMUTNB-Guest-Web', band: '2.4 GHz', rssi: -65, rxRateMbps: 144, txRateMbps: 110, duration: '22m', osVendor: 'Google LLC', osType: 'Android', status: 'active' },
  { id: 'cli-11', hostname: 'Cisco-CP-8845-DeanOffice', ip: '10.10.30.15', mac: '68:BD:AB:55:01:88', connectedNode: 'Core-L3-SW-01', nodeType: 'Switch', vlanId: 30, band: 'Ethernet', rssi: -20, rxRateMbps: 1000, txRateMbps: 1000, duration: '92d 19h', osVendor: 'Cisco Systems', osType: 'IoT', status: 'active' },
];

const INITIAL_TOPOLOGY_NODES: TopologyNode[] = [
  // Tier 1: WAN / Cloud
  { id: 'node-wan', label: 'Internet / ISP Dual BGP (AIS + TRUE)', ip: '203.158.0.1', tier: 1, type: 'wan', status: 'online', x: 620, y: 50 },

  // Tier 2: Security & Perimeter
  { id: 'node-fw', label: 'Perimeter NGFW HA Cluster', ip: '192.168.100.2', tier: 2, type: 'firewall', status: 'online', x: 620, y: 170, model: 'FortiGate 200F Cluster' },

  // Tier 3: Core L3 Backbone
  { id: 'node-core-sw', label: 'Core-L3-SW-01 (Catalyst 9500)', ip: '10.10.0.1', tier: 3, type: 'core_switch', status: 'online', x: 620, y: 310, model: '48Y4C 100G Core' },

  // Tier 4: Distribution Layer
  { id: 'node-dist-east', label: 'Dist-SW-East (Building B)', ip: '10.10.0.2', tier: 4, type: 'dist_switch', status: 'online', x: 140, y: 460, model: 'Catalyst 9300-48UXM' },
  { id: 'node-dist-west', label: 'Dist-SW-West (Building C)', ip: '10.10.0.3', tier: 4, type: 'dist_switch', status: 'warning', x: 460, y: 460, model: 'Catalyst 9300-48P' },
  { id: 'node-srv-cluster', label: 'Core Server Farm (SAN / Hyper-V)', ip: '10.10.100.10', tier: 4, type: 'server', status: 'online', x: 780, y: 460, model: 'PowerEdge R750 Cluster' },
];

const INITIAL_TOPOLOGY_LINKS: TopologyLink[] = [
  { id: 'link-wan-fw', source: 'node-wan', target: 'node-fw', speed: '40 Gbps', linkType: 'fiber_40g', status: 'up' },
  { id: 'link-fw-core', source: 'node-fw', target: 'node-core-sw', speed: '40 Gbps Trunk', linkType: 'fiber_40g', status: 'up' },
  { id: 'link-core-dist-east', source: 'node-core-sw', target: 'node-dist-east', speed: '10 Gbps LACP', linkType: 'fiber_10g', status: 'up' },
  { id: 'link-core-dist-west', source: 'node-core-sw', target: 'node-dist-west', speed: '10 Gbps LACP', linkType: 'fiber_10g', status: 'degraded' },
  { id: 'link-core-srv', source: 'node-core-sw', target: 'node-srv-cluster', speed: '40 Gbps DAC', linkType: 'fiber_40g', status: 'up' },
];

// Thai text for the built-in alerts, keyed by alert id (also fills alerts saved before Thai existed)
const ALERT_TH: Record<string, { categoryTh: string; messageTh: string }> = {
  'alt-01': {
    categoryTh: 'ทรัพยากรเครื่องใช้งานสูงเกินเกณฑ์',
    messageTh:
      'CPU ใช้งานเกิน 89% และอุณหภูมิภายในตัวเครื่องสูงถึง 54°C (เกณฑ์ 50°C) ตรวจพบแพ็กเก็ตถูกดรอปจาก ARP Inspection จำนวนมาก',
  },
  'alt-02': {
    categoryTh: 'ช่องสัญญาณหนาแน่นและส่งซ้ำสูง',
    messageTh:
      'อัตราการส่งเฟรมซ้ำ (Retry) สูงถึง 8.5% มีผู้ใช้เชื่อมต่อพร้อมกัน 115 เครื่อง ช่องสัญญาณ 44 (5GHz) ถูกใช้งานเกิน 82%',
  },
  'alt-03': {
    categoryTh: 'กำลังแสงของพอร์ตไฟเบอร์ต่ำ',
    messageTh:
      'กำลังรับแสง (RX Power) ของโมดูล SFP+ พอร์ต Te1/1/2 ลดลงเหลือ -18.2 dBm ใกล้ถึงเกณฑ์ขั้นต่ำ -20 dBm',
  },
  'alt-04': {
    categoryTh: 'ระบบป้องกันการบุกรุก (IPS) ทำงาน',
    messageTh: 'IPS บล็อกการสแกนพอร์ตจากภายนอกไปยัง WAN IP 203.158.0.1 จากต้นทาง 45.142.214.88',
  },
  'alt-offline-dist-03': {
    categoryTh: 'อุปกรณ์ขาดการติดต่อ',
    messageTh:
      'อุปกรณ์ไม่ตอบสนองต่อ ICMP Ping และ SNMP Polling (หมดเวลา 3 ครั้งติดต่อกัน) ลิงก์ไปยัง Core-L3-SW-01 ขาด',
  },
};

const withAlertTh = (a: IncidentAlert): IncidentAlert => ({ ...a, ...(ALERT_TH[a.id] ?? {}) });

// Category and message in the viewer's language (falls back to English)
export const alertText = (a: IncidentAlert, lang: 'th' | 'en') => ({
  category: lang === 'th' ? a.categoryTh ?? a.category : a.category,
  message: lang === 'th' ? a.messageTh ?? a.message : a.message,
});

const INITIAL_ALERTS: IncidentAlert[] = [
  {
    id: 'alt-01',
    timestamp: '2026-09-28 16:52:10',
    deviceName: 'Dist-SW-WestWing',
    deviceIp: '10.10.0.3',
    severity: 'critical',
    category: 'High Resource Exhaustion',
    message: 'CPU load exceeded 89% and internal chassis temperature reached 54°C (Threshold: 50°C). High ARP inspection drop rate detected.',
    status: 'active',
    notes: [
      {
        id: 'note-01',
        author: 'Somchai Prasert (Admin)',
        role: 'Admin',
        timestamp: '2026-09-28 16:55:00',
        text: 'ตรวจพบทราฟฟิก Broadcast Storm บนพอร์ต Gi1/0/24 กำลังส่งทีมเข้าตรวจสอบตู้ IDF-C2',
      },
    ],
  },
  {
    id: 'alt-02',
    timestamp: '2026-09-28 16:30:45',
    deviceName: 'AP-Auditorium-GrandHall',
    deviceIp: '10.10.10.55',
    severity: 'warning',
    category: 'High Channel Saturation & Retries',
    message: 'Frame retry rate reached 8.5% with 115 concurrent connected clients. Channel 44 (5GHz) utilization over 82%.',
    status: 'acknowledged',
    acknowledgedBy: 'Kittisak Wongsuwan (Senior NOC Engineer)',
    acknowledgedAt: '2026-09-28 16:35:20',
    notes: [
      {
        id: 'note-02',
        author: 'Kittisak Wongsuwan (Senior NOC Engineer)',
        role: 'Engineer',
        timestamp: '2026-09-28 16:35:20',
        text: 'กำลังปรับจูน Radio Resource Management (RRM) และเปิด Band Steering บังคับไคลเอนต์ไปย่าน 6GHz เพื่อลดความหนาแน่น',
      },
    ],
  },
  {
    id: 'alt-03',
    timestamp: '2026-09-28 15:40:12',
    deviceName: 'Core-L3-SW-01',
    deviceIp: '10.10.0.1',
    severity: 'warning',
    category: 'Interface Optical Power Warning',
    message: 'Optical transceiver SFP+ Te1/1/2 RX Power dropped to -18.2 dBm (Marginal optical budget approaching -20 dBm threshold).',
    status: 'acknowledged',
    acknowledgedBy: 'Somchai Prasert (Lead Admin)',
    acknowledgedAt: '2026-09-28 15:45:10',
    notes: [
      {
        id: 'note-03',
        author: 'Somchai Prasert (Lead Admin)',
        role: 'Admin',
        timestamp: '2026-09-28 15:45:10',
        text: 'สั่งการให้เจ้าหน้าที่เตรียมทำความสะอาดขั้วต่อ Fiber Optic LC connector ช่วง Maintenance window คืนนี้',
      },
    ],
  },
  {
    id: 'alt-04',
    timestamp: '2026-09-28 14:15:00',
    deviceName: 'Perimeter-NGFW-Cluster',
    deviceIp: '192.168.100.2',
    severity: 'info',
    category: 'Intrusion Prevention Event',
    message: 'IPS Engine blocked external reconnaissance port scan on WAN IP 203.158.0.1 from source 45.142.214.88.',
    status: 'resolved',
    notes: [],
  },
];

const INITIAL_SYSLOGS: SyslogEntry[] = [
  { id: 'log-01', timestamp: '2026-09-28 17:10:45', facility: 'LOCAL7', severity: 'Warning', host: 'Dist-SW-WestWing', ip: '10.10.0.3', tag: '%SYS-4-CPURISING', message: 'CPU utilization exceeds threshold (89% > 80%)' },
  { id: 'log-02', timestamp: '2026-09-28 17:08:12', facility: 'AUTH', severity: 'Info', host: 'Core-L3-SW-01', ip: '10.10.0.1', tag: '%SEC-6-AUTH_PASS', message: 'SSH user admin authenticated successfully from 10.10.10.114' },
  { id: 'log-03', timestamp: '2026-09-28 16:59:30', facility: 'SYSTEM', severity: 'Notice', host: 'AP-Admin-BldgA-Fl1', ip: '10.10.10.51', tag: '%DOT11-6-ASSOC', message: 'Station BC:D0:74:3E:99:A1 associated on radio 5GHz with SSID KMUTNB-Enterprise' },
  { id: 'log-04', timestamp: '2026-09-28 16:52:10', facility: 'KERNEL', severity: 'Critical', host: 'Dist-SW-WestWing', ip: '10.10.0.3', tag: '%ENVMON-1-TEMP_HIGH', message: 'Thermal sensor 1 reading 54C exceeds high warning ceiling 50C' },
  { id: 'log-05', timestamp: '2026-09-28 16:40:02', facility: 'LOCAL7', severity: 'Info', host: 'WAN-Edge-RTR-01', ip: '192.168.100.1', tag: '%BGP-5-ADJCHANGE', message: 'Neighbor 203.158.0.254 Up - BGP routing table refreshed' },
  { id: 'log-06', timestamp: '2026-09-28 16:30:45', facility: 'SYSTEM', severity: 'Warning', host: 'AP-Auditorium-GrandHall', ip: '10.10.10.55', tag: '%WLAN-4-HIGH_RETRY', message: 'Radio 1 retry rate 8.5% exceeded 5.0% SLA target' },
  { id: 'log-07', timestamp: '2026-09-28 16:15:22', facility: 'SYSTEM', severity: 'Notice', host: 'Core-L3-SW-01', ip: '10.10.0.1', tag: '%LINEPROTO-5-UPDOWN', message: 'Line protocol on Interface GigabitEthernet1/0/22, changed state to up' },
  { id: 'log-08', timestamp: '2026-09-28 15:55:10', facility: 'AUTH', severity: 'Notice', host: 'Perimeter-NGFW-Cluster', ip: '192.168.100.2', tag: '%FGT-5-VPN_IPSEC', message: 'IPsec tunnel TO_BRANCH_PATTAYA tunnel established' },
];

export const DEFAULT_RUCKUS_ONE_URL = 'https://asia.ruckus.cloud';

const INITIAL_SETTINGS: SystemSettings = {
  ruckusOneUrl: DEFAULT_RUCKUS_ONE_URL,
  snmpInterval: 300, // 5 minutes: keeps polling traffic low on the production network
  pingTimeoutMs: 1500,
  packetLossThreshold: 5,
  telegramBotToken: '6892419021:AAHEu9Wj42801Fkx_netmonitor_bot',
  telegramChatId: '-1002938491028',
  emailNotification: 'noc-alerts@kmutnb.ac.th',
  sessionTimeoutMinutes: 60,
  backupPolicy: {
    lastGlobalBackup: '2026-09-28 02:00:45',
  },
};

// Alert thresholds: a device at or above these values is flagged Warning and raises an alert
export const CPU_THRESHOLD = 85;
export const RAM_THRESHOLD = 90;

// Baseline throughput (Mbps in / out) per device type, used when a device has no traffic data yet
const BASELINE_TRAFFIC: Record<DeviceType, [number, number]> = {
  Router: [850, 420],
  Firewall: [780, 390],
  'Core Switch': [2400, 1900],
  'Distribution Switch': [950, 610],
  'Edge Switch': [320, 180],
  Server: [640, 880],
};

// Where a device of each type sits on the topology map
const TOPOLOGY_PLACEMENT: Record<DeviceType, { type: TopologyNode['type']; tier: TopologyNode['tier'] }> = {
  Router: { type: 'router', tier: 1 },
  Firewall: { type: 'firewall', tier: 2 },
  'Core Switch': { type: 'core_switch', tier: 3 },
  'Distribution Switch': { type: 'dist_switch', tier: 4 },
  'Edge Switch': { type: 'edge_ap', tier: 5 },
  Server: { type: 'server', tier: 4 },
};

const withTraffic = (d: NetworkDevice): NetworkDevice => {
  if (d.trafficInMbps !== undefined && d.trafficOutMbps !== undefined) return d;
  const [inMbps, outMbps] = d.status === 'offline' ? [0, 0] : BASELINE_TRAFFIC[d.type] || [100, 50];
  return { ...d, trafficInMbps: inMbps, trafficOutMbps: outMbps };
};

const fluctuate = (value: number, spread: number) =>
  Math.max(0, Math.round(value * (1 + (Math.random() - 0.5) * spread)));

// Local wall-clock time (the app runs in Thailand, UTC+7), formatted YYYY-MM-DD HH:mm:ss
export const nowTimestamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

// Unique ids even when several records are created in the same millisecond
let idCounter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

const generateMockSha256 = (content: string) => {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b78${hex}`;
};

const INITIAL_BACKUPS: ConfigBackup[] = [
  {
    id: 'bk-01',
    deviceId: 'dev-rtr-01',
    deviceName: 'WAN-Edge-RTR-01',
    deviceIp: '192.168.100.1',
    deviceType: 'Router',
    versionTag: 'v1.4 - Auto-Scheduled Daily',
    timestamp: '2026-09-28 02:00:15',
    sizeKb: 18.4,
    checksumSha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    triggeredBy: 'Auto-Scheduler (CRON)',
    triggerType: 'scheduled',
    format: 'cisco_ios',
    notes: 'Automated nightly snapshot via SCP to 10.10.100.250',
    configContent: `! Cisco IOS-XE Software, Version 17.09.03a
! Running configuration for WAN-Edge-RTR-01
hostname WAN-Edge-RTR-01
!
ip routing
ip domain name netmonitor.internal
!
interface GigabitEthernet0/0/0
 description Primary Uplink to ISP1
 ip address 203.158.0.2 255.255.255.252
 negotiation auto
!
interface GigabitEthernet0/0/1
 description Internal Perimeter Firewall Transit
 ip address 192.168.100.1 255.255.255.248
 ip ospf 1 area 0
 negotiation auto
!
router ospf 1
 router-id 192.168.100.1
 passive-interface GigabitEthernet0/0/0
!
router bgp 65001
 bgp log-neighbor-changes
 neighbor 203.158.0.1 remote-as 45265
 neighbor 203.158.0.1 description ISP-UPSTREAM-GATEWAY
!
line vty 0 4
 transport input ssh
 logging synchronous
end`,
  },
  {
    id: 'bk-02',
    deviceId: 'dev-rtr-01',
    deviceName: 'WAN-Edge-RTR-01',
    deviceIp: '192.168.100.1',
    deviceType: 'Router',
    versionTag: 'v1.3 - Pre-Maintenance BGP Multi-homing',
    timestamp: '2026-09-25 14:32:00',
    sizeKb: 17.8,
    checksumSha256: '9b4c2084df9a72d1a3c6130089c922579df2a611c0805178601c9bfa6a34df4e',
    triggeredBy: 'admin (Admin Root)',
    triggerType: 'pre-change',
    format: 'cisco_ios',
    notes: 'Snapshot taken before updating ISP prefix-lists',
    configContent: `! Cisco IOS-XE Software, Version 17.09.03a
hostname WAN-Edge-RTR-01
ip routing
interface GigabitEthernet0/0/0
 description Primary Uplink to ISP1
 ip address 203.158.0.2 255.255.255.252
!
interface GigabitEthernet0/0/1
 ip address 192.168.100.1 255.255.255.248
!
line vty 0 4
 transport input ssh
end`,
  },
  {
    id: 'bk-03',
    deviceId: 'dev-fw-01',
    deviceName: 'Perimeter-NGFW-Cluster',
    deviceIp: '192.168.100.2',
    deviceType: 'Firewall',
    versionTag: 'v2.2 - Scheduled Daily',
    timestamp: '2026-09-28 02:00:22',
    sizeKb: 34.6,
    checksumSha256: 'c83038a846b0a1a0980ff256bb83b63cc238b72506e7552aaeb1c888f4c45b74',
    triggeredBy: 'Auto-Scheduler (CRON)',
    triggerType: 'scheduled',
    format: 'fortios',
    notes: 'Routine automated backup via SFTP',
    configContent: `#config-version=FGT200F-7.4.2-build0503
config system global
    set hostname "Perimeter-NGFW-Cluster"
    set timezone 55
end
config system interface
    edit "port1"
        set alias "WAN-Transit"
        set ip 192.168.100.2 255.255.255.248
        set allowaccess ping ssh https
    next
    edit "port2"
        set alias "Core-SW-Trunk"
        set ip 10.10.0.254 255.255.255.0
        set allowaccess ping
    next
end
config firewall policy
    edit 1
        set name "Trust-To-Internet"
        set srcintf "port2"
        set dstintf "port1"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set nat enable
    next
end`,
  },
  {
    id: 'bk-04',
    deviceId: 'dev-core-01',
    deviceName: 'Core-L3-SW-01',
    deviceIp: '10.10.0.1',
    deviceType: 'Core Switch',
    versionTag: 'v3.0 - Scheduled Daily',
    timestamp: '2026-09-28 02:00:30',
    sizeKb: 28.5,
    checksumSha256: 'a4d2c882190823b18413b1f9b14b301c223cde80b91d92634e2c88f170f20cde',
    triggeredBy: 'Auto-Scheduler (CRON)',
    triggerType: 'scheduled',
    format: 'cisco_ios',
    notes: 'Standard core switch configuration snapshot',
    configContent: `! Cisco IOS-XE Software, Catalyst 9500
hostname Core-L3-SW-01
!
spanning-tree mode mst
spanning-tree extend system-id
!
vlan 10
 name MGMT
vlan 20
 name CORP-LAN
vlan 30
 name VOIP
vlan 50
 name WIFI-CORP
vlan 70
 name IOT-CCTV
vlan 100
 name SERVER
!
interface Vlan10
 ip address 10.10.10.1 255.255.255.0
!
interface Vlan20
 ip address 10.10.20.1 255.255.255.0
!
interface TenGigabitEthernet1/0/1
 description Trunk to Dist-SW-EastWing
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,50,70,100
!
interface TenGigabitEthernet1/0/2
 description Trunk to Dist-SW-WestWing
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,50,70,100
!
end`,
  },
  {
    id: 'bk-05',
    deviceId: 'dev-dist-01',
    deviceName: 'Dist-SW-EastWing',
    deviceIp: '10.10.0.2',
    deviceType: 'Distribution Switch',
    versionTag: 'v1.8 - VLAN 50 Wi-Fi Expansion',
    timestamp: '2026-09-27 11:20:15',
    sizeKb: 16.5,
    checksumSha256: '6e4798365287f3b894101e4a1a3bcf5e7b233a1e4c9f7a8b3e21a8d05541982b',
    triggeredBy: 'somsak.e (Engineer)',
    triggerType: 'manual',
    format: 'cisco_ios',
    notes: 'Added AP trunk ports on Gi1/0/20 - Gi1/0/24',
    configContent: `! Cisco IOS-XE Catalyst 9300
hostname Dist-SW-EastWing
interface GigabitEthernet1/0/1
 description Uplink to Core-L3-SW-01
 switchport mode trunk
!
interface range GigabitEthernet1/0/20 - 24
 description Access Point Connections
 switchport mode access
 switchport access vlan 50
 power inline auto
!
end`,
  },
  {
    id: 'bk-06',
    deviceId: 'dev-dist-02',
    deviceName: 'Dist-SW-WestWing',
    deviceIp: '10.10.0.3',
    deviceType: 'Distribution Switch',
    versionTag: 'v1.5 - Scheduled Daily',
    timestamp: '2026-09-28 02:00:45',
    sizeKb: 15.9,
    checksumSha256: '1d82f7c0018f3a558b9911e3b52a488e146743b179213bc54df67b2d5f07a721',
    triggeredBy: 'Auto-Scheduler (CRON)',
    triggerType: 'scheduled',
    format: 'cisco_ios',
    notes: 'Daily baseline backup',
    configContent: `! Cisco IOS-XE Catalyst 9300
hostname Dist-SW-WestWing
vlan 10,20,30,50,70,100
interface GigabitEthernet1/0/1
 switchport mode trunk
end`,
  },
];

// Generates 48 switch ports for a switch
const generateSwitchPorts = (totalPorts: number = 48): PortInfo[] => {
  const ports: PortInfo[] = [];
  const vlanPool = [10, 20, 30, 50, 70, 100];
  const vlanNames: Record<number, string> = {
    10: 'MGMT',
    20: 'CORP-LAN',
    30: 'VOIP',
    50: 'WIFI-CORP',
    70: 'IOT-CCTV',
    100: 'SERVER',
  };

  for (let i = 1; i <= totalPorts; i++) {
    const isSfp = i > 44;
    const isDown = i % 7 === 0 || i % 11 === 0;
    // Faulty ports: 24 has a bad cable (CRC errors), 36 was shut by BPDU Guard (err-disabled)
    const fault = i === 24 ? 'crc' : i === 36 ? 'errdisable' : undefined;
    // Degraded but still passing traffic
    const isWarning = i === 18;
    const status = fault ? 'error' : isWarning ? 'warning' : isDown ? 'down' : 'up';
    const noTraffic = isDown || fault !== undefined;
    const vlan = vlanPool[i % vlanPool.length];

    ports.push({
      id: i,
      name: isSfp ? `Te1/1/${i - 44}` : `Gi1/0/${i}`,
      status,
      fault,
      speed: isSfp ? '10Gbps' : isDown ? 'Auto' : '1000Mbps',
      duplex: isDown ? 'Auto' : 'Full',
      vlan,
      vlanName: vlanNames[vlan],
      poeWatts: noTraffic || isSfp ? 0 : parseFloat((5 + Math.random() * 18).toFixed(1)),
      inTrafficMbps: noTraffic ? 0 : Math.floor(20 + Math.random() * 450),
      outTrafficMbps: noTraffic ? 0 : Math.floor(15 + Math.random() * 380),
      errorDiscards: fault === 'crc' ? 28400 : isWarning ? 37 : isDown ? 0 : Math.floor(Math.random() * 2),
      connectedDevice: isDown ? undefined : isSfp ? 'Uplink-Trunk' : `Host-Workstation-${100 + i}`,
      connectedMac: isDown ? undefined : `00:E0:4C:${(10 + i).toString(16)}:${(20 + i).toString(16)}:${(30 + i).toString(16)}`,
      adminUp: true,
      portType: isSfp ? 'SFP+' : 'RJ45',
    });
  }
  return ports;
};

const NetworkDataContext = createContext<NetworkDataContextType | undefined>(undefined);

export const NetworkDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<NetworkDevice[]>(() => {
    const saved = localStorage.getItem('netmonitor_devices');
    const list: NetworkDevice[] = saved ? JSON.parse(saved) : INITIAL_DEVICES;
    return withDemoItem(list, OFFLINE_DEMO_DEVICE).map(withTraffic);
  });

  const [vlans, setVlans] = useState<VlanInfo[]>(() => {
    const saved = localStorage.getItem('netmonitor_vlans');
    return saved ? JSON.parse(saved) : INITIAL_VLANS;
  });

  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>(() => {
    const saved = localStorage.getItem('netmonitor_aps');
    return saved ? JSON.parse(saved) : INITIAL_APS;
  });

  const [clients] = useState<ClientSession[]>(INITIAL_CLIENTS);

  // Host groups and the access layer were removed from the topology; drop any still present in saved data
  const [topologyNodes, setTopologyNodes] = useState<TopologyNode[]>(() => {
    const saved = localStorage.getItem('netmonitor_topology_nodes');
    const nodes: TopologyNode[] = saved ? JSON.parse(saved) : INITIAL_TOPOLOGY_NODES;
    return withDemoItem(nodes, OFFLINE_DEMO_NODE)
      .filter(n => n.type !== 'host_group' && !REMOVED_ACCESS_NODE_IDS.has(n.id))
      .map(recentreDistRow);
  });

  const [topologyLinks, setTopologyLinks] = useState<TopologyLink[]>(() => {
    const saved = localStorage.getItem('netmonitor_topology_links');
    const links: TopologyLink[] = withDemoItem(saved ? JSON.parse(saved) : INITIAL_TOPOLOGY_LINKS, OFFLINE_DEMO_LINK);
    return links.filter(l => topologyNodes.some(n => n.id === l.source) && topologyNodes.some(n => n.id === l.target));
  });

  const [alerts, setAlerts] = useState<IncidentAlert[]>(() => {
    const saved = localStorage.getItem('netmonitor_alerts');
    return withDemoItem(saved ? JSON.parse(saved) : INITIAL_ALERTS, OFFLINE_DEMO_ALERT).map(withAlertTh);
  });

  const [syslogs, setSyslogs] = useState<SyslogEntry[]>(() => {
    const saved = localStorage.getItem('netmonitor_syslogs');
    return withDemoItem(saved ? JSON.parse(saved) : INITIAL_SYSLOGS, OFFLINE_DEMO_LOG);
  });

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('netmonitor_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [backups, setBackups] = useState<ConfigBackup[]>(() => {
    const saved = localStorage.getItem('netmonitor_backups');
    return saved ? JSON.parse(saved) : INITIAL_BACKUPS;
  });

  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);

  const [portsByDevice, setPortsByDevice] = useState<Record<string, PortInfo[]>>(() => {
    const initialPorts: Record<string, PortInfo[]> = {
      'dev-core-01': generateSwitchPorts(48),
      'dev-dist-01': generateSwitchPorts(48),
      'dev-dist-02': generateSwitchPorts(48),
      'dev-edge-01': generateSwitchPorts(48),
      [OFFLINE_DEMO_DEVICE.id]: generateSwitchPorts(24).map(p => ({ ...p, status: 'down' as const })),
    };
    // Saved port states (admin up/down toggles) win over the generated defaults
    const saved = localStorage.getItem('netmonitor_ports_v2');
    return saved ? { ...initialPorts, ...JSON.parse(saved) } : initialPorts;
  });

  const [isTelemetrySyncing, setIsTelemetrySyncing] = useState<boolean>(false);
  const [lastSyncAt, setLastSyncAt] = useState<string>(() => nowTimestamp());

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('netmonitor_devices', JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
    localStorage.setItem('netmonitor_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('netmonitor_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('netmonitor_backups', JSON.stringify(backups));
  }, [backups]);

  useEffect(() => {
    localStorage.setItem('netmonitor_syslogs', JSON.stringify(syslogs));
  }, [syslogs]);

  useEffect(() => {
    localStorage.setItem('netmonitor_vlans', JSON.stringify(vlans));
  }, [vlans]);

  useEffect(() => {
    localStorage.setItem('netmonitor_aps', JSON.stringify(accessPoints));
  }, [accessPoints]);

  useEffect(() => {
    localStorage.setItem('netmonitor_ports_v2', JSON.stringify(portsByDevice));
  }, [portsByDevice]);

  const addDevice = (deviceData: Omit<NetworkDevice, 'id' | 'uptime' | 'lastSeen'>) => {
    const newDevice: NetworkDevice = withTraffic({
      ...deviceData,
      id: `dev-${Date.now().toString(36)}`,
      uptime: '0d 00h 01m',
      lastSeen: 'Just now',
    });
    setDevices(prev => [newDevice, ...prev]);

    // Also init ports if switch
    if (newDevice.type.includes('Switch')) {
      setPortsByDevice(prev => ({
        ...prev,
        [newDevice.id]: generateSwitchPorts(newDevice.portsTotal || 24),
      }));
    }
  };

  const updateDevice = (id: string, updates: Partial<NetworkDevice>) => {
    setDevices(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    setPortsByDevice(prev => {
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  // Create a new device from an imported config: inventory entry, switch ports, a baseline
  // backup of the config, a node on the topology map (linked to the chosen parent) and a syslog entry
  const provisionDeviceFromConfig = (
    deviceData: Omit<NetworkDevice, 'id' | 'uptime' | 'lastSeen'>,
    topology: { parentNodeId: string | null; linkType: TopologyLink['linkType'] },
    author: string
  ): NetworkDevice => {
    const now = nowTimestamp();
    const newDevice: NetworkDevice = withTraffic({
      ...deviceData,
      id: uid('dev'),
      uptime: '0d 00h 01m',
      lastSeen: 'Just now',
    });
    setDevices(prev => [newDevice, ...prev]);

    if (newDevice.type.includes('Switch')) {
      setPortsByDevice(prev => ({ ...prev, [newDevice.id]: generateSwitchPorts(newDevice.portsTotal || 24) }));
    }

    const config = newDevice.config || '';
    setBackups(prev => [
      {
        id: uid('bk'),
        deviceId: newDevice.id,
        deviceName: newDevice.name,
        deviceIp: newDevice.ip,
        deviceType: newDevice.type,
        versionTag: 'Initial Import',
        timestamp: now,
        sizeKb: parseFloat((config.length / 1024).toFixed(1)) || 0.1,
        checksumSha256: generateMockSha256(config + newDevice.id),
        triggeredBy: author,
        triggerType: 'manual',
        configContent: config,
        format: newDevice.type === 'Firewall' ? 'fortios' : 'cisco_ios',
        notes: 'Baseline config archived when the device was created from an imported file',
      },
      ...prev,
    ]);

    // Place the node one row below its parent, sliding right until it does not overlap another node
    const { type: nodeType, tier } = TOPOLOGY_PLACEMENT[newDevice.type];
    const parent = topologyNodes.find(n => n.id === topology.parentNodeId) ?? null;
    const y = parent ? parent.y + 150 : Math.max(0, ...topologyNodes.map(n => n.y)) + 150;
    let x = parent ? parent.x : 620;
    while (topologyNodes.some(n => Math.abs(n.y - y) < 80 && Math.abs(n.x - x) < 180)) x += 200;

    const node: TopologyNode = {
      id: uid('node'),
      label: newDevice.name,
      ip: newDevice.ip,
      tier,
      type: nodeType,
      status: newDevice.status,
      x,
      y,
      model: newDevice.model,
    };
    const updatedNodes = [...topologyNodes, node];
    setTopologyNodes(updatedNodes);
    localStorage.setItem('netmonitor_topology_nodes', JSON.stringify(updatedNodes));

    if (parent) {
      persistLinks([
        ...topologyLinks,
        {
          id: uid('link'),
          source: parent.id,
          target: node.id,
          speed: linkSpeedLabels[topology.linkType],
          linkType: topology.linkType,
          status: 'up',
        },
      ]);
    }

    setSyslogs(prev => [
      {
        id: uid('log'),
        timestamp: now,
        facility: 'SYSTEM',
        severity: 'Notice',
        host: newDevice.name,
        ip: newDevice.ip,
        tag: '%NETMON-5-DEVICE_PROVISIONED',
        message: `Device created from imported config by ${author}${parent ? ` and linked to ${parent.label}` : ''}`,
      },
      ...prev,
    ]);

    return newDevice;
  };

  const createBackup = (
    deviceId: string,
    versionTag: string,
    triggerType: 'manual' | 'scheduled' | 'pre-change',
    author: string,
    notes?: string
  ): ConfigBackup => {
    const dev = devices.find(d => d.id === deviceId);
    if (!dev) throw new Error('Device not found');

    const content = dev.config || `! Auto-Generated running-config for ${dev.name}\nhostname ${dev.name}\n!\nend`;
    const format = dev.type === 'Firewall' ? 'fortios' : dev.vendor === 'Aruba Networks' ? 'generic' : 'cisco_ios';

    const newBackup: ConfigBackup = {
      id: `bk-${Date.now().toString(36)}`,
      deviceId: dev.id,
      deviceName: dev.name,
      deviceIp: dev.ip,
      deviceType: dev.type,
      versionTag,
      timestamp: nowTimestamp(),
      sizeKb: parseFloat((content.length / 1024).toFixed(1)) || 12.4,
      checksumSha256: generateMockSha256(content + Date.now()),
      triggeredBy: author,
      triggerType,
      configContent: content,
      format,
      notes: notes || `Snapshot archived by ${author}`,
    };

    setBackups(prev => [newBackup, ...prev]);

    // Add syslog entry
    const newLog: SyslogEntry = {
      id: uid('log'),
      timestamp: newBackup.timestamp,
      facility: 'SYSTEM',
      severity: 'Info',
      host: dev.name,
      ip: dev.ip,
      tag: '%CFG-6-BACKUP_ARCHIVED',
      message: `Configuration backup [${versionTag}] created by ${author} (SHA-256: ${newBackup.checksumSha256.slice(0, 12)}...)`,
    };
    setSyslogs(prev => [newLog, ...prev]);

    return newBackup;
  };

  const deleteBackup = (backupId: string) => {
    setBackups(prev => prev.filter(b => b.id !== backupId));
  };

  const restoreBackup = (backupId: string, author: string) => {
    const backup = backups.find(b => b.id === backupId);
    if (!backup) return;

    // Apply config to device
    setDevices(prev =>
      prev.map(d => (d.id === backup.deviceId ? { ...d, config: backup.configContent } : d))
    );

    const now = nowTimestamp();
    const newLog: SyslogEntry = {
      id: uid('log'),
      timestamp: now,
      facility: 'SYSTEM',
      severity: 'Notice',
      host: backup.deviceName,
      ip: backup.deviceIp,
      tag: '%CFG-5-RESTORE_COMMITTED',
      message: `Configuration rolled back to [${backup.versionTag}] by ${author} via Automated Backup Manager`,
    };
    setSyslogs(prev => [newLog, ...prev]);
  };

  const runGlobalBackup = async (
    author: string,
    onProgress?: (percent: number, currentDevice: string) => void
  ) => {
    setIsBackingUp(true);
    const now = nowTimestamp();
    const createdList: ConfigBackup[] = [];

    for (let i = 0; i < devices.length; i++) {
      const dev = devices[i];
      if (onProgress) {
        const percent = Math.round(((i + 1) / devices.length) * 100);
        onProgress(percent, dev.name);
      }
      await new Promise(r => setTimeout(r, 450));

      const content = dev.config || `! Auto-Generated running-config for ${dev.name}\nhostname ${dev.name}\n!\nend`;
      const format = dev.type === 'Firewall' ? 'fortios' : 'cisco_ios';

      const backup: ConfigBackup = {
        id: `bk-${Date.now().toString(36)}-${i}`,
        deviceId: dev.id,
        deviceName: dev.name,
        deviceIp: dev.ip,
        deviceType: dev.type,
        versionTag: `vAuto-${now.slice(0, 10).replace(/-/g, '')}-${now.slice(11, 16).replace(':', '')}`,
        timestamp: now,
        sizeKb: parseFloat((content.length / 1024).toFixed(1)) || 14.2,
        checksumSha256: generateMockSha256(content + dev.id + Date.now()),
        triggeredBy: author,
        triggerType: 'scheduled',
        configContent: content,
        format,
        notes: `Global backup run triggered by ${author}`,
      };
      createdList.push(backup);
    }

    setBackups(prev => [...createdList, ...prev]);
    setSettings(prev => ({
      ...prev,
      backupPolicy: {
        ...prev.backupPolicy,
        lastGlobalBackup: now,
      },
    }));

    const newLog: SyslogEntry = {
      id: uid('log'),
      timestamp: now,
      facility: 'SYSTEM',
      severity: 'Notice',
      host: 'NetMonitor-Core',
      ip: '10.10.0.1',
      tag: '%CFG-5-GLOBAL_BACKUP_COMPLETE',
      message: `Global backup snapshot completed for all ${devices.length} network hardware nodes by ${author}`,
    };
    setSyslogs(prev => [newLog, ...prev]);
    setIsBackingUp(false);
  };

  const togglePortState = (deviceId: string, portId: number) => {
    setPortsByDevice(prev => {
      const list = prev[deviceId];
      if (!list) return prev;
      const updated = list.map(p => {
        if (p.id === portId) {
          const nextAdmin = !p.adminUp;
          // shutdown / no shutdown clears an err-disabled port, but a bad cable (CRC) stays faulty
          const stillFaulty = nextAdmin && p.fault === 'crc';
          return {
            ...p,
            adminUp: nextAdmin,
            status: (nextAdmin ? (stillFaulty ? 'error' : 'up') : 'down') as PortInfo['status'],
            fault: stillFaulty ? 'crc' : nextAdmin ? undefined : p.fault,
          };
        }
        return p;
      });
      return { ...prev, [deviceId]: updated };
    });
  };

  const addVlan = (vlanData: Omit<VlanInfo, 'activePorts' | 'trafficRateMbps'>) => {
    const newVlan: VlanInfo = {
      ...vlanData,
      activePorts: 0,
      trafficRateMbps: 0,
    };
    setVlans(prev => [...prev, newVlan]);
  };

  const rebootAccessPoint = async (apId: string) => {
    setAccessPoints(prev =>
      prev.map(ap => (ap.id === apId ? { ...ap, status: 'warning', uptime: 'Rebooting...' } : ap))
    );

    // Simulate reboot delay
    await new Promise(res => setTimeout(res, 2000));

    setAccessPoints(prev =>
      prev.map(ap => (ap.id === apId ? { ...ap, status: 'online', uptime: '0d 00h 01m' } : ap))
    );
  };

  const updateTopologyNodePosition = (id: string, x: number, y: number) => {
    setTopologyNodes(prev =>
      prev.map(n => (n.id === id ? { ...n, x, y } : n))
    );
  };

  const addTopologyNode = (nodeData: Omit<TopologyNode, 'id'>) => {
    const newNode: TopologyNode = {
      ...nodeData,
      id: `node-${Date.now().toString(36)}`,
    };
    const updated = [...topologyNodes, newNode];
    setTopologyNodes(updated);
    localStorage.setItem('netmonitor_topology_nodes', JSON.stringify(updated));
  };

  const deleteTopologyNode = (id: string) => {
    const updatedNodes = topologyNodes.filter(n => n.id !== id);
    const updatedLinks = topologyLinks.filter(l => l.source !== id && l.target !== id);
    setTopologyNodes(updatedNodes);
    setTopologyLinks(updatedLinks);
    localStorage.setItem('netmonitor_topology_nodes', JSON.stringify(updatedNodes));
    localStorage.setItem('netmonitor_topology_links', JSON.stringify(updatedLinks));
  };

  const toggleSubtreeCollapse = (nodeId: string) => {
    setTopologyNodes(prev =>
      prev.map(n => (n.id === nodeId ? { ...n, isCollapsed: !n.isCollapsed } : n))
    );
  };

  const linkSpeedLabels: Record<TopologyLink['linkType'], string> = {
    fiber_10g: '10 Gbps SFP+',
    copper_1g: '1 Gbps Cat6',
    fiber_40g: '40 Gbps QSFP+',
    trunk: 'VLAN 802.1Q Trunk',
  };

  const persistLinks = (updatedLinks: TopologyLink[]) => {
    setTopologyLinks(updatedLinks);
    localStorage.setItem('netmonitor_topology_links', JSON.stringify(updatedLinks));
  };

  // Returns false when the nodes are identical or already linked.
  const connectTopologyLink = (source: string, target: string, linkType: TopologyLink['linkType']) => {
    if (source === target) return false;
    const exists = topologyLinks.some(
      l => (l.source === source && l.target === target) || (l.source === target && l.target === source)
    );
    if (exists) return false;

    const newLink: TopologyLink = {
      id: `link-${Date.now().toString(36)}`,
      source,
      target,
      speed: linkSpeedLabels[linkType],
      linkType,
      status: 'up',
    };
    persistLinks([...topologyLinks, newLink]);
    return true;
  };

  const updateTopologyLinkType = (linkId: string, linkType: TopologyLink['linkType']) => {
    persistLinks(
      topologyLinks.map(l => (l.id === linkId ? { ...l, linkType, speed: linkSpeedLabels[linkType] } : l))
    );
  };

  const deleteTopologyLink = (linkId: string) => {
    persistLinks(topologyLinks.filter(l => l.id !== linkId));
  };

  const saveTopologyLayout = () => {
    localStorage.setItem('netmonitor_topology_nodes', JSON.stringify(topologyNodes));
    localStorage.setItem('netmonitor_topology_links', JSON.stringify(topologyLinks));
  };

  const acknowledgeAlert = (alertId: string, noteText: string, author: string, role: Role) => {
    const trimmedNote = noteText ? noteText.trim() : '';
    if (!trimmedNote) {
      console.warn('Rejected acknowledgeAlert: noteText is required');
      return;
    }

    const newNote = {
      id: uid('note'),
      author,
      role,
      timestamp: nowTimestamp(),
      text: trimmedNote,
    };

    setAlerts(prev =>
      prev.map(a => {
        if (a.id === alertId) {
          return {
            ...a,
            status: 'acknowledged',
            acknowledgedBy: author,
            acknowledgedAt: newNote.timestamp,
            notes: [...a.notes, newNote],
          };
        }
        return a;
      })
    );

    // Also inject into syslogs
    const newLog: SyslogEntry = {
      id: uid('log'),
      timestamp: newNote.timestamp,
      facility: 'SYSTEM',
      severity: 'Notice',
      host: 'NetMonitor-Core',
      ip: '10.10.0.1',
      tag: '%ALARM-5-ACK',
      message: `Alert ${alertId} acknowledged by ${author} (${role}): "${trimmedNote}"`,
    };
    setSyslogs(prev => [newLog, ...prev]);
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, status: 'resolved' } : a))
    );
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Latest state for the polling timer, which would otherwise see stale closures
  const devicesRef = useRef(devices);
  const alertsRef = useRef(alerts);
  devicesRef.current = devices;
  alertsRef.current = alerts;

  const refreshTelemetry = () => {
    setIsTelemetrySyncing(true);
    setTimeout(() => {
      // Slightly fluctuate metrics for realistic dynamic NOC feel
      const polled = devicesRef.current.map(d => {
        if (d.status === 'offline') return d;
        const cpu = Math.min(99, Math.max(8, d.cpu + Math.floor((Math.random() - 0.45) * 6)));
        const ram = Math.min(95, Math.max(20, d.ram + Math.floor((Math.random() - 0.48) * 4)));
        const overThreshold = cpu >= CPU_THRESHOLD || ram >= RAM_THRESHOLD;
        return {
          ...d,
          cpu,
          ram,
          pingMs: Math.max(0.1, parseFloat((d.pingMs + (Math.random() - 0.5) * 0.3).toFixed(1))),
          trafficInMbps: fluctuate(d.trafficInMbps ?? 0, 0.2),
          trafficOutMbps: fluctuate(d.trafficOutMbps ?? 0, 0.2),
          // Warning follows the thresholds both ways: back under them, the device is online again
          status: overThreshold ? ('warning' as const) : ('online' as const),
        };
      });

      // Raise one alert per device that crosses a threshold and has no open resource alert yet
      const now = nowTimestamp();
      const newAlerts: IncidentAlert[] = [];
      const newLogs: SyslogEntry[] = [];
      polled.forEach(d => {
        const reasons = [
          d.cpu >= CPU_THRESHOLD && `CPU ${d.cpu}% (threshold ${CPU_THRESHOLD}%)`,
          d.ram >= RAM_THRESHOLD && `Memory ${d.ram}% (threshold ${RAM_THRESHOLD}%)`,
        ].filter(Boolean);
        if (reasons.length === 0) return;

        const hasOpenAlert = alertsRef.current.some(
          a => a.deviceName === d.name && a.category === 'High Resource Exhaustion' && a.status !== 'resolved'
        );
        if (hasOpenAlert) return;

        const id = `${d.id}-${Date.now().toString(36)}`;
        newAlerts.push({
          id: `alt-${id}`,
          timestamp: now,
          deviceName: d.name,
          deviceIp: d.ip,
          severity: d.cpu >= 95 || d.ram >= 95 ? 'critical' : 'warning',
          category: 'High Resource Exhaustion',
          message: `Resource usage exceeded threshold: ${reasons.join(', ')}.`,
          categoryTh: 'ทรัพยากรเครื่องใช้งานสูงเกินเกณฑ์',
          messageTh: `การใช้ทรัพยากรเกินเกณฑ์: ${reasons.join(', ').replace(/threshold/g, 'เกณฑ์')}`,
          status: 'active',
          notes: [],
        });
        newLogs.push({
          id: `log-${id}`,
          timestamp: now,
          facility: 'SYSTEM',
          severity: 'Warning',
          host: d.name,
          ip: d.ip,
          tag: '%NETMON-4-THRESHOLD',
          message: `Threshold exceeded: ${reasons.join(', ')}`,
        });
      });

      // Merge only the polled metrics, so an edit made during the poll delay is not overwritten
      const metrics = new Map(polled.map(d => [d.id, d]));
      setDevices(prev =>
        prev.map(d => {
          const m = metrics.get(d.id);
          if (!m || d.status === 'offline') return d;
          const { cpu, ram, pingMs, trafficInMbps, trafficOutMbps, status } = m;
          return { ...d, cpu, ram, pingMs, trafficInMbps, trafficOutMbps, status };
        })
      );
      setLastSyncAt(now);
      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev]);
        setSyslogs(prev => [...newLogs, ...prev]);
      }
      setIsTelemetrySyncing(false);
    }, 600);
  };

  // Near real-time monitoring: poll automatically every SNMP interval
  const refreshRef = useRef(refreshTelemetry);
  refreshRef.current = refreshTelemetry;
  useEffect(() => {
    const seconds = Math.max(5, settings.snmpInterval || 30);
    const timer = setInterval(() => refreshRef.current(), seconds * 1000);
    return () => clearInterval(timer);
  }, [settings.snmpInterval]);

  return (
    <NetworkDataContext.Provider
      value={{
        devices,
        portsByDevice,
        vlans,
        accessPoints,
        clients,
        topologyNodes,
        topologyLinks,
        alerts,
        syslogs,
        settings,
        backups,
        isBackingUp,
        addDevice,
        updateDevice,
        deleteDevice,
        provisionDeviceFromConfig,
        createBackup,
        deleteBackup,
        restoreBackup,
        runGlobalBackup,
        togglePortState,
        addVlan,
        rebootAccessPoint,
        updateTopologyNodePosition,
        addTopologyNode,
        deleteTopologyNode,
        toggleSubtreeCollapse,
        connectTopologyLink,
        updateTopologyLinkType,
        deleteTopologyLink,
        saveTopologyLayout,
        acknowledgeAlert,
        resolveAlert,
        updateSettings,
        refreshTelemetry,
        isTelemetrySyncing,
        lastSyncAt,
      }}
    >
      {children}
    </NetworkDataContext.Provider>
  );
};

export const useNetworkData = (): NetworkDataContextType => {
  const context = useContext(NetworkDataContext);
  if (!context) {
    throw new Error('useNetworkData must be used within a NetworkDataProvider');
  }
  return context;
};
