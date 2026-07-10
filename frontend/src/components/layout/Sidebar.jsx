import {
  LayoutDashboard,
  MapPin,
  ClipboardList,
  Users,
  CheckCircle2,
  History,
  BarChart3,
  Store,
  Boxes,
  PackageSearch,
  Info,
  Activity,
  AlertTriangle,
  FileText,
  Bell
} from "lucide-react";
import { NavLink } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import useStoreManagerMock, { parsePackSize } from "../../store/storeManagerMock";

const linksMap = {
  "super-admin": [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/labs", label: "Labs", icon: MapPin },
    { to: "/approval", label: "Admin Requests", icon: Users },
    { to: "/activity", label: "Activity", icon: History },
    { to: "/about", label: "About Us", icon: Info },
  ],
  "lab-admin": [
    { to: "/inventory", label: "Inventory", icon: ClipboardList },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/transactions", label: "Transactions", icon: CheckCircle2 },
    { to: "/lab/store-requests", label: "Store Requests", icon: Store },
    { to: "/lab/notifications", label: "Notifications", icon: Bell },
    { to: "/about", label: "About Us", icon: Info },
  ],
  "store_admin": [
    { to: "/store/dashboard", label: "Dashboard", icon: Store },
    { to: "/store/inventory", label: "Inventory", icon: Boxes },
    { to: "/store/tracking", label: "Tracking", icon: Activity },
    { to: "/store/lowstock", label: "Low Stock", icon: AlertTriangle },
    { to: "/store/overview", label: "Overview", icon: BarChart3 },
    { to: "/store/requests", label: "Requests", icon: ClipboardList },
    { to: "/store/history", label: "History", icon: History },
    { to: "/store/reports", label: "Reports", icon: FileText },
    { to: "/about", label: "About Us", icon: Info },
  ],
  student: [
    { to: "/", label: "Browse Labs", icon: MapPin },
    { to: "/store", label: "Store", icon: Boxes },
    { to: "/my-borrowings", label: "My Borrowings", icon: PackageSearch },
    { to: "/about", label: "About Us", icon: Info },
  ],
};

export default function Sidebar({ collapsed }) {
  const user = useAuthStore((state) => state.user);
  const role = user?.role || "student";
  
  const chemicals = useStoreManagerMock((state) => state.chemicals);
  const requests = useStoreManagerMock((state) => state.requests);
  const alertThreshold = useStoreManagerMock((state) => state.alertThreshold);

  let lowStockCount = 0;
  if (role === 'store-admin' || role === 'store_admin') {
    chemicals.forEach(chem => {
      const received = Number(chem['Received Quantity'] || 0);
      const available = Number(chem['Available Quantity'] || 0);
      const packData = parsePackSize(chem['Pack Size']);
      const totalBase = received * packData.value;
      const availableBase = available * packData.value;
      
      if (totalBase > 0) {
        const percentage = (availableBase / totalBase) * 100;
        if (percentage < alertThreshold) {
          lowStockCount++;
        }
      }
    });
  }

  let storeRequestsCount = 0;
  if (role === 'lab-admin') {
    const labName = user?.labName || 'harsh lab';
    storeRequestsCount = requests.filter(r => r.lab === labName && r.status === 'Pending').length;
  }

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 overflow-y-auto border-r border-[#d9e1ca] bg-[#fdfdf7] pt-6 pb-6 transition-all duration-300 dark:border-[#3c452f] dark:bg-[#1c2117] ${collapsed ? "-translate-x-full md:translate-x-0 md:w-20 md:px-3" : "translate-x-0 w-72 px-4"}`}
    >
      <div className={`mb-8 flex px-1 ${collapsed ? "md:justify-center" : "items-center gap-3"}`}>
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[10px] border border-[#d9e1ca] bg-[#f4f5eb] dark:border-[#3c452f] dark:bg-[#28301f]">
          <img
            src="/RasayanFlow_logo.png"
            alt="RasayanFlow Logo"
            className="h-full w-full object-cover"
          />
        </div>
        {!collapsed ? (
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[15px] font-semibold leading-tight tracking-tight text-[#2e3d19] dark:text-[#eef4e8] truncate">
              RasayanFlow
            </p>
            <span className="inline-flex w-fit items-center rounded-full bg-[#e8efd9] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.4px] text-[#4a6022] dark:bg-[#2a3320] dark:text-[#a8be8a]">
              {role.replace(/-/g, " ")}
            </span>
          </div>
        ) : null}
      </div>

      <nav className="space-y-1">
        {linksMap[role]?.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${collapsed ? "md:justify-center" : "gap-2"} ${isActive ? "bg-[#556b2f] text-[#f0f4e8]" : "text-[#4e5d35] hover:bg-[#f4f6ee] dark:text-[#d5ddbf] dark:hover:bg-[#28301f]"}`
              }
            >
              <div className="flex items-center gap-2">
                <Icon size={16} className="shrink-0" />
                {!collapsed ? item.label : null}
              </div>
              {!collapsed && item.to === "/store/lowstock" && lowStockCount > 0 ? (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{lowStockCount}</span>
              ) : null}
              {!collapsed && item.to === "/lab/store-requests" && storeRequestsCount > 0 ? (
                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{storeRequestsCount}</span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
