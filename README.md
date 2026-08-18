<div align="center">

```text
  ____                                      _____ _               ____    ___  
 |  _ \ __ _ ___  __ _ _   _  __ _ _ __    |  ___| | _____      _|___ \  / _ \ 
 | |_) / _` / __|/ _` | | | |/ _` | '_ \   | |_  | |/ _ \ \ /\ / / __) || | | |
 |  _ < (_| \__ \ (_| | |_| | (_| | | | |  |  _| | | (_) \ V  V / / __/ | |_| |
 |_| \_\__,_|___/\__,_|\__, |\__,_|_| |_|  |_|   |_|\___/ \_/\_/ |_____(_)___/ 
                       |___/                                                   
```

### 🧪 *Smart Pharmacy Laboratory & Central Store Intelligence Ecosystem*

[![Pharmacy Domain](https://img.shields.io/badge/Domain-Pharmaceutical%20Science-5c6e46?style=for-the-badge&logo=flask&logoColor=white)](https://github.com)
[![Role Governance](https://img.shields.io/badge/Security-Multi--Role%20Governance-37412a?style=for-the-badge&logo=shield&logoColor=white)](https://github.com)
[![PubChem API](https://img.shields.io/badge/Enrichment-PubChem%20PUG%20REST-71805a?style=for-the-badge&logo=molecules&logoColor=white)](https://github.com)
[![Ledger Scale](https://img.shields.io/badge/Archival-30%2B%20Years%20Ledger%20(2026--2056)-556b2f?style=for-the-badge&logo=database&logoColor=white)](https://github.com)

---

<p align="center">
  <b>RasayanFlow 2.0</b> transforms pharmaceutical education and research management. It bridges the gap between central store bulk inventory, departmental research laboratories, practical curriculum execution, and doctoral thesis synthesis in one unified, role-aware digital platform.
</p>

[📊 Graphical Workflows](#-graphical-workflow-diagrams--sequence-flow) • [👥 Role Manuals](#-role-operational-manuals) • [✨ Capabilities](#-key-capabilities--spotlight) • [🛠️ Tech Stack](#%EF%B8%8F-technology-stack) • [🚀 Quick Start](#-quick-start)

</div>

---

## ⚡ Quick Metrics & Highlights

<div align="center">

| 📦 Inventory Capitalization | 🧾 Verification Engine | 🎓 Research Requisitions | 📅 Archival Scale |
| :---: | :---: | :---: | :---: |
| **Real-time Valuation (₹)** | **Instant Receipt Codes (`REC-XXXX`)** | **Direct PhD Store Access** | **30+ Years Ledger (2026–2056)** |

</div>

---

## 📌 Table of Contents
- [✨ Executive Overview](#-executive-overview)
- [📊 Graphical Workflow Diagrams & Sequence Flow](#-graphical-workflow-diagrams--sequence-flow)
  - [1. B.Pharm Student Practical Chemical Borrow Workflow](#1-bpharm-student-practical-chemical-borrow-workflow)
  - [2. PhD Scholar Direct Central Store Requisition Workflow](#2-phd-scholar-direct-central-store-requisition-workflow)
  - [3. Lab Admin Bulk Store Replenishment & Dispatch Pipeline](#3-lab-admin-bulk-store-replenishment--dispatch-pipeline)
  - [4. Super Admin System Governance & Provisioning Flow](#4-super-admin-system-governance--provisioning-flow)
- [👥 Role Operational Manuals](#-role-operational-manuals)
- [✨ Key Capabilities & Spotlight](#-key-capabilities--spotlight)
- [🛠️ Technology Stack](#%EF%B8%8F-technology-stack)
- [🚀 Quick Start](#-quick-start)

---

## ✨ Executive Overview

In academic pharmaceutical institutes, managing chemical inventory across central stores and multiple departmental laboratories presents severe challenges:
1. **Unmonitored Chemical Depletion**: Absence of real-time safety thresholds leads to sudden practical session cancellations.
2. **Requisition Bottlenecks**: Doctoral scholars face delayed lab approvals for high-priority thesis synthesis.
3. **Paper Receipts & Audit Deficits**: Inability to verify physical chemical collections or generate instant regulatory reports.

**RasayanFlow 2.0** solves these challenges through:
- **Central Store Capitalization**: Live tracking of pure-grade chemicals, analytical solvents, and apparatus with financial valuation in INR (₹).
- **Automated Store Receipt Codes**: Every approved request instantly emits a unique, verifiable **`REC-2026-XXXX`** code for physical pickup.
- **Direct PhD Requisitions**: Doctoral researchers bypass intermediate lab queues to request directly from the Central Store Manager.
- **30+ Year Historical Ledger**: Full transaction auditing spanning **2026 through 2056** with instant PDF & CSV export suites.

---

## 📊 Graphical Workflow Diagrams & Sequence Flow

### 1. B.Pharm Student Practical Chemical Borrow Workflow
> *Illustrates how undergraduate students request chemicals for academic practicals and receive approval from the Lab Admin.*

```mermaid
sequenceDiagram
    autonumber
    actor Student as 📚 B.Pharm Student
    actor LabAdmin as 🔬 Lab Admin / Technician
    participant LabStock as 🧪 Departmental Lab Inventory

    Student->>Student: Select Year & Semester Practical (e.g. Synthesis of Aspirin)
    Student->>LabAdmin: Submit Group Chemical & Glassware Borrow Request
    LabAdmin->>LabAdmin: Receive Notification & Verify Roll Number / Group Limits
    LabAdmin->>LabStock: Click "Approve Borrow Request"
    LabStock-->>LabAdmin: Deduct Lab Chemical Stock & Log Borrow Session
    LabStock-->>Student: Issue Chemicals & Glasswares for Practical
    Student->>LabAdmin: Clean & Return Reusable Glasswares After Practical
```

---

### 2. PhD Scholar Direct Central Store Requisition Workflow
> *Illustrates how doctoral researchers submit direct requisitions to the Store Manager and receive an official receipt code (`REC-XXXX`).*

```mermaid
sequenceDiagram
    autonumber
    actor PhD as 🎓 PhD Research Scholar
    actor StoreMgr as 🏪 Central Store Manager
    participant CentralStore as 📦 Central Store Hub

    PhD->>PhD: Fill Direct Request (CAS Number, Quantity, Thesis Title, Guide Name)
    PhD->>StoreMgr: Submit Requisition (Tagged as PhD Research)
    StoreMgr->>CentralStore: Review Stock Availability & Hazard Class
    StoreMgr->>CentralStore: Click "Approve Requisition"
    CentralStore-->>StoreMgr: Deduct Central Stock & Log Audit Record
    CentralStore-->>PhD: Issue Official Store Receipt Code (REC-2026-XXXX)
    PhD->>StoreMgr: Present REC-XXXX Code at Central Store for Physical Pickup
```

---

### 3. Lab Admin Bulk Store Replenishment & Dispatch Pipeline
> *Illustrates how a Lab Admin requests bulk stock replenishment from the Central Store Manager when lab inventory runs low.*

```mermaid
sequenceDiagram
    autonumber
    actor LabAdmin as 🔬 Lab Admin / In-Charge
    actor StoreMgr as 🏪 Central Store Manager
    participant CentralStore as 📦 Central Store Inventory
    participant LabStock as 🧪 Departmental Lab Inventory

    LabAdmin->>LabAdmin: Low Stock Alert Triggered (<15% Safety Limit)
    LabAdmin->>StoreMgr: Submit Bulk Store Replenishment Request
    StoreMgr->>CentralStore: Check Store Balance & Lab Quota Allocation
    StoreMgr->>CentralStore: Click "Approve & Dispatch Stock"
    CentralStore-->>StoreMgr: Deduct Central Store Inventory
    StoreMgr->>LabAdmin: Dispatch Chemical Shipment to Lab
    LabAdmin->>LabStock: Confirm Receipt -> Departmental Lab Stock Restocked
```

---

### 4. Super Admin System Governance & Provisioning Flow
> *Illustrates master governance, facility provisioning, user approval, and compliance logging.*

```mermaid
flowchart TD
    subgraph Login ["🛡️ Super Admin Access"]
        Admin["Super Admin"]
    end

    subgraph UserMgmt ["👥 User Administration"]
        Approve["Approve Registrations"]
        AssignRole["Assign Roles: Lab Admin / Store Manager / Student"]
    end

    subgraph FacilityMgmt ["🏢 Laboratory Provisioning"]
        CreateLab["Provision New Lab Facility"]
        SetLimits["Configure Safety Stock Thresholds"]
    end

    subgraph AuditLog ["📊 Institutional Audit"]
        MasterValuation["Monitor Central Store Valuation (₹)"]
        ExportLogs["Export 30+ Year PDF/CSV Audit Reports"]
    end

    Admin --> Approve
    Admin --> CreateLab
    Approve --> AssignRole
    CreateLab --> SetLimits
    SetLimits --> MasterValuation
    AssignRole --> ExportLogs
```

---

## 👥 Role Operational Manuals

### 🛡️ 1. Super Admin (Master Governance)
> **Mandate**: Holds master governance over system configuration, user role allocations, laboratory provisioning, central store financial oversight, and compliance auditing.

- **Key Capabilities**:
  - **User & Permission Provisioning**: Approve account registrations and assign roles across departments.
  - **Facility Setup**: Provision new laboratories (*e.g., Pharmaceutics, Organic Chemistry*), set chemical thresholds, and assign lab in-charges.
  - **Master Audit Trail**: Inspect live security logs, active logins, and institutional compliance metrics.

---

### 🏪 2. Central Store Manager
> **Mandate**: Controls the institute's central chemical and equipment repository, bulk vendor receiving, lab stock fulfillment, and direct PhD scholar requisitions.

- **Key Capabilities**:
  - **Bulk Inwarding**: Upload new supplier chemical shipments via **Bulk CSV/Spreadsheet Imports** or manual entry.
  - **PhD Direct Approvals**: Review doctoral chemical requisitions and issue official **`REC-2026-XXXX`** Store Receipt Codes.
  - **Lab Dispatch**: Process bulk chemical replenishment requests submitted by Lab Admins.
  - **Financial Metrics**: Track total inventory capitalization, released stock value, and low-stock warnings.

---

### 🔬 3. Lab Admin (Laboratory In-Charge)
> **Mandate**: Oversees daily lab operations, practical experiment setups, student chemical borrow request approvals, and store stock replenishment.

- **Key Capabilities**:
  - **Practical Setup**: Configure practical sessions (*e.g., Synthesis of Aspirin*), assign group chemical limits, and publish to students.
  - **Borrow Approvals**: Review and approve student chemical borrow requests during practical hours.
  - **Store Replenishment**: Requisition bulk chemical stock replenishment from the Central Store Manager.
  - **Archiving & Audit**: Filter stock movement by year/month and export PDF/CSV audit reports.

---

### 🎓 4. PhD Research Scholar
> **Mandate**: Conducts independent doctoral research with direct requisition rights to the Central Store Manager.

- **Key Capabilities**:
  - **Direct Store Access**: Submit chemical requisitions directly to the Central Store Manager, bypassing lab quotas.
  - **Thesis Mapping**: Map requests with Thesis Project Title, Supervisor/Guide Name, and Reaction Objectives.
  - **Receipt Tracking**: Receive instant **`REC-XXXX`** Store Receipt Codes on approved requests for chemical pickup.

---

### 🧪 5. M.Pharm & M.Tech Scholars
> **Mandate**: Conducts post-graduate thesis research, pilot-scale formulation, process optimization, and analytical testing.

- **Key Capabilities**:
  - Requisitioning high-purity reagents and analytical grade solvents.
  - Slotting heavy analytical machinery (*HPLC, Lyophilizers, UV-Vis Spectrophotometers*).
  - Logging synthesis yield parameters and reconciling raw material usage.

---

### 📚 6. B.Pharm Undergraduate Students
> **Mandate**: Participates in scheduled academic practical coursework and group experiment borrowing.

- **Key Capabilities**:
  - Accessing Year & Semester structured practical schedules (Y1–Y4, Sem 1–8).
  - Submitting group chemical borrow requests for pre-configured practical experiments.
  - Viewing safety protocols, required chemical lists, and glassware return statuses.

---

## ✨ Key Capabilities & Spotlight

| Feature Module | Description & Capability |
| :--- | :--- |
| 🧪 **PubChem Chemical Integration** | Auto-completes CAS numbers, molecular formulas, SMILES identifiers, and hazard classes. |
| 🏷️ **Store Receipt Code System** | Generates unique, verifiable receipt codes (`REC-2026-XXXX`) for physical stock collection. |
| 📊 **Financial Inventory Valuation** | Calculates live monetary inventory value, released lab stock value, and stockout deficit in INR (₹). |
| 📜 **30+ Year Historical Ledger** | Scalable historical architecture supporting monthly and annual records from **2026 to 2056**. |
| 📱 **Responsive Aesthetic Design** | Glassmorphism UI cards, sage/emerald color system, custom dark mode, and full mobile support. |
| 📄 **One-Click Export Suite** | Export inventory catalogs, audit logs, store receipts, and monthly ledgers into formatted **PDF** and **CSV** files. |

---

## 🛠️ Technology Stack

RasayanFlow 2.0 is built on a modern, decoupled architecture designed for reactivity, scalability, and security compliance.

| Layer | Technology / Library | Role & Capability |
| :--- | :--- | :--- |
| **Frontend Framework** | ![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black) | Component-driven single-page application |
| **Build Engine** | ![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white) | Instant HMR compilation and production bundling |
| **State Management** | ![Zustand](https://img.shields.io/badge/Zustand-443e38?style=flat-square&logo=redux&logoColor=white) | Centralized, lightweight role-aware store management |
| **Design System** | ![CSS3](https://img.shields.io/badge/Vanilla_CSS-1572B6?style=flat-square&logo=css3&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) | Glassmorphism cards, sage/emerald palette, dark mode |
| **Icons & UI** | ![Lucide](https://img.shields.io/badge/Lucide_React-F56565?style=flat-square&logo=feather&logoColor=white) | Modern iconography across all dashboards |
| **Export Suite** | `jsPDF` • `PapaParse` • `XLSX` | Client-side PDF receipt generation & CSV/Excel processing |
| **Backend Runtime** | ![Node.js](https://img.shields.io/badge/Node.js_v18+-339933?style=flat-square&logo=nodedotjs&logoColor=white) | Asynchronous event-driven server runtime |
| **API Framework** | ![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white) | RESTful API service endpoints and middleware |
| **Authentication** | ![JWT](https://img.shields.io/badge/JWT_Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) | Encrypted JSON Web Token role-based access control |
| **Real-Time Engine** | ![Socket.io](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white) | Bi-directional websocket engine for live updates |
| **Database Engine** | ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white) | Document database for inventory models & 30+ year audit logs |
| **Scientific Data** | ![PubChem](https://img.shields.io/badge/PubChem_API-0275D8?style=flat-square&logo=molecules&logoColor=white) | Automated CAS lookup, SMILES IDs, and molecular structure data |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Launch

1. **Clone Repository**:
   ```bash
   git clone https://github.com/rasayanflowsgsits-creator/RasayanFlow2.0.git
   cd RasayanFlow2.0
   ```

2. **Frontend Development Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Production Build Validation**:
   ```bash
   npm run build
   ```

---

<div align="center">

### 🏛️ Institutional Compliance & Safety Governance
*Engineered for Pharmacy Colleges, Research Institutions, and Industrial Training Laboratories.*

**RasayanFlow 2.0** • *Building the Future of Pharmaceutical Laboratory Intelligence*

</div>
