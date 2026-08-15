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
  KeyRound,
  FileText,
  Bell,
  FlaskConical,
  BookOpen,
  FileSpreadsheet,
  Megaphone,
  UsersRound,
  Radio,
  Moon,
  Sun,
  LogOut
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import useAuthStore from "../../store/authStore";
import useAppStore from "../../store/appStore";
import useStoreManagerMock from "../../store/storeManagerMock";
import { parsePackSize, safeRound, totalStock } from "../../utils/storeHelpers";

const linksMap = {
  "super-admin": [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/labs", label: "Labs Hub", icon: MapPin },
    { to: "/approval", label: "Users & Approvals", icon: Users },
    { to: "/user-credentials", label: "Credentials Vault", icon: KeyRound },
    { to: "/master-chemicals", label: "Chemical Master", icon: FlaskConical },
    { to: "/curriculum", label: "Curriculum & Practicals", icon: BookOpen },
    { to: "/store-oversight", label: "Store Oversight", icon: Store },
    { to: "/activity", label: "Audit Logs", icon: History },
    { to: "/settings", label: "Security & Settings", icon: KeyRound },
    { to: "/about", label: "About Us", icon: Info },
  ],
  "lab-admin": [
    { to: "/inventory", label: "Inventory", icon: ClipboardList },
    { to: "/lab/experiments", label: "Experiments", icon: FileText },
    { to: "/lab/student-requests", label: "Student Requests", icon: Users },
    { to: "/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/transactions", label: "Transactions", icon: CheckCircle2 },
    { to: "/lab/groups", label: "Student Groups", icon: UsersRound },
    { to: "/lab/live", label: "Live Monitor", icon: Radio },
    { to: "/lab/store-requests", label: "Store Requests", icon: Store },
    { to: "/lab/history", label: "History", icon: History },
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
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/my-borrowings", label: "My Activity", icon: PackageSearch },
    { to: "/about", label: "About Us", icon: Info },
  ],
};

