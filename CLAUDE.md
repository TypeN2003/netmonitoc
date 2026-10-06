# CLAUDE.md

คู่มือสำหรับ Claude Code (และคนในทีม) เวลาแก้โปรเจกต์นี้ อ่านคู่กับ [README.md](README.md)

## โปรเจกต์คืออะไร

NetMonitor: เว็บเฝ้าระวังอุปกรณ์เครือข่ายและ AP ของคณะ เป็นโครงงานพิเศษ (ปริญญานิพนธ์) สาขา INET
ขอบเขตงานอ้างอิงจากเอกสาร **ทก.01** ข้อ 2.3 (2.3.1–2.3.10) ทุกฟีเจอร์ควรตรงกับข้อในเอกสารนี้

**เวอร์ชัน 1 = frontend อย่างเดียว:** ไม่มี backend ข้อมูลอุปกรณ์เป็นข้อมูลจำลอง เก็บใน `localStorage`
SNMP/ICMP จริง, Collector (Express), ส่ง Telegram/Email จริง และ RUCKUS One API เป็นแผน V2

## คำสั่ง

```bash
npm run dev       # dev server (port 3000 หรือ port ถัดไปที่ว่าง)
npx tsc --noEmit  # ตรวจ type ทุกครั้งหลังแก้
npx vite build    # ตรวจว่า build ผ่าน
```

ไม่มี test อัตโนมัติ ตรวจด้วย `tsc` + `vite build` แล้วให้ผู้ใช้เปิดดูในเบราว์เซอร์

## โครงสร้างที่ต้องรู้

- `src/context/NetworkDataContext.tsx`: หัวใจของระบบ ข้อมูลตั้งต้นทั้งหมด (`INITIAL_*`), การบันทึกลง localStorage,
  การดึงข้อมูลตามรอบ (`refreshTelemetry` ทุก `settings.snmpInterval` วินาที), Alert อัตโนมัติเมื่อ CPU ≥ 85% / RAM ≥ 90%,
  `provisionDeviceFromConfig` (สร้างอุปกรณ์ + โหนด Topology + backup แรก + syslog)
- `src/context/LanguageContext.tsx`: คำแปล `th` และ `en` **ทุกข้อความบนหน้าจอต้องผ่าน `t('key')` และต้องเพิ่มคีย์ทั้งสองภาษา**
  ถ้าคีย์หาย หน้าจอจะโชว์ชื่อคีย์ดิบ (เคยเกิดกับ `configImportTitle`, `backupManagerTitle`)
- `src/context/AuthContext.tsx`: Login, สิทธิ์, session (`sessionStorage` หรือ `localStorage` ถ้าติ๊ก "จดจำ")
- `src/types/index.ts`: ชนิดข้อมูลทั้งหมด
- `tools/ssh-handler/`: สคริปต์ Windows ให้ลิงก์ `ssh://` เปิด PuTTY (ตรวจรูปแบบลิงก์ก่อนส่งให้ PuTTY เสมอ)
- `docs/`: เอกสารนำเสนอ (.docx), รูป/PDF สไลด์

## ข้อตกลงในการแก้โค้ด

- **ข้อมูลที่บันทึกในเบราว์เซอร์ผู้ใช้:** เปลี่ยนข้อมูลตั้งต้นอย่างเดียวไม่พอ เพราะ localStorage เก็บของเดิมไว้
  ต้องแก้ตอนโหลดด้วย (ดูตัวอย่าง `withDemoItem`, `withAlertTh`, `recentreDistRow`, `REMOVED_ACCESS_NODE_IDS`)
  หรือเปลี่ยนชื่อคีย์ storage (เช่น `netmonitor_ports_v2`)
