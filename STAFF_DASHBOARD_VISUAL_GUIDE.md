# 🎨 Staff Dashboard Visual Guide

Visual representation of the Staff Dashboard pages and components.

---

## 🏠 Staff Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│                      STAFF PORTAL HEADER                     │
│  [☰]                              [🔔3] [👤 User ▼]        │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│  📊      │              STAFF DASHBOARD                      │
│ Dashboard│                                                   │
│          │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  🔌      │  │Total │ │Online│ │Warn  │ │Off   │           │
│ Devices  │  │  4   │ │  3   │ │  1   │ │  1   │           │
│          │  └──────┘ └──────┘ └──────┘ └──────┘           │
│  📈      │                                                   │
│ Readings │  ┌─────────────────────────────────────┐        │
│          │  │ ⚠️  Active Alerts                    │        │
│  📉      │  │ You have 3 recent alerts            │        │
│ Analytics│  └─────────────────────────────────────┘        │
│          │                                                   │
│          │  ┌─────────────────────────────────────┐        │
│          │  │ ⚠️  Recent Alerts                    │        │
│          │  ├──────────┬────────┬────────┬────────┤        │
│          │  │ Severity │ Device │ Param  │ Time   │        │
│          │  ├──────────┼────────┼────────┼────────┤        │
│          │  │   HIGH   │Device B│  pH    │5m ago  │        │
│          │  │  MEDIUM  │Device B│Turb    │10m ago │        │
│          │  └──────────┴────────┴────────┴────────┘        │
│          │                                                   │
│          │  ┌─────────────────────────────────────┐        │
│          │  │ 📈 Device Status & Readings          │        │
│          │  ├────────┬────────┬────┬────┬────────┤        │
│          │  │ Device │ Status │ pH │Temp│Turb    │        │
│          │  ├────────┼────────┼────┼────┼────────┤        │
│          │  │Device A│ Online │7.2 │25.5│ 3.2    │        │
│          │  │Device B│Warning │8.5 │28.0│ 5.8    │        │
│          │  │Device C│ Online │6.8 │24.0│ 2.1    │        │
│          │  │Device D│Offline │ -  │ -  │ -      │        │
│          │  └────────┴────────┴────┴────┴────────┘        │
│          │                                                   │
└──────────┴───────────────────────────────────────────────────┘
│           Staff Portal ©2025 • Water Quality System          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 Staff Devices Page

```
┌─────────────────────────────────────────────────────────────┐
│                          DEVICES                             │
│                                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │Total │ │Online│ │Warn  │ │Off   │                       │
│  │  5   │ │  3   │ │  1   │ │  1   │                       │
│  └──────┘ └──────┘ └──────┘ └──────┘                       │
│                                                               │
│  ┌───────────────────────────────────────────────────┐      │
│  │ [🔍 Search devices...]        Filter: [All ▼]    │      │
│  └───────────────────────────────────────────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Name      │ Location │ Status │ Sensors  │ Uptime  │    │
│  ├───────────┼──────────┼────────┼──────────┼─────────┤    │
│  │ Device A  │   North  │ Online │ pH,Temp  │ 99.8%   │    │
│  │ ID: 1     │ Station  │   ✓    │ Turb,DO  │         │    │
│  ├───────────┼──────────┼────────┼──────────┼─────────┤    │
│  │ Device B  │   South  │Warning │ pH,Temp  │ 97.2%   │    │
│  │ ID: 2     │ Station  │   ⚠    │ Turbidity│         │    │
│  ├───────────┼──────────┼────────┼──────────┼─────────┤    │
│  │ Device C  │   East   │ Online │ pH,Temp  │ 99.9%   │    │
│  │ ID: 3     │ Station  │   ✓    │ Turb,DO  │         │    │
│  ├───────────┼──────────┼────────┼──────────┼─────────┤    │
│  │ Device D  │   West   │Offline │ pH,Temp  │ 85.3%   │    │
│  │ ID: 4     │ Station  │   ○    │          │         │    │
│  ├───────────┼──────────┼────────┼──────────┼─────────┤    │
│  │ Device E  │ Central  │ Online │ pH,Temp  │ 98.5%   │    │
│  │ ID: 5     │ Station  │   ✓    │ Turb,DO  │         │    │
│  └───────────┴──────────┴────────┴──────────┴─────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 📈 Staff Readings Page

```
┌─────────────────────────────────────────────────────────────┐
│                      SENSOR READINGS                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🚨 Critical Readings Detected                       │    │
│  │ 1 reading(s) have critical parameter values         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │Total │ │Normal│ │Warn  │ │Crit  │                       │
│  │  5   │ │  2   │ │  2   │ │  1   │                       │
│  └──────┘ └──────┘ └──────┘ └──────┘                       │
│                                                               │
│  ┌───────────────────────────────────────────────────┐      │
│  │ Device: [All ▼]  Status: [All ▼]                  │      │
│  │ Date Range: [▼ Date Picker]  [📥 Export]          │      │
│  └───────────────────────────────────────────────────┘      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Parameter Reference Ranges                          │    │
│  │ pH: 6.5-8.5 | Temp: 20-30°C | Turb: 0-5 | DO: 5-10│    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Time       │ Device │ pH │Temp│Turb│ DO  │Status   │    │
│  ├────────────┼────────┼────┼────┼────┼─────┼─────────┤    │
│  │10:35:00    │Device A│7.2 │25.5│3.2 │ 8.5 │ Normal  │    │
│  │            │ North  │ ✓  │ ✓  │ ✓  │ ✓   │   ✓     │    │
│  ├────────────┼────────┼────┼────┼────┼─────┼─────────┤    │
│  │10:30:00    │Device B│8.5 │28.0│5.8 │ 6.2 │Warning  │    │
│  │            │ South  │ ⚠  │ ⚠  │ ⚠  │ ✓   │   ⚠     │    │
│  ├────────────┼────────┼────┼────┼────┼─────┼─────────┤    │
│  │10:25:00    │Device C│9.2 │30.5│8.5 │ 4.5 │Critical │    │
│  │            │ East   │ ✗  │ ✗  │ ✗  │ ✗   │   ✗     │    │
│  └────────────┴────────┴────┴────┴────┴─────┴─────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘

