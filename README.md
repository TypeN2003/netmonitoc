# NetMonitor

ระบบจัดการและเฝ้าระวังอุปกรณ์เครือข่ายและจุดกระจายสัญญาณไร้สายผ่านเว็บแอปพลิเคชัน
(Web-Based Network Device and Wireless Access Point Monitoring and Management System)

โครงงานพิเศษ สาขาวิชาวิศวกรรมสารสนเทศและเครือข่าย (INET) ภาควิชาเทคโนโลยีสารสนเทศ
คณะเทคโนโลยีและการจัดการอุตสาหกรรม มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ

> **สถานะ: เวอร์ชัน 1 (ต้นแบบส่วนติดต่อผู้ใช้)**
> ทุกหน้าใช้งานได้ครบ แต่ข้อมูลอุปกรณ์เป็นข้อมูลจำลอง และเก็บไว้ใน Local Storage ของเบราว์เซอร์
> การดึงข้อมูลจริงผ่าน SNMP/ICMP และการส่งแจ้งเตือนผ่าน Telegram/Email อยู่ในแผนเวอร์ชันถัดไป

## เริ่มใช้งาน

ต้องมี [Node.js](https://nodejs.org) เวอร์ชัน LTS ล่าสุด

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 (ถ้า port 3000 ไม่ว่าง Vite จะเลือก port ถัดไปให้ ดูได้ใน terminal)

### บัญชีทดสอบ

| สิทธิ์ | อีเมล | รหัสผ่าน |
|---|---|---|
| Admin | `admin@netmonitor.internal` | `admin123` |
| Engineer | `engineer@netmonitor.internal` | `engineer123` |
| Viewer | `viewer@netmonitor.internal` | `viewer123` |

ใต้กล่อง Login มีปุ่มสลับสิทธิ์ด่วนสำหรับเดโม ผู้ที่สมัครสมาชิกคนแรกจะได้สิทธิ์ Admin

### คำสั่งอื่น

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run build` | build สำหรับนำไปติดตั้ง (ผลอยู่ใน `dist/`) |
| `npm run preview` | เปิดดูผลจาก `npm run build` |
| `npm run lint` | ตรวจ type ด้วย TypeScript |

## ความสามารถ

| หน้า | สิ่งที่ทำได้ |
|---|---|
| **Dashboard** | จำนวนอุปกรณ์แยก Online / Warning / Offline (กดการ์ดเพื่อดูรายการ), กราฟ Traffic, Traffic ตาม VLAN, Alert ล่าสุด |
| **คลังอุปกรณ์ (Devices)** | ตารางอุปกรณ์พร้อม CPU, RAM, Uptime, Traffic เข้า/ออก, พอร์ต · ค้นหาด้วยชื่อ/IP/รุ่น/สถานที่ · กรองตามประเภท สถานะ สถานที่ · แก้ไขสถานที่/ตู้แร็ค · สำรอง Config · เปิด SSH ด้วย PuTTY |
| **สร้างอุปกรณ์จาก Config** | อัปโหลดไฟล์ `.cfg` / `.txt` (เช่น output ของ `show running-config`) ระบบอ่านชื่อ, IP, ผู้ผลิต, เวอร์ชัน OS แล้วสร้างอุปกรณ์พร้อมวางในผัง Topology |
| **พอร์ตสวิตช์ (Switch Ports)** | หน้าสวิตช์จำลอง สีบอกสถานะพอร์ต: เขียว = เชื่อมต่อ, แดง = พอร์ตเสีย (CRC Error / err-disabled), ส้ม = มีข้อผิดพลาดเล็กน้อย, เทา = ไม่ได้เสียบสาย · สั่งเปิด/ปิดพอร์ตได้ |
| **VLAN** | Traffic, Subnet, การใช้ DHCP ของแต่ละ VLAN · เพิ่ม VLAN |
| **จุดกระจายสัญญาณไร้สาย** | เปิด RUCKUS One ของคณะในแท็บใหม่ (ตั้ง URL ได้ในหน้าตั้งค่า) |
| **ผัง Topology** | ผังเครือข่ายตามลำดับชั้น สีตามสถานะอุปกรณ์จริง · ลากจัดตำแหน่ง, เพิ่ม/ลบอุปกรณ์, ลากสายเชื่อม, บันทึกผัง |
| **แจ้งเตือน (Alerts)** | Alert อัตโนมัติเมื่อ CPU ≥ 85% หรือ RAM ≥ 90% · แจ้งเตือนเด้งในแอปและบนเดสก์ท็อป · รับทราบ (ต้องเขียนบันทึก) → แก้ไขแล้ว |
| **บันทึกเหตุการณ์ (Syslog)** | Log ตามระดับ RFC 5424 · ค้นหา กรอง ส่งออก CSV |
| **สถิติ (Statistics)** | แบนด์วิดท์ 7 วัน, สัดส่วนโปรโตคอล, Top Talkers |
| **ผู้ใช้ (Users)** | สร้าง/ลบผู้ใช้, กำหนดสิทธิ์ (เฉพาะ Admin) |
| **ตั้งค่า (Settings)** | ภาษา, ลิงก์ RUCKUS One, รอบ SNMP Polling (ค่าเริ่มต้น 5 นาที), Telegram/Email, คลังไฟล์สำรอง Config (ดู เปรียบเทียบ ดาวน์โหลด กู้คืน) |

ทุกหน้าสลับภาษาไทย/อังกฤษ และธีมสว่าง/มืดได้

### สิทธิ์ผู้ใช้

| ความสามารถ | Admin | Engineer | Viewer |
|---|---|---|---|
| Dashboard, Topology, สถานะอุปกรณ์ (Online / Warning / Offline) | ✓ | ✓ | ดูอย่างเดียว |
| รายละเอียดอุปกรณ์ (CPU, RAM, Traffic, พอร์ต) | ✓ | ✓ | – |
| Alerts, พอร์ต, VLAN, Syslog, สถิติ | ✓ | ✓ | – |
| สร้างอุปกรณ์จาก Config, สำรอง Config, SSH | ✓ | ✓ | – |
| ลบอุปกรณ์, จัดการผู้ใช้ | ✓ | – | – |
| ตั้งค่าระบบ | ✓ | ✓ | – |

## ปุ่ม SSH (PuTTY)

ปุ่ม SSH ในหน้าคลังอุปกรณ์เปิดลิงก์ `ssh://<IP>` ต้องติดตั้งตัวเปิดลิงก์ครั้งเดียวต่อเครื่อง
โดยดับเบิลคลิก [`tools/ssh-handler/install.cmd`](tools/ssh-handler/install.cmd)
รายละเอียดอยู่ใน [`tools/ssh-handler/README.md`](tools/ssh-handler/README.md)

## เทคโนโลยี

- [React 19](https://react.dev) + TypeScript
- [Vite](https://vite.dev)
- [Tailwind CSS 4](https://tailwindcss.com)
- [Recharts](https://recharts.org) สำหรับกราฟ
- [Lucide](https://lucide.dev) สำหรับไอคอน
- React Router

## โครงสร้างโปรเจกต์

```
src/
├── pages/            หน้าต่างๆ (Dashboard, Devices, Topology, ...)
│   └── auth/         Login, สมัครสมาชิก, ลืม/ตั้งรหัสผ่านใหม่
├── components/
│   ├── layout/       Header, Sidebar, การแจ้งเตือนในแอป
│   ├── devices/      หน้าต่างสร้างอุปกรณ์จาก Config
│   └── settings/     คลังไฟล์สำรอง Config
├── context/
│   ├── NetworkDataContext.tsx   ข้อมูลอุปกรณ์ทั้งหมด, การดึงข้อมูลตามรอบ, Alert อัตโนมัติ
│   ├── AuthContext.tsx          Login และสิทธิ์ผู้ใช้
│   ├── LanguageContext.tsx      คำแปลไทย/อังกฤษ
│   └── ThemeContext.tsx         ธีมสว่าง/มืด
└── types/            ชนิดข้อมูล
tools/ssh-handler/    สคริปต์ให้ลิงก์ ssh:// เปิดด้วย PuTTY บน Windows
```

## ข้อจำกัดของเวอร์ชันนี้

- **ข้อมูลอุปกรณ์เป็นข้อมูลจำลอง:** ค่า CPU, RAM, Traffic เปลี่ยนตามรอบ Polling แต่ยังไม่ได้ดึงจากอุปกรณ์จริง
- **ไม่มี Backend:** ข้อมูลทั้งหมดเก็บใน Local Storage ของเบราว์เซอร์ แต่ละเครื่อง/เบราว์เซอร์จึงเห็นข้อมูลแยกกัน และไม่ควรเปิดหลายแท็บพร้อมกัน
- **ยังไม่ส่งแจ้งเตือนออกนอกแอป:** หน้าตั้งค่า Telegram/Email มีแล้ว แต่ยังไม่ได้ส่งข้อความจริง

## แผนเวอร์ชันถัดไป

- Collector ด้วย Express.js ดึงข้อมูลจริงผ่าน SNMP / ICMP (ทดสอบกับ EVE-NG)
- ดึงข้อมูล AP จาก RUCKUS One API
- ส่งแจ้งเตือนผ่าน Telegram Bot API และ Gmail SMTP
- ย้ายข้อมูลไปเก็บในฐานข้อมูลฝั่ง Server

## ผู้จัดทำ

- นาย วิทวัส แก้ววิเศษ
- นาย อนันต์ยศ สายวงษ์

อาจารย์ที่ปรึกษา: ผู้ช่วยศาสตราจารย์ ดร.ศรายุทธ ธเนศสกุลวัฒนา