- **เวลา:** ใช้ `nowTimestamp()` (เวลาท้องถิ่น) ห้ามใช้ `toISOString()` ซึ่งเป็น UTC ช้ากว่าไทย 7 ชม.
- **ID:** ใช้ `uid(prefix)` กัน ID ซ้ำ
- **สิทธิ์ต้องกันทั้งเมนูและ route:** ซ่อนใน `Sidebar.tsx` และครอบ `ProtectedRoute` ใน `App.tsx` และซ่อนลิงก์/ปุ่มที่พาไปหน้านั้น
- **ไฟล์บางไฟล์เป็น CRLF** (เช่น `AccessPointsPage.tsx`) ถ้าแก้ด้วยสคริปต์ต้องจัดการ line ending
- **อย่าเพิ่มช่องตั้งค่าที่ไม่มีผลจริง** ผู้ใช้ขอให้ลบทุกช่องที่ไม่มีโค้ดใช้ค่า (ดูการตัดสินใจด้านล่าง)
- commit เฉพาะเมื่อผู้ใช้สั่ง, ไม่ commit `node_modules/`; ทำงานบน branch `ui-theme-topology-improvements` แล้วเปิด PR เข้า `main`
  (เครื่องนี้ไม่มี `gh` CLI ให้ส่งลิงก์ compare แบบกรอก title/body ไว้ให้ผู้ใช้กดเอง)

## สิทธิ์ผู้ใช้ (ตาม ทก. 2.3.6)

| | Admin | Engineer | Viewer |
|---|---|---|---|
| Dashboard, Topology, สถานะอุปกรณ์ | ✓ | ✓ | ดูอย่างเดียว |
| รายละเอียดอุปกรณ์ (CPU/RAM/Traffic/พอร์ต) | ✓ | ✓ | ซ่อน |
| Alerts, Ports, VLAN, Syslog, Statistics | ✓ | ✓ | ไม่เห็นเมนู + route ถูกกัน |
| สร้างอุปกรณ์จาก Config, Backup, SSH, Settings | ✓ | ✓ | – |
| ลบอุปกรณ์, Users | ✓ | – | – |

บัญชีทดสอบ: `admin@` / `engineer@` / `viewer@netmonitor.internal` รหัส `admin123` / `engineer123` / `viewer123`

## การตัดสินใจที่ผู้ใช้เลือกแล้ว (อย่าย้อนกลับโดยไม่ถาม)

- **ไม่มีผล = ลบ:** ลบช่องตั้งค่าที่ไม่ได้ใช้ไปแล้ว: ชื่อองค์กร, Gateway IP, Timezone, นโยบาย Backup อัตโนมัติ, MFA/2FA, Slack Webhook
- **ธีมเริ่มต้น = สว่าง**, **ภาษาเริ่มต้น = ไทย**, **หน้าแรก = Login** (ไม่มี auto-login)
- **SNMP Polling เริ่มต้น 300 วินาที (5 นาที)** เพื่อลด Traffic (ตามผลสัมภาษณ์ใน ทก. 2.4.6)
- **นำเข้า Config = สร้างอุปกรณ์ใหม่** (ไม่ใช่ deploy ลงอุปกรณ์เดิม); ปุ่ม "เพิ่มอุปกรณ์" แบบกรอกมือถูกแทนด้วยปุ่มไปหน้า Backup
- **Topology ไม่แสดงชั้น Access:** แสดงแค่ Internet → Firewall → Core → แถว Distribution (จัดกึ่งกลางใต้ Core)
- **อุปกรณ์ Offline จำลอง:** `Dist-SW-Library` (10.10.0.4) ใส่กลับทุกครั้งที่โหลด เพื่อใช้เดโม
- **พอร์ตเสีย = สีแดง:** พอร์ต 24 (CRC) และ 36 (err-disabled) ทุกสวิตช์; ส้ม = error เล็กน้อย; เทา = ไม่ได้เสียบ
- **Wi-Fi ใช้ RUCKUS One ของคณะ:** เมนู "จุดกระจายสัญญาณไร้สาย" เปิด URL จาก Settings ในแท็บใหม่
  (ฝัง iframe ไม่ได้ เพราะ RUCKUS One ส่ง `X-Frame-Options: DENY`) ค่าเริ่มต้น `https://asia.ruckus.cloud`