export default function Sidebar({ collapsed, isDark, toggleTheme }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const role = user?.role || "student";
  const navRole = (role === "store-admin" || role === "store_admin" || role === "storeAdmin") 
    ? "store_admin" 
    : (role === "lab-admin" || role === "labAdmin" || role === "lab_admin") 
    ? "lab-admin" 
    : (role === "super-admin" || role === "superAdmin") 
    ? "super-admin" 
    : role;
  
  const [storeInventory, setStoreInventory] = useState([]);
  const alertThreshold = 15;

  useEffect(() => {
    if (role === 'store-admin' || role === 'store_admin' || role === 'storeAdmin') {
      import('../../services/api').then(({ default: api }) => {
        import('../../utils/storeMapper').then(({ toFrontendChemical }) => {
          api.get('/store/inventory')
            .then(res => setStoreInventory((res.data || []).map(toFrontendChemical)))
            .catch(() => {});
        });
      });
    }
  }, [role]);

  let lowStockCount = 0;
  if (role === 'store-admin' || role === 'store_admin' || role === 'storeAdmin') {
    storeInventory.forEach(chem => {
      const receivedStock = totalStock(chem['Received Quantity'], chem['Pack Size']);
      const availableStock = totalStock(chem['Available Quantity'], chem['Pack Size']);
      const totalBase = receivedStock.total;
      const availableBase = availableStock.total;
      
      if (totalBase > 0) {
        const percentage = safeRound((availableBase / totalBase) * 100);
        if (percentage < alertThreshold) {
          lowStockCount++;
        }
      }
    });
  }

  let storeRequestsCount = 0;
  if (role === 'lab-admin' || role === 'labAdmin' || role === 'lab_admin') {
    const studentRequests = useAppStore.getState()?.studentRequests || [];
    storeRequestsCount = (studentRequests || []).filter(r => r?.overallStatus === 'Pending').length;
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-20 flex flex-col justify-between overflow-y-auto border-r border-[#d9e1ca] bg-[#fdfdf7] pt-5 pb-5 transition-all duration-300 dark:border-[#3c452f] dark:bg-[#1c2117] ${
          collapsed ? "-translate-x-full md:translate-x-0 md:w-20 md:px-2" : "translate-x-0 w-64 px-3"
        }`}
      >
        <div>
          {/* BRANDING HEADER */}
          <div className={`mb-5 flex ${collapsed ? "md:justify-center" : "items-center gap-3 px-1 pb-4 border-b border-[#e8efd9] dark:border-[#2e3d19]"}`}>
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#cfd8bd] bg-[#f4f5eb] shadow-sm dark:border-[#414a33] dark:bg-[#28301f]">
              <img
                src="/RasayanFlow_logo.png"
                alt="RasayanFlow Logo"
                className="h-full w-full object-cover"
              />
            </div>
            {!collapsed ? (
              <div className="flex flex-col min-w-0">
                <p className="text-base font-extrabold leading-tight tracking-tight text-[#2e3d19] dark:text-[#eef4e8] truncate">
                  RasayanFlow
                </p>
                <span className="mt-0.5 inline-flex w-fit items-center rounded-md bg-[#eef4e4] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#556b2f] dark:bg-[#28301f] dark:text-[#a8be8a]">
                  {role.replace(/-/g, " ")}
                </span>
              </div>
            ) : null}
          </div>

          {/* NAVIGATION LINKS */}
          <nav className="space-y-1.5 w-full">
            {linksMap[navRole]?.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                      collapsed ? "md:justify-center md:px-2" : "gap-2.5"
                    } ${
                      isActive
                        ? "bg-[#556b2f] text-white shadow-sm font-bold dark:bg-[#556b2f] dark:text-white"
                        : "text-[#36461f] font-semibold hover:bg-[#ebf1e1] hover:text-[#18240a] dark:text-[#c5d0b5] dark:hover:bg-[#27311f] dark:hover:text-[#f4f7ee]"
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </div>
                  {!collapsed && item.to === "/store/lowstock" && lowStockCount > 0 ? (
                    <span className="bg-rose-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm">{lowStockCount}</span>
                  ) : null}
                  {!collapsed && item.to === "/lab/store-requests" && storeRequestsCount > 0 ? (
                    <span className="bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm">{storeRequestsCount}</span>
                  ) : null}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* BOTTOM SIDEBAR FOOTER: DARK MODE SWITCH & LOGOUT */}
        <div className="mt-6 pt-3 border-t border-[#e8efd9] dark:border-[#2e3d19] space-y-2">
          {!collapsed ? (
            /* EXPANDED SIDEBAR FOOTER CARD */
            <div className="rounded-2xl border border-[#d9e1ca] bg-[#f8faee] p-2.5 shadow-2xs dark:border-[#3c452f] dark:bg-[#20251a] space-y-2">
              {/* Smooth Pill Switch for Dark Mode */}
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center justify-between rounded-xl bg-white dark:bg-[#1a1d16] px-3 py-2 text-xs font-bold text-[#5c6e46] dark:text-[#a8be8a] border border-[#e4eed3] dark:border-[#38432a] hover:border-[#5c6e46] transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  {isDark ? (
                    <Sun size={15} className="text-amber-400 shrink-0" />
                  ) : (
                    <Moon size={15} className="text-[#5c6e46] dark:text-[#a8be8a] shrink-0" />
                  )}
                  <span>{isDark ? 'Dark Theme' : 'Light Theme'}</span>
                </div>

                {/* Animated Pill Switch Slider */}
                <div className={`relative h-5 w-9 rounded-full p-0.5 transition-colors duration-300 ${
                  isDark ? 'bg-[#5c6e46]' : 'bg-[#d9e1ca]'
                }`}>
                  <div className={`h-4 w-4 rounded-full bg-white shadow-xs transition-transform duration-300 ${
                    isDark ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </div>
              </button>

              {/* Premium Executive Logout Button */}
              <button
                type="button"
                onClick={() => setConfirmLogoutOpen(true)}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs font-extrabold text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/50 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all duration-200 shadow-2xs"
              >
                <LogOut size={15} className="shrink-0 transition-transform group-hover:-translate-x-0.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            /* COLLAPSED SIDEBAR ICON BUTTONS */
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white dark:bg-[#20251a] text-[#5c6e46] dark:text-[#a8be8a] border border-[#d9e1ca] dark:border-[#414a33] hover:bg-[#edf1e4] dark:hover:bg-[#2a3121] transition-all shadow-2xs"
              >
                {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
              </button>

              <button
                type="button"
                onClick={() => setConfirmLogoutOpen(true)}
                title="Sign Out"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-600 hover:text-white transition-all shadow-2xs"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ENHANCED LOGOUT CONFIRMATION MODAL */}
      {confirmLogoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border border-[#d9e1ca] bg-[#fffef8] p-6 shadow-2xl dark:border-[#414a33] dark:bg-[#20251a] space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 border border-rose-500/20 shrink-0">
                <LogOut size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-[#37412a] dark:text-[#e4e9d8]">Sign Out of RasayanFlow</h3>
                <p className="text-xs font-medium text-[#71805a] dark:text-[#a5b48b] mt-0.5">Are you sure you want to end your active session?</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmLogoutOpen(false)}
                className="rounded-xl border border-[#d9e1ca] bg-white px-4 py-2 text-xs font-bold text-[#5c6e46] hover:bg-[#f4f6ee] dark:border-[#414a33] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:hover:bg-[#20251a] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmLogoutOpen(false);
                  logout();
                }}
                className="rounded-xl bg-rose-600 px-4.5 py-2 text-xs font-extrabold text-white hover:bg-rose-700 shadow-md transition-colors"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
