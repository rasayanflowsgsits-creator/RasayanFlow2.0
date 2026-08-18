<div align="center">

# 🧪 RasayanFlow 2.0
### *Next-Generation Pharmacy Laboratory & Central Store Intelligence Ecosystem*

[![Pharmacy System](https://img.shields.io/badge/Domain-Pharmaceutical%20Science-5c6e46?style=for-the-badge&logo=flask)](https://github.com)
[![Role Governance](https://img.shields.io/badge/Access-Multi--Role%20Governance-37412a?style=for-the-badge&logo=shield)](https://github.com)
[![Chemical Data](https://img.shields.io/badge/Chemical%20Data-PubChem%20Enriched-71805a?style=for-the-badge&logo=molecules)](https://github.com)
[![Archival Support](https://img.shields.io/badge/Ledger-30%2B%20Years%20Archival-556b2f?style=for-the-badge&logo=database)](https://github.com)

---

<p align="center">
  <b>RasayanFlow 2.0</b> is an enterprise-grade academic pharmacy management ecosystem designed specifically for pharmaceutical institutes. It unifies central store bulk inventory, departmental research laboratories, practical curriculum coursework, and doctoral thesis requisitions into a single, seamless, role-aware digital platform.
</p>

</div>

---

## 🌟 Executive Summary

Traditional pharmacy laboratories face critical operational challenges, including untracked chemical consumption, manual store receipts, safety threshold oversights, and complex multi-department borrowing workflows. 

**RasayanFlow 2.0** resolves these challenges by introducing:
- **Central Store Operations**: Real-time monetary valuation, vendor bulk receiving, and low-stock alerts.
- **Direct PhD Scholar Requisitions**: Independent store access bypassing intermediate lab queues, backed by automated **Store Receipt Code (`REC-2026-XXXX`)** generation.
- **Departmental Lab Governance**: Comprehensive practical experiment setup, group-based chemical borrowing, and student request approvals.
- **Academic Hierarchy Support**: Tailored interfaces for B.Pharm, M.Pharm, M.Tech, PhD Scholars, Lab Technicians, Store Managers, and Super Administrators.
- **30+ Year Historical Ledger**: Complete historical audit tracking from 2026 through 2056 with full PDF and CSV export capabilities.

---

## 🔄 System Architecture & Operational Workflow

```mermaid
flowchart TD
    %% Roles
    SA["🛡️ Super Admin"]
    SM["🏪 Central Store Manager"]
    LA["🔬 Lab Admin / Technician"]
    PhD["🎓 PhD Research Scholar"]
    PG["🧪 M.Pharm / M.Tech Scholar"]
    UG["📚 B.Pharm Student"]

    %% Core System Hubs
    CentralStore[("📦 Central Store Repository")]
    LabStore[("🧪 Departmental Lab Inventory")]
    
    %% Workflows
    SA -->|Master Governance & Provisioning| CentralStore
    SA -->|Lab Facility & Role Assignment| LabStore

    SM -->|Bulk Vendor Inwarding| CentralStore
    SM -->|Fulfill Bulk Replenishment| LabStore
    SM -->|Approve Direct Requisitions| PhD

    PhD -->|Direct Chemical Request| CentralStore
    PhD -->|Generates Receipt REC-XXXX| CentralStore

    LA -->|Requisition Replenishment| CentralStore
    LA -->|Configure Practicals & Approve| UG
    LA -->|Dispense Reagents| PG

    UG -->|Group Chemical Borrowing| LabStore
    PG -->|Thesis Research Requests| LabStore
```

---

## 📋 Role-Aware System Manual & Operational Flow

RasayanFlow 2.0 automatically tailors its interface and operational workflow based on the active user's authenticated role and academic program.

### 🛡️ 1. Super Admin (Master Governance)
- **Primary Mandate**: Oversees institutional system configuration, user role allocations, laboratory provisioning, central store financial metrics, and audit compliance.
- **Key Capabilities**:
  - Provisioning new pharmacy laboratories (*e.g., Organic Chemistry, Pharmaceutics, Pharmacology*).
  - Setting safety stock threshold limits and assigning dedicated Lab Admins.
  - Institutional user approval, password resets, and role modifications.
  - Live activity monitoring and regulatory compliance reporting.

---

### 🏪 2. Central Store Manager
- **Primary Mandate**: Manages the institute’s primary chemical and equipment repository, vendor shipments, lab stock dispatches, and PhD scholar requisitions.
- **Key Capabilities**:
  - Inwarding new chemical shipments manually or via **Bulk CSV/Spreadsheet Imports**.
  - Reviewing and approving direct chemical requests from PhD Scholars.
  - Automated **Store Receipt Code (`REC-2026-XXXX`)** generation upon stock release.
  - Fulfilling bulk lab stock replenishment requests submitted by Lab Admins.
  - Real-time stock valuation monitoring and reorder level alerts.

```mermaid
sequenceDiagram
    autonumber
    actor PhD as PhD Scholar / Lab Admin
    actor SM as Central Store Manager
    participant Store as Central Inventory Hub

    PhD->>SM: Submit Chemical Requisition (CAS, Quantity, Purpose)
    SM->>Store: Review Stock Availability & Hazard Class
    SM->>Store: Click "Approve Requisition"
    Store-->>SM: Deduct Inventory & Update Valuation
    Store-->>PhD: Issue Official Receipt Code (REC-2026-XXXX)
    PhD->>SM: Present REC-XXXX Code at Central Store for Physical Pickup
```

---

### 🔬 3. Lab Admin (Laboratory In-Charge)
- **Primary Mandate**: Manages specific departmental lab facilities, practical experiment setups, student chemical borrow approvals, and store stock replenishment.
- **Key Capabilities**:
  - Configuring practical experiment sessions and group chemical allocation limits.
  - Reviewing and approving real-time student borrow requests during lab practicals.
  - Submitting bulk chemical replenishment requests to the Central Store Manager.
  - Monthly and yearly lab history archiving with CSV and PDF export options.

---

### 🎓 4. PhD Research Scholar
- **Primary Mandate**: Conducts independent doctoral research with direct requisition rights to the Central Store Manager.
- **Key Capabilities**:
  - Bypassing intermediate lab quotas with **Direct Central Store Requisition** rights.
  - Mapping requisitions with Thesis Title, Guide/Supervisor Name, and Reaction Objectives.
  - Real-time **Store Receipt Code (`REC-XXXX`)** tracking for physical chemical pickup.

---

### 🧪 5. M.Pharm & M.Tech Research Scholars
- **Primary Mandate**: Performs post-graduate thesis research, pilot-scale formulation, process optimization, and heavy analytical testing.
- **Key Capabilities**:
  - Requisitioning high-purity reagents and analytical grade solvents.
  - Reserving time slots for heavy analytical equipment (*HPLC, Lyophilizer, UV-Vis Spectrophotometers*).
  - Logging synthesis yield parameters and reconciling raw material consumption.

---

### 📚 6. B.Pharm Undergraduate Students
- **Primary Mandate**: Participates in scheduled academic practical coursework and group experiment borrowing.
- **Key Capabilities**:
  - Accessing Year & Semester structured practical schedules (Y1–Y4, Sem 1–8).
  - Submitting group-based chemical and glassware borrow requests for pre-configured practicals.
  - Viewing experiment safety protocols, required chemical lists, and return history.

---

## ✨ Key Features & Technical Highlights

| Feature Module | Description & Capability |
| :--- | :--- |
| 🧪 **PubChem Chemical Integration** | Auto-completes CAS numbers, molecular formulas, SMILES strings, and safety hazard classes directly from chemical databases. |
| 🏷️ **Store Receipt Code System** | Generates unique, verifiable receipt codes (`REC-2026-XXXX`) for authorized stock collection and audit tracking. |
| 📊 **Financial Inventory Valuation** | Calculates live monetary capitalization of inventory, released lab stock value, and stockout opportunity losses in Indian Rupees (₹). |
| 📜 **30+ Year Historical Ledger** | Scalable historical architecture supporting monthly and annual archival records from **2026 through 2056**. |
| 📱 **Responsive Aesthetic Design** | Glassmorphism UI components, sage/emerald color system, custom dark mode, and full mobile optimization. |
| 📄 **One-Click Export Suite** | Instantly export inventory catalogs, audit trails, store receipts, and monthly ledgers into formatted **PDF** and **CSV** files. |

---

## 🛠️ Technology Stack

RasayanFlow 2.0 is built on a robust, decoupled architecture engineered for high throughput, real-time reactivity, and role-aware security compliance.

| Layer | Technology / Library | Role & Capability |
| :--- | :--- | :--- |
| **Frontend Framework** | ![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black) | Component-driven single-page architecture |
| **Build System** | ![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white) | Instant HMR compilation and production bundling |
| **State Management** | ![Zustand](https://img.shields.io/badge/Zustand-443e38?style=flat-square&logo=redux&logoColor=white) | Lightweight, predictable role-aware store management |
| **Design System** | ![CSS3](https://img.shields.io/badge/Vanilla_CSS-1572B6?style=flat-square&logo=css3&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white) | Glassmorphism cards, sage/emerald theme, dark mode |
| **Icons & UI** | ![Lucide](https://img.shields.io/badge/Lucide_React-F56565?style=flat-square&logo=feather&logoColor=white) | Modern iconography across all role dashboards |
| **Export Suite** | `jsPDF` • `PapaParse` • `XLSX` | Client-side PDF receipt generation & CSV/Excel processing |
| **Backend Runtime** | ![Node.js](https://img.shields.io/badge/Node.js_v18+-339933?style=flat-square&logo=nodedotjs&logoColor=white) | Asynchronous event-driven server runtime |
| **API Framework** | ![Express](https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white) | RESTful API service endpoints and middleware pipelines |
| **Authentication** | ![JWT](https://img.shields.io/badge/JWT_Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) | Encrypted JSON Web Token role-based access control |
| **Real-Time Engine** | ![Socket.io](https://img.shields.io/badge/Socket.IO-010101?style=flat-square&logo=socketdotio&logoColor=white) | Bi-directional websocket engine for live updates |
| **Database Engine** | ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white) | Document database for inventory models & 30+ year audit logs |
| **Scientific Data** | ![PubChem](https://img.shields.io/badge/PubChem_API-0275D8?style=flat-square&logo=molecules&logoColor=white) | Automated CAS lookup, SMILES IDs, and molecular structure data |

---

## 🚀 Quick Setup & Local Development

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/rasayanflowsgsits-creator/RasayanFlow2.0.git
   cd RasayanFlow2.0
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Production Verification Build**:
   ```bash
   npm run build
   ```

---

<div align="center">

### 🏛️ Institutional Compliance & Safety Governance
*Designed for Pharmacy Colleges, Research Institutions, and Industrial Training Laboratories.*

**RasayanFlow 2.0** • *Building the Future of Pharmaceutical Laboratory Intelligence*

</div>