Legend:
✓ Green = Normal
⚠ Orange = Warning
✗ Red = Critical
```

---

## 📉 Staff Analytics Page

```
┌─────────────────────────────────────────────────────────────┐
│                        ANALYTICS                             │
│                                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │Avg pH│ │ Temp │ │Turb  │ │Points│                       │
│  │ 7.3  │ │25.8°C│ │ 3.8  │ │ 1432 │                       │
│  └──────┘ └──────┘ └──────┘ └──────┘                       │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ pH Level Trend (24 Hours)                           │    │
│  │    9 ┤                                               │    │
│  │    8 ┤     ╭─╮                                       │    │
│  │    7 ┤───╯   ╰────                                   │    │
│  │    6 ┤                                               │    │
│  │      └────────────────────────────────────           │    │
│  │      00:00      12:00           24:00               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Temperature Trend (24 Hours)                        │    │
│  │   30 ┤           ╭──╮                               │    │
│  │   25 ┤      ╭───╯    ╰──╮                           │    │
│  │   20 ┤───╯               ╰───                       │    │
│  │      └────────────────────────────────────           │    │
│  │      00:00      12:00           24:00               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Device Comparison (Current Readings)                │    │
│  │   10 ┤                                               │    │
│  │    8 ┤  ■ ■     ■ ■     ■ ■     ■ ■                │    │
│  │    6 ┤  ■ ■     ■ ■     ■ ■     ■ ■                │    │
│  │    4 ┤  ■ ■     ■ ■     ■ ■     ■ ■                │    │
│  │    2 ┤  ■ ■     ■ ■     ■ ■     ■ ■                │    │
│  │      └───────────────────────────────               │    │
│  │      Device A  Device B  Device C  Device D         │    │
│  │      ■ pH  ■ Temp  ■ Turbidity                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────────────┐  ┌─────────────────────┐           │
│  │ Water Quality      │  │ System Performance  │           │
│  ├────────────────────┤  ├─────────────────────┤           │
│  │ Overall: Good ✓    │  │ Active: 4/5         │           │
│  │ pH: Normal ✓       │  │ Collection: 98.5%   │           │
│  │ Temp: Normal ✓     │  │ Uptime: 99.2%       │           │
│  │ Turbidity: Mod ⚠   │  │ Alerts: 2 ⚠         │           │
│  └────────────────────┘  └─────────────────────┘           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Coding System

### Status Colors

```
✓ ONLINE    → Green  (#52c41a) ████████
⚠ WARNING   → Orange (#faad14) ████████
✗ CRITICAL  → Red    (#ff4d4f) ████████
○ OFFLINE   → Gray   (#8c8c8c) ████████
ℹ INFO      → Blue   (#1890ff) ████████
```

### Parameter Colors

```
pH:
  6.5 - 8.5  → Green  ████████ Normal
  < 6.5, >8.5 → Red    ████████ Critical

Temperature:
  20 - 30°C  → Green  ████████ Normal
  < 20, > 30 → Red    ████████ Critical

Turbidity:
  0 - 5 NTU  → Green  ████████ Normal
  > 5        → Orange ████████ Warning

Dissolved Oxygen:
  5 - 10 mg/L → Green  ████████ Normal
  < 5, > 10   → Orange ████████ Warning
```

---

## 📱 Responsive Views

### Desktop (> 1024px)

