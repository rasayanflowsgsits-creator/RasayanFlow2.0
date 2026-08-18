import React from 'react';
import useAuthStore from '../store/authStore';
import { 
  ShieldCheck, Store, FlaskConical, GraduationCap, BookOpen, 
  Settings, CheckCircle2, Sparkles, Layers, ArrowRight, UserCheck
} from 'lucide-react';

const ROLE_MANUALS = {
  super_admin: {
    id: 'super_admin',
    roleName: 'Super Admin',
    title: 'Super Admin Operational System Manual',
    badge: 'Master System Governance',
    icon: ShieldCheck,
    overview: 'As Super Admin, you hold master administrative governance over the entire RasayanFlow system across all pharmacy departments, laboratories, central store facilities, and user accounts.',
    capabilities: [
      'Master User Administration & Role Provisioning across all institute departments',
      'Laboratory Facility Provisioning, Admin Assignment, and Safety Stock Threshold configuration',
      'Master Central Store Monitoring & Financial Stock Valuation oversight',
      'System-wide Audit Tracking, Live Monitor Logs, and Automated Security Oversight',
      'Global Safety Hazard Thresholds and Institution Compliance Reporting'
    ],
    handlingSteps: [
      {
        step: 1,
        title: 'Super Admin Dashboard Access',
        desc: 'Log into the master dashboard to view real-time counts of total active laboratories, central store valuation, active users, and system alert notifications.'
      },
      {
        step: 2,
        title: 'User & Permission Management',
        desc: 'Navigate to User Management to approve new account registrations, set user roles (Lab Admin, Store Manager, Faculty, Student), or adjust access permissions.'
      },
      {
        step: 3,
        title: 'Laboratory Facility Management',
        desc: 'Manage or configure new lab facilities under Lab Management. Assign dedicated Lab Admins and set chemical allocation thresholds for each lab.'
      },
      {
        step: 4,
        title: 'Institution Audit & Reporting',
        desc: 'Access system audit logs under History/Reports to view comprehensive stock movement analytics, safety compliance records, and export institutional PDF/CSV reports.'
      }
    ],
    workflowFlowchart: ['Super Admin Login', 'User & Lab Governance', 'Set Safety Thresholds', 'Review Master Audit Logs']
  },
  store_manager: {
    id: 'store_manager',
    title: 'Central Store Manager System Manual',
    roleName: 'Central Store Manager',
    badge: 'Central Inventory & Issue Authority',
    icon: Store,
    overview: 'As Central Store Manager, you control the institute’s primary chemical and equipment repository, managing bulk vendor receiving, lab stock fulfillment, direct PhD scholar requisitions, and receipt code logging.',
    capabilities: [
      'Central Inventory Control (Pure grade chemicals, analytical solvents, glasswares, apparatus)',
      'Direct PhD Scholar Requisition review, approval, and immediate stock release',
      'Lab Admin bulk stock replenishment request processing & dispatch tracking',
      'Automated Store Receipt Code generation (REC-2026-XXXX) upon stock approval',
      'Inwarding new stock shipments via manual entry or bulk CSV imports',
      'Stock Valuation, Monthly Inward/Outward history, and Low Stock alerts'
    ],
    handlingSteps: [
      {
        step: 1,
        title: 'Daily Store Dashboard Operations',
        desc: 'Access your Store Dashboard to view weekly stock receipts, active inventory counts, total monetary valuation, and pending store requisitions.'
      },
      {
        step: 2,
        title: 'Reviewing Incoming Requisitions',
        desc: 'Go to Store Requisitions. Review incoming requests from Lab Admins and PhD Scholars detailing chemical name, CAS number, quantity, and research purpose.'
      },
      {
        step: 3,
        title: 'Stock Approval & Receipt Issuance',
        desc: 'Click Approve on a requisition. The system automatically deducts Central Store stock, logs tracking history, and issues a Store Receipt Code (REC-XXXX).'
      },
      {
        step: 4,
        title: 'Inwarding New Vendor Shipments',
        desc: 'Use Add Inventory or Bulk CSV Import when new chemical shipments arrive from suppliers to update central stock balances.'
      },
      {
        step: 5,
        title: 'Audit & Stock Valuation Reports',
        desc: 'Access Store History to view monthly stock inwarding vs. outwarding trends and export financial valuation reports.'
      }
    ],
    workflowFlowchart: ['Store Manager Login', 'Review PhD & Lab Requisitions', 'Approve Stock & Generate Receipt (REC-XXXX)', 'Inward Supplier Stock']
  },
  lab_admin: {
    id: 'lab_admin',
    title: 'Lab Admin Operational System Manual',
    roleName: 'Lab Admin / Technician',
    badge: 'Departmental Lab Operations',
    icon: FlaskConical,
    overview: 'As Lab Admin, you oversee daily lab operations, practical experiment setups, student chemical borrow request approvals, and store stock replenishment for your designated lab facility.',
    capabilities: [
      'Lab-specific Inventory Control (Chemicals, reagents, glasswares allocated to your lab)',
      'Requisitioning bulk chemical stock replenishment from the Central Store Manager',
      'Practical Experiment & Student Group/Batch configuration',
      'Real-time Student Borrow Request approval during practical sessions',
      'Lab History Archiving by Month (Jan-Dec) and Year (2026-2056) with CSV/PDF exports'
    ],
    handlingSteps: [
      {
        step: 1,
        title: 'Lab Dashboard Monitoring',
        desc: 'Open your assigned lab dashboard to check available lab chemicals, low-stock warnings, active practical groups, and pending student requests.'
      },
      {
        step: 2,
        title: 'Requisitioning Store Replenishment',
        desc: 'Go to Store Requests -> Click New Request to Central Store to ask the Store Manager for bulk chemicals needed for upcoming practicals.'
      },
      {
        step: 3,
        title: 'Practical Session Setup',
        desc: 'Under Experiments & Groups, configure practical lab sessions, assign required chemicals/equipment per student group, and set safety limits.'
      },
      {
        step: 4,
        title: 'Approving Student Borrows',
        desc: 'Open Student Requests, verify student roll numbers and experiment requirements, and click Approve to issue lab chemicals.'
      },
      {
        step: 5,
        title: 'Archiving & History Reports',
        desc: 'Use Lab History to filter stock transactions by year/month and export audit reports for departmental records.'
      }
    ],
    workflowFlowchart: ['Lab Admin Login', 'Requisition Stock from Store', 'Set Up Practical Sessions', 'Approve Student Chemical Borrows']
  },
  phd_scholar: {
    id: 'phd_scholar',
    title: 'PhD Scholar Direct Requisition Manual',
    roleName: 'PhD Research Scholar',
    badge: 'Direct Central Store Requisition Authority',
    icon: GraduationCap,
    overview: 'As a PhD Scholar, you hold direct requisition rights to the Central Store Manager for independent doctoral research, bypassing intermediate lab quotas and semester structures.',
    capabilities: [
      'Direct Central Store Requisition access bypassing lab admin approvals',
      'Project & Thesis Title mapping with Supervisor/Guide details',
      'Live Chemical & CAS Number autocomplete from Central Store Inventory',
      'Real-Time Store Receipt Code (REC-XXXX) tracking for physical chemical pickup',
      'Personal Research Requisition history and audit trail'
    ],
    handlingSteps: [
      {
        step: 1,
        title: 'PhD Scholar Portal Access',
        desc: 'Log into the PhD Research Dashboard. You will see direct access controls and central store stats.'
      },
      {
        step: 2,
        title: 'Submit Direct Requisition',
        desc: 'Click New Chemical Request. Enter chemical name, CAS number, quantity/unit, research synthesis purpose, thesis project title, and guide name.'
      },
      {
        step: 3,
        title: 'Direct Store Manager Processing',
        desc: 'Your request is routed directly to the Central Store Manager marked with a PhD Research tag.'
      },
      {
        step: 4,
        title: 'Chemical Collection with Receipt Code',
        desc: 'Once approved by the Store Manager, view your official Store Receipt Code (REC-XXXX) on your card and present it at the Central Store for chemical pickup.'
      }
    ],
    workflowFlowchart: ['PhD Scholar Login', 'Submit Direct Store Request', 'Store Manager Approves', 'Receive Receipt (REC-XXXX) & Pickup']
  },
  mpharm_scholar: {
    id: 'mpharm_scholar',
    title: 'M.Pharm Scholar System Manual',
    roleName: 'M.Pharm Research Scholar',
    badge: 'Post-Graduate Departmental Research',
    icon: FlaskConical,
    overview: 'As an M.Pharm Scholar, you conduct specialized thesis research across post-graduate pharmacy branches (Pharmaceutics, Pharmacology, Chemistry, QA) utilizing departmental lab inventory.',
    capabilities: [
      'Departmental Research Lab access for specialized synthesis and testing',
      'Requesting high-purity reagents, analytical grade solvents, and specialized equipment',
      'Synthesis parameter logging and chemical consumption tracking',
      'Departmental thesis project integration and lab admin coordination'
    ],
    handlingSteps: [
      {
        step: 1,
        title: 'Dashboard Access',
        desc: 'Access your M.Pharm Research Dashboard to view assigned research labs and specialized inventory.'
      },
      {
        step: 2,
        title: 'Request Reagents & Apparatus',
        desc: 'Browse departmental lab stock, select required high-purity chemicals or analytical instruments, enter research objective, and submit request.'
      },
      {
        step: 3,
        title: 'Lab Admin Coordination',
        desc: 'Coordinate with the Lab Admin for specialized equipment calibration and chemical dispensing.'
      },
      {
        step: 4,
        title: 'Tracking & Return',
        desc: 'Monitor past borrowing history and return reusable apparatus upon practical/synthesis completion.'
      }
    ],
    workflowFlowchart: ['M.Pharm Login', 'Select Research Lab', 'Submit Advanced Reagent Request', 'Conduct Synthesis & Return Apparatus']
  },
  mtech_scholar: {
    id: 'mtech_scholar',
    title: 'M.Tech Scholar System Manual',
    roleName: 'M.Tech Research Scholar',
    badge: 'Process & Pilot Plant Technology',
    icon: Settings,
    overview: 'As an M.Tech Scholar, your focus is on pharmaceutical engineering, pilot-scale formulation, process optimization, and heavy analytical instrumentation.',
    capabilities: [
      'Industrial Pharmaceutical Technology & Pilot Plant Lab access',
      'Bulk formulation material & process chemical requisitions',
      'Heavy machinery slotting (HPLC, Tablet Compression, Lyophilizers, UV-Vis Spectrophotometers)',
      'Process yield tracking and raw material usage logging'
    ],
    handlingSteps: [
      {
        step: 1,
        title: 'Dashboard Access',
        desc: 'Log into your M.Tech Portal to view assigned technology labs, machinery availability, and pilot plant stock.'
      },
      {
        step: 2,
        title: 'Material & Equipment Request',
        desc: 'Submit process chemical requests specifying formulation parameters, batch sizes, and required equipment slots.'
      },
      {
        step: 3,
        title: 'Process Trial Execution',
        desc: 'Execute process optimization trials under Lab Admin supervision using dispensed pilot plant materials.'
      },
      {
        step: 4,
        title: 'Material Reconciliation',
        desc: 'Record raw material consumption and ensure proper cleaning and return of pilot plant apparatus.'
      }
    ],
    workflowFlowchart: ['M.Tech Login', 'Select Tech Lab & Equipment', 'Request Process Chemicals', 'Run Trial & Log Consumption']
  },
  bpharm_student: {
    id: 'bpharm_student',
    title: 'B.Pharm Student System Manual',
    roleName: 'B.Pharm Student',
    badge: 'Undergraduate Curriculum Practical',
    icon: BookOpen,
    overview: 'As a B.Pharm Student, you participate in scheduled academic practical coursework, group experiment borrowing, and foundational pharmacy practical training.',
    capabilities: [
      'Year & Semester structured practical schedule (Y1-Y4, Sem 1-8)',
      'Group-based chemical & glassware borrowing for pre-configured practical experiments',
      'Live experiment practical syllabus, safety guides, and required chemical lists',
      'Personal borrow history and apparatus return status tracking'
    ],
    handlingSteps: [
      {
        step: 1,
        title: 'Dashboard Access',
        desc: 'View current Year & Semester schedule, assigned lab, and upcoming practical experiments (e.g. Organic Chemistry, Pharmaceutics).'
      },
      {
        step: 2,
        title: 'Select Practical Experiment',
        desc: 'Select the scheduled experiment (e.g. Synthesis of Aspirin or Preparation of Simple Syrup IP).'
      },
      {
        step: 3,
        title: 'Submit Chemical Request',
        desc: 'Review pre-allocated experiment chemicals & apparatus, enter required quantities per group, and submit to Lab Admin.'
      },
      {
        step: 4,
        title: 'Lab Execution & Return',
        desc: 'Receive Lab Admin approval, collect chemicals during practical hours, and safely return reusable glasswares after practical completion.'
      }
    ],
    workflowFlowchart: ['B.Pharm Login', 'Select Year/Sem Practical', 'Request Experiment Chemicals', 'Receive Approval & Perform Practical']
  }
};