- **ไม่แสดงรหัสผ่านผู้ใช้ในตาราง Users** (แม้แต่ Admin)
- **Alert มี 3 ระดับ** (Critical/Warning/Info) ส่วน Syslog ใช้ระดับตาม RFC 5424 ตั้งใจให้ต่างกัน
- **Alert แสดงภาษาไทยได้:** ใช้ฟิลด์ `categoryTh` / `messageTh` ผ่าน `alertText(alert, lang)`

## ทำอะไรไปแล้ว (ตามลำดับ commit)

1. `37fca73`: ปรับธีม, Topology, หน้า Login/สมัคร
2. `7d9ae1e`: เติมให้ตรง ทก.: การ์ดสถานะ Dashboard, คอลัมน์ Traffic, ค้นหาด้วยรุ่น, กรองสถานที่, Alert อัตโนมัติ + แจ้งเตือนในแอป,
   จำกัดสิทธิ์ Viewer, หน้าต่างนำเข้า Config 3 ขั้นตอน, ปุ่มแก้ไข Location/Rack, ธีมสว่างเป็นค่าเริ่มต้น
3. `3bed0bd`: หน้าแรกเป็น Login, session + "จดจำการเข้าระบบ"
4. `85b2bf5`: อุปกรณ์ Offline จำลอง, ลบชั้น Access ใน Topology, Alert ภาษาไทย, แก้บัค 20 จุด
   (persist syslog/VLAN/AP/พอร์ต, เวลา UTC, Warning ไม่หาย, Topology สีไม่ตรงอุปกรณ์, จำนวนพอร์ตไม่ตรง, Settings ทับ Backup ฯลฯ)
5. `0271b16`: สร้างอุปกรณ์จาก Config, ปุ่ม SSH (PuTTY), พอร์ตเสียสีแดง, RUCKUS One, การ์ด Dashboard กดได้, ลบช่องตั้งค่าที่ไม่มีผล
6. `80634c7`: เขียน README ใหม่

หลัง commit ล่าสุด (ยังไม่ commit ณ ตอนเขียนไฟล์นี้): ลบคอลัมน์รหัสผ่านในหน้า Users,
ซ่อนรายละเอียดอุปกรณ์และหน้า Alerts จาก Viewer ให้ตรง ทก. 2.3.6, ไฟล์สไลด์ `docs/slide-tools.png` / `.pdf`

## ที่ยังไม่ได้ทำ / ข้อจำกัดที่รู้อยู่

- **ยังไม่มีผลจริง:** Ping Timeout, Packet Loss threshold, Session Timeout, แท็บ Webhooks (Telegram/Email ยังไม่ส่งจริง)
  ผู้ใช้ยังไม่ได้ตัดสินใจว่าจะลบหรือทำให้ใช้ได้; Telegram ส่งจากเบราว์เซอร์ได้โดยตรง (ไม่ต้องมี backend)
- **กราฟ Traffic บน Dashboard เป็นข้อมูลตายตัว** (12:00–17:00) ยังไม่ขยับตามรอบ Polling
- **พอร์ตทุกสวิตช์หน้าตาเหมือนกัน** ไม่ได้อ่านจำนวนพอร์ตจากชื่อรุ่น
- **หน้า AP เดิม (`/access-points`) เป็นข้อมูลจำลอง** ไม่มีเมนูเข้าแล้ว ยังไม่ได้ตัดสินใจว่าจะลบหรือทำต่อด้วย RUCKUS One API
- **เปิดหลายแท็บพร้อมกันจะเขียน localStorage ทับกัน** (แก้ได้เมื่อมี backend)
- **ภาษาไทยยังไม่ครบทุกหน้า:** ยังมีข้อความภาษาอังกฤษพิมพ์ตรงในหลายหน้า (คำอธิบายใต้หัวข้อ, ป้ายในตาราง)
- **คู่มือนำเสนอ `docs/NetMonitor_Presentation_Guide.docx` ล้าสมัย:** ยังเขียนว่า Polling 30 วินาที, การ์ด AP บน Dashboard,
  นำเข้า Config แบบ deploy, Viewer ดู Alerts ได้