```
┌───────┬────────────────────────────────────┐
│       │                                    │
│ SIDE  │         FULL CONTENT               │
│ BAR   │         ALL COLUMNS                │
│ 200px │         VISIBLE                    │
│       │                                    │
└───────┴────────────────────────────────────┘
```

### Tablet (768px - 1024px)

```
┌────┬─────────────────────────────────────┐
│    │                                     │
│ S  │         RESPONSIVE GRID             │
│ I  │         2 COLUMNS                   │
│ D  │         SCROLL IF NEEDED            │
│ E  │                                     │
│    │                                     │
└────┴─────────────────────────────────────┘
```

### Mobile (< 768px)

```
┌───────────────────────┐
│  ☰  [HEADER]   👤     │
├───────────────────────┤
│                       │
│   SINGLE COLUMN       │
│   VERTICAL STACK      │
│   HORIZONTAL SCROLL   │
│                       │
└───────────────────────┘
```

---

## 🎯 Component Hierarchy

```
StaffLayout
├── Sider (Sidebar)
│   ├── Logo
│   └── Menu
│       ├── Dashboard
│       ├── Devices
│       ├── Readings
│       └── Analytics
├── Layout
│   ├── Header
│   │   ├── Toggle Button
│   │   ├── Notifications Badge
│   │   └── UserMenu
│   │       ├── Avatar
│   │       ├── User Info
│   │       ├── Settings Link
│   │       └── Sign Out
│   ├── Content
│   │   └── {children}
│   │       ├── StaffDashboard
│   │       │   ├── Statistics
│   │       │   ├── Alerts
│   │       │   ├── Device Table
│   │       │   └── Quick Actions
│   │       ├── StaffDevices
│   │       │   ├── Statistics
│   │       │   ├── Search & Filter
│   │       │   └── Device Table
│   │       ├── StaffReadings
│   │       │   ├── Alert Banner
│   │       │   ├── Statistics
│   │       │   ├── Filters
│   │       │   ├── Reference Card
│   │       │   └── Readings Table
│   │       └── StaffAnalytics
│   │           ├── Statistics
│   │           ├── pH Chart
│   │           ├── Temp Chart
│   │           ├── Comparison Chart
│   │           └── Info Cards
│   └── Footer
└── Theme Provider
```

---

## 🔄 Navigation Flow

```
                    ┌──────────────┐
                    │ Staff Login  │
                    └──────┬───────┘
                           ↓
                    ┌──────────────┐
              ┌─────┤   Dashboard  ├─────┐
              │     └──────────────┘     │
              ↓                          ↓
      ┌───────────────┐          ┌───────────────┐
      │    Devices    │          │   Readings    │
      └───────┬───────┘          └───────┬───────┘
              │                          │
              └──────────┬───────────────┘
                         ↓
                  ┌──────────────┐
                  │  Analytics   │
                  └──────────────┘

All pages accessible from sidebar menu
```

---

## 🎨 Button States

```
Primary Button:
Normal   → [  View Details  ]  Blue background
Hover    → [  View Details  ]  Darker blue
Active   → [  View Details  ]  Even darker
Disabled → [  View Details  ]  Gray

Default Button:
Normal   → [  Export Data   ]  White background
Hover    → [  Export Data   ]  Light gray
Active   → [  Export Data   ]  Darker gray

Link Button:
Normal   → [  View All  →   ]  Blue text
Hover    → [  View All  →   ]  Darker blue underline
```

---

## 🏆 Visual Highlights

### Dashboard Statistics Cards
```
┌─────────────────┐
│  Total Devices  │
│       🔌        │
│       4         │
└─────────────────┘
```

### Device Status Badge
```
Online  → [ ✓ Online  ]  Green
Warning → [ ⚠ Warning ]  Orange
Offline → [ ○ Offline ]  Gray
```

### Alert Severity Tags
```
HIGH    → [ ⚠ HIGH   ]  Red
MEDIUM  → [ ⚠ MEDIUM ]  Orange
LOW     → [ ℹ LOW    ]  Blue
```

### Sensor Tags
```
[ pH ] [ Temp ] [ Turb ] [ DO ] [ TDS ]
Blue   Blue     Blue     Blue    Blue
```

---

## 📊 Chart Styles

### Line Chart (pH/Temp Trends)
- **Line Color**: Green (pH), Blue (Temp)
- **Line Width**: 2px
- **Grid**: Dashed (#ccc)
- **Tooltip**: White background, shadow
- **Legend**: Bottom position

### Bar Chart (Device Comparison)
- **Bar Colors**: Green (pH), Blue (Temp), Orange (Turb)
- **Bar Width**: Auto
- **Grid**: Dashed
- **Labels**: Bottom, rotated if needed

---

**Version**: 1.0.0  
**Last Updated**: January 21, 2025  
**Status**: ✅ Complete

---

Use this guide as a visual reference for the Staff Dashboard UI! 🎨