export default function AboutPage() {
  const { user } = useAuthStore();

  // Robust Normalized Role Resolver supporting hyphenated, camelCase, snake_case, and spaced strings
  const getActiveUserRoleKey = () => {
    if (!user) return 'bpharm_student';
    
    // Normalize role string: convert to lowercase and replace hyphens/spaces with underscores
    const rawRole = (user.role || '').toLowerCase().trim().replace(/[- ]/g, '_');
    const course = (user.course || '').trim();

    // 1. Super Admin
    if (rawRole === 'super_admin' || rawRole === 'superadmin' || rawRole === 'admin') {
      return 'super_admin';
    }

    // 2. Store Manager / Store Admin
    if (rawRole === 'store_manager' || rawRole === 'storemanager' || rawRole === 'store_admin' || rawRole === 'storeadmin') {
      return 'store_manager';
    }

    // 3. Lab Admin / Technician
    if (rawRole === 'lab_admin' || rawRole === 'labadmin' || rawRole === 'technician') {
      return 'lab_admin';
    }

    // 4. Student / Scholar Sub-Types based on Course / isPhD
    if (course === 'PhD' || user.isPhD || rawRole === 'phd' || rawRole === 'phd_scholar') {
      return 'phd_scholar';
    }
    if (course === 'M.Pharm' || rawRole === 'mpharm' || rawRole === 'm_pharm') {
      return 'mpharm_scholar';
    }
    if (course === 'M.Tech' || rawRole === 'mtech' || rawRole === 'm_tech') {
      return 'mtech_scholar';
    }

    return 'bpharm_student';
  };

  const activeRoleKey = getActiveUserRoleKey();
  const currentManual = ROLE_MANUALS[activeRoleKey] || ROLE_MANUALS.bpharm_student;
  const RoleIcon = currentManual.icon;

  return (
    <div className="min-h-screen bg-[#fdfdf7] dark:bg-[#141811] text-[#37412a] dark:text-[#e4e9d8] p-4 md:p-8 space-y-6 font-sans pb-24 text-left">
      
      {/* Dynamic Header */}
      <div className="border-b border-[#cfd8bd] dark:border-[#38432a] pb-4 space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#5c6e46] dark:text-[#a8be8a]" />
          <h1 className="text-2xl sm:text-3xl font-black text-[#37412a] dark:text-[#e4e9d8] tracking-tight">
            About Your Assigned Role — {currentManual.roleName}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[#71805a] dark:text-[#a5b48b] font-semibold">
          Detailed operational manual, authorized capabilities, and step-by-step system handling guide for your active role.
        </p>
      </div>

      {/* Logged-In User Profile Card */}
      <div className="bg-[#fffef8] dark:bg-[#1a1d16] border border-[#cfd8bd] dark:border-[#414a33] rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded bg-[#5c6e46] text-white flex items-center justify-center font-black text-base uppercase">
            {user?.name ? user.name[0] : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-[#37412a] dark:text-[#e4e9d8]">{user?.name || 'Authorized User'}</span>
              <span className="bg-[#5c6e46] text-white border border-[#5c6e46] px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider">
                {currentManual.roleName}
              </span>
            </div>
            <span className="text-xs text-[#71805a] dark:text-[#9fb384] font-semibold">
              Authenticated Session • Assigned System Flow: <strong>{currentManual.badge}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#f4f6ee] dark:bg-[#20251a] px-3 py-1.5 rounded border border-[#cfd8bd] dark:border-[#414a33]">
          <UserCheck size={16} className="text-[#5c6e46] dark:text-[#a8be8a]" />
          <span className="text-xs font-black text-[#5c6e46] dark:text-[#a8be8a]">Active Role Profile</span>
        </div>
      </div>

      {/* Single Role Manual Card */}
      <div className="rounded-lg bg-[#fffef8] dark:bg-[#1a1d16] border-2 border-[#5c6e46] p-5 sm:p-7 shadow-2xs space-y-6">
        
        {/* Manual Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#cfd8bd] dark:border-[#414a33]">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded border border-[#5c6e46] bg-[#f4f6ee] dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a]">
              <RoleIcon className="w-8 h-8" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded bg-[#5c6e46] text-white text-[10px] font-black uppercase tracking-wider">
                {currentManual.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] mt-0.5">
                {currentManual.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Overview Box */}
        <div className="p-4 bg-[#f4f6ee] dark:bg-[#20251a] rounded border border-[#cfd8bd] dark:border-[#414a33]">
          <h3 className="text-xs font-black text-[#5c6e46] dark:text-[#a8be8a] uppercase tracking-wider mb-1">
            Role Functionality & Primary Mandate:
          </h3>
          <p className="text-xs sm:text-sm font-bold text-[#37412a] dark:text-[#e4e9d8] leading-relaxed">
            {currentManual.overview}
          </p>
        </div>

        {/* Authorized Capabilities Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#5c6e46] dark:text-[#a8be8a]" />
            <span>Authorized System Actions & Capabilities</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {currentManual.capabilities.map((cap, idx) => (
              <div 
                key={idx}
                className="p-3 bg-white dark:bg-[#20251a] rounded border border-[#cfd8bd] dark:border-[#414a33] text-xs font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-start gap-2.5"
              >
                <CheckCircle2 size={16} className="text-[#5c6e46] dark:text-[#a8be8a] shrink-0 mt-0.5" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step-by-Step Handling Guide */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-black text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#5c6e46] dark:text-[#a8be8a]" />
            <span>Step-by-Step System Handling Guide</span>
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {currentManual.handlingSteps.map((item) => (
              <div 
                key={item.step}
                className="p-4 bg-[#fdfdf7] dark:bg-[#20251a] rounded border border-[#cfd8bd] dark:border-[#414a33] shadow-2xs flex items-start gap-3.5"
              >
                <div className="w-7 h-7 rounded bg-[#5c6e46] text-white flex items-center justify-center shrink-0 font-black text-xs">
                  {item.step}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-[#37412a] dark:text-[#e4e9d8]">
                    {item.title}
                  </h4>
                  <p className="text-xs font-semibold text-[#71805a] dark:text-[#a5b48b] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Flowchart */}
        <div className="p-4 bg-[#f4f6ee] dark:bg-[#20251a] rounded border border-[#cfd8bd] dark:border-[#414a33] space-y-2">
          <h4 className="text-xs font-black text-[#5c6e46] dark:text-[#a8be8a] uppercase tracking-wider">
            Your System Execution Flow:
          </h4>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[#37412a] dark:text-[#e4e9d8]">
            {currentManual.workflowFlowchart.map((node, idx) => (
              <React.Fragment key={idx}>
                <span className="bg-white dark:bg-[#1a1d16] px-3 py-1 rounded border border-[#cfd8bd] dark:border-[#414a33]">
                  {node}
                </span>
                {idx < currentManual.workflowFlowchart.length - 1 && (
                  <ArrowRight size={14} className="text-[#5c6e46] dark:text-[#a8be8a]" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
