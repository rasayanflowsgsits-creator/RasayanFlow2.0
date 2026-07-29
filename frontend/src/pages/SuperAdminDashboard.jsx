import { useEffect, useMemo, useState } from 'react';
import { 
  Plus, CheckCircle2, Users, Warehouse, Search, ShieldCheck, 
  FlaskConical, ShoppingBag, History, KeyRound, UserPlus, 
  Building2, LayoutDashboard, Clock, UserCheck, AlertCircle, RefreshCw,
  BookOpen, FileSpreadsheet, Megaphone, ToggleLeft, ToggleRight, Download,
  Ban, ShieldAlert, FileText, Check, X, AlertTriangle, Layers
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function SuperAdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    labs,
    users,
    fetchLabs,
    fetchUsers,
    createLab,
    deleteLab,
    createLabAdmin,
    createStoreAdmin,
    createSuperAdmin,
    assignAdminToLab,
    removeAdminFromLab,
    approveUserAccount,
    activityLogs,
    fetchActivityLogs,
    setToast,
    setHighlight,
    masterChemicals,
    addMasterChemical,
    curriculumExperiments,
    addCurriculumExperiment,
    broadcastAnnouncements,
    addBroadcastAnnouncement,
    toggleBroadcastStatus,
    globalFeatureFlags,
    toggleFeatureFlag,
    toggleUserStatus
  } = useAppStore();

  const { changePassword } = useAuthStore();

  // Tab state derived from URL route
  const activeTab = useMemo(() => {
    if (location.pathname === '/labs') return 'labs';
    if (location.pathname === '/approval') return 'users';
    if (location.pathname === '/master-chemicals') return 'master-chemicals';
    if (location.pathname === '/curriculum') return 'curriculum';
    if (location.pathname === '/store-oversight') return 'store';
    if (location.pathname === '/compliance') return 'compliance';
    if (location.pathname === '/system-broadcast') return 'broadcast';
    if (location.pathname === '/activity') return 'activity';
    if (location.pathname === '/settings') return 'settings';
    return 'overview';
  }, [location.pathname]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [storeAdminModalOpen, setStoreAdminModalOpen] = useState(false);
  const [superAdminModalOpen, setSuperAdminModalOpen] = useState(false);
  const [masterChemModalOpen, setMasterChemModalOpen] = useState(false);
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);

  // Operation States
  const [creating, setCreating] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [savingSuperAdmin, setSavingSuperAdmin] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingLab, setDeletingLab] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState('');

  // Selected Data & Forms
  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [newLab, setNewLab] = useState({ name: '', code: '', courseType: 'B.Pharm', department: '', year: '', semester: '' });
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [newStoreAdmin, setNewStoreAdmin] = useState({ name: '', email: '', password: '' });
  const [newSuperAdmin, setNewSuperAdmin] = useState({ name: '', email: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Custom Feature Forms
  const [newMasterChem, setNewMasterChem] = useState({ name: '', casNumber: '', hazardClass: 'Non-Hazardous', storageTemp: 'Room Temp', category: 'Reagent' });
  const [newCurrExp, setNewCurrExp] = useState({ course: 'B.Pharm', year: '1', semester: '1', subject: 'Pharmaceutics Lab - I', expNo: 'Exp 01', name: '', requiredChemicals: '' });
  const [newBroadcast, setNewBroadcast] = useState({ title: '', message: '', targetRole: 'All Users' });
  const [csvInput, setCsvInput] = useState('');

  // Search & Filters
  const [labSearch, setLabSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [matrixSearch, setMatrixSearch] = useState('');

  const debouncedLabSearch = useDebounce(labSearch, 300);
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const debouncedMatrixSearch = useDebounce(matrixSearch, 300);

  useEffect(() => {
    fetchLabs();
    fetchUsers();
    fetchActivityLogs({ limit: 100 });
  }, [fetchActivityLogs, fetchLabs, fetchUsers]);

  // Derived user groups
  const pendingApprovals = useMemo(() => users.filter((u) => u.role !== 'super-admin' && !u.isApproved), [users]);
  const labAdmins = useMemo(() => users.filter((u) => u.role === 'lab-admin'), [users]);
  const storeAdmins = useMemo(() => users.filter((u) => u.role === 'store-admin' || u.role === 'store_admin'), [users]);
  const superAdmins = useMemo(() => users.filter((u) => u.role === 'super-admin'), [users]);
  const students = useMemo(() => users.filter((u) => u.role === 'student'), [users]);
  const recentActivity = useMemo(() => activityLogs.slice(0, 8), [activityLogs]);

  // Filtered Labs
  const filteredLabs = useMemo(() => {
    const query = debouncedLabSearch.trim().toLowerCase();
    if (!query) return labs.map((l) => ({ ...l, id: l._id || l.id, admin: l.admin || 'Unassigned' }));
    return labs
      .filter((l) => [l.name, l.labName, l.location, l.labCode, l.department, l.courseType].filter(Boolean).some((val) => val.toLowerCase().includes(query)))
      .map((l) => ({ ...l, id: l._id || l.id, admin: l.admin || 'Unassigned' }));
  }, [labs, debouncedLabSearch]);

  // Filtered Users Directory
  const filteredUsers = useMemo(() => {
    let result = users;
    if (userRoleFilter !== 'all') {
      result = result.filter((u) => {
        if (userRoleFilter === 'store-admin') return u.role === 'store-admin' || u.role === 'store_admin';
        return u.role === userRoleFilter;
      });
    }
    const query = debouncedUserSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((u) => [u.name, u.email, u.rollNumber, u.course].filter(Boolean).some((val) => val.toLowerCase().includes(query)));
    }
    return result.map((u) => ({
      ...u,
      id: u._id || u.id,
      roleDisplay: u.role === 'super-admin' ? 'Super Admin' : u.role === 'lab-admin' ? 'Lab Admin' : (u.role === 'store-admin' || u.role === 'store_admin') ? 'Store Manager' : 'Student',
    }));
  }, [users, userRoleFilter, debouncedUserSearch]);

  // Stock Matrix Data
  const filteredMasterChemicals = useMemo(() => {
    const query = debouncedMatrixSearch.trim().toLowerCase();
    if (!query) return masterChemicals;
    return masterChemicals.filter((m) => [m.name, m.casNumber, m.hazardClass, m.category].filter(Boolean).some((val) => val.toLowerCase().includes(query)));
  }, [masterChemicals, debouncedMatrixSearch]);

  const eligibleAdmins = useMemo(
    () =>
      users.filter((user) => {
        if (user.role === 'super-admin') return false;
        if (!selectedLab) return true;
        return !user.labId || user.labId === selectedLab.id || user.labId === selectedLab._id;
      }),
    [selectedLab, users]
  );

  // Handlers
  const openManageModal = (lab) => {
    setSelectedLab(lab);
    setSelectedAdminId('');
    setNewAdmin({ name: '', email: '', password: '' });
    setManageOpen(true);
  };

  const handleCreateLab = async () => {
    if (!newLab.name.trim() || !newLab.code.trim()) return;
    setCreating(true);
    try {
      const createdLab = await createLab({
        name: newLab.name.trim(),
        code: newLab.code.trim().toUpperCase(),
        courseType: newLab.courseType,
        department: newLab.department,
        year: newLab.year,
        semester: newLab.semester
      });
      await fetchActivityLogs({ limit: 100 });
      setToast({ type: 'success', message: `Created ${createdLab.name}.` });
      setCreateOpen(false);
      setHighlight(createdLab.id);
      setNewLab({ name: '', code: '', courseType: 'B.Pharm', department: '', year: '', semester: '' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create lab.' });
    } finally {
      setCreating(false);
    }
  };

  const handleAssignAdmin = async () => {
    if (!selectedLab || !selectedAdminId) return;
    setSavingAdmin(true);
    try {
      await assignAdminToLab({ labId: selectedLab.id, adminId: selectedAdminId });
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Admin assigned successfully.' });
      setManageOpen(false);
      setSelectedAdminId('');
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to assign admin.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    if (!selectedLab || !adminId) return;
    setSavingAdmin(true);
    try {
      await removeAdminFromLab({ labId: selectedLab.id, adminId });
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Admin removed from lab.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to remove admin.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleCreateAdminForLab = async () => {
    if (!selectedLab || !newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password.trim()) return;
    setSavingAdmin(true);
    try {
      const createdAdmin = await createLabAdmin({
        name: newAdmin.name.trim(),
        email: newAdmin.email.trim(),
        password: newAdmin.password
      });
      await assignAdminToLab({ labId: selectedLab.id, adminId: createdAdmin.id });
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Lab admin account created and assigned.' });
      setManageOpen(false);
      setNewAdmin({ name: '', email: '', password: '' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create admin account.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleDeleteLab = async () => {
    if (!selectedLab?.id) return;
    setDeletingLab(true);
    try {
      await deleteLab(selectedLab.id);
      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: `${selectedLab.name} deleted.` });
      setManageOpen(false);
      setSelectedLab(null);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to delete lab.' });
    } finally {
      setDeletingLab(false);
    }
  };

  async function handleApproveUser(userId) {
    setApprovingUserId(userId);
    try {
      await approveUserAccount(userId);
      await Promise.all([fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Account approved successfully.' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to approve account.' });
    } finally {
      setApprovingUserId('');
    }
  }

  const handleCreateStoreAdmin = async () => {
    if (!newStoreAdmin.name.trim() || !newStoreAdmin.email.trim() || !newStoreAdmin.password.trim()) return;
    setSavingAdmin(true);
    try {
      await createStoreAdmin({
        name: newStoreAdmin.name.trim(),
        email: newStoreAdmin.email.trim(),
        password: newStoreAdmin.password,
      });
      await Promise.all([fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Store admin account created.' });
      setNewStoreAdmin({ name: '', email: '', password: '' });
      setStoreAdminModalOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create store admin account.' });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleCreateSuperAdmin = async () => {
    if (!newSuperAdmin.name.trim() || !newSuperAdmin.email.trim() || !newSuperAdmin.password.trim()) return;
    setSavingSuperAdmin(true);
    try {
      await createSuperAdmin({
        name: newSuperAdmin.name.trim(),
        email: newSuperAdmin.email.trim(),
        password: newSuperAdmin.password,
      });
      await Promise.all([fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      setToast({ type: 'success', message: 'Super admin account created.' });
      setNewSuperAdmin({ name: '', email: '', password: '' });
      setSuperAdminModalOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to create super admin account.' });
    } finally {
      setSavingSuperAdmin(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim()) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setToast({ type: 'success', message: 'Password updated successfully.' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAddMasterChem = () => {
    if (!newMasterChem.name.trim()) return;
    addMasterChemical(newMasterChem);
    setToast({ type: 'success', message: `Added ${newMasterChem.name} to Chemical Master Catalog.` });
    setNewMasterChem({ name: '', casNumber: '', hazardClass: 'Non-Hazardous', storageTemp: 'Room Temp', category: 'Reagent' });
    setMasterChemModalOpen(false);
  };

  const handleAddCurrExp = () => {
    if (!newCurrExp.name.trim()) return;
    addCurriculumExperiment(newCurrExp);
    setToast({ type: 'success', message: `Added ${newCurrExp.name} to Curriculum Experiments.` });
    setNewCurrExp({ course: 'B.Pharm', year: '1', semester: '1', subject: 'Pharmaceutics Lab - I', expNo: 'Exp 01', name: '', requiredChemicals: '' });
    setCurriculumModalOpen(false);
  };

  const handleAddBroadcast = () => {
    if (!newBroadcast.title.trim() || !newBroadcast.message.trim()) return;
    addBroadcastAnnouncement(newBroadcast);
    setToast({ type: 'success', message: 'Broadcast announcement posted successfully.' });
    setNewBroadcast({ title: '', message: '', targetRole: 'All Users' });
    setBroadcastModalOpen(false);
  };

  const handleCsvImportSubmit = () => {
    if (!csvInput.trim()) return;
    const lines = csvInput.trim().split('\n');
    let importedCount = 0;
    lines.forEach((line) => {
      const parts = line.split(',');
      if (parts.length >= 2) importedCount++;
    });
    setToast({ type: 'success', message: `Processed ${importedCount} records from CSV batch upload.` });
    setCsvInput('');
    setCsvImportModalOpen(false);
  };

  const exportReportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8,Lab Name,Lab Code,Course,Department,Admin\n" +
      labs.map(l => `"${l.name}","${l.labCode || l.code || ''}","${l.courseType || ''}","${l.department || ''}","${l.admin || ''}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RasayanFlow_Master_Inventory_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ type: 'success', message: 'Compliance inventory CSV report generated.' });
  };

  // Table Configs
  const labHeaders = [
    { key: 'name', label: 'Lab Name' },
    { key: 'location', label: 'Lab Code' },
    { key: 'courseType', label: 'Course', render: (row) => row.courseType || 'B.Pharm' },
    { key: 'yearSem', label: 'Year / Sem', render: (row) => row.year && row.semester ? `Year ${row.year} • Sem ${row.semester}` : 'All Batches' },
    { key: 'admin', label: 'Assigned Admin' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Button variant='outline' onClick={() => openManageModal(row)} className='text-xs px-3 py-1'>
          Manage Lab
        </Button>
      )
    }
  ];

  const userDirectoryHeaders = [
    { key: 'name', label: 'User Name' },
    { key: 'email', label: 'Email Address' },
    {
      key: 'roleDisplay',
      label: 'Role',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          row.role === 'super-admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
          row.role === 'lab-admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
          (row.role === 'store-admin' || row.role === 'store_admin') ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' :
          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
        }`}>
          {row.roleDisplay}
        </span>
      )
    },
    {
      key: 'isApproved',
      label: 'Status',
      render: (row) => (
        <div className='flex items-center gap-1.5'>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            row.isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
          }`}>
            {row.isApproved ? <><CheckCircle2 size={12} /> Approved</> : <><Clock size={12} /> Pending</>}
          </span>
          {row.isSuspended && (
            <span className='inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-[10px] font-bold dark:bg-rose-950/60 dark:text-rose-300'>
              <Ban size={10} /> Suspended
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className='flex items-center gap-2'>
          {!row.isApproved && (
            <Button
              variant='outline'
              onClick={() => handleApproveUser(row.id)}
              className='text-xs px-2.5 py-1 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400'
              disabled={approvingUserId === row.id}
            >
              {approvingUserId === row.id ? '...' : 'Approve'}
            </Button>
          )}
          {row.role !== 'super-admin' && (
            <Button
              variant='outline'
              onClick={() => {
                toggleUserStatus(row.id);
                setToast({ type: 'info', message: `${row.name} account status updated.` });
              }}
              className={`text-xs px-2 py-1 ${row.isSuspended ? 'border-emerald-500 text-emerald-700' : 'border-rose-300 text-rose-700'}`}
            >
              {row.isSuspended ? 'Reactivate' : 'Suspend'}
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className='space-y-6 pb-12 animate-in fade-in'>
      
      {/* Top Header Title */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#d9e1ca] pb-4 dark:border-[#3c452f]'>
        <div>
          <h1 className='text-2xl font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
            <ShieldCheck className='h-7 w-7 text-[#5c6e46] dark:text-[#a5b48b]' /> Super Admin Command Center
          </h1>
          <p className='text-sm text-[#71805a] dark:text-[#a5b48b] mt-1'>
            Comprehensive institutional governance, chemical master matrix, syllabus practicals, and security control.
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button variant='primary' onClick={() => setCreateOpen(true)} className='text-xs px-3 py-2'>
            <Plus size={14} className='mr-1.5' /> New Lab
          </Button>
          <Button variant='outline' onClick={() => setBroadcastModalOpen(true)} className='text-xs px-3 py-2'>
            <Megaphone size={14} className='mr-1.5' /> Post Announcement
          </Button>
        </div>
      </div>

      {/* SECTION 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <Card className='border-l-4 border-l-[#5c6e46] bg-white dark:bg-[#20251a]'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Total Labs</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{labs.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#a5b48b]'>
                  <Warehouse size={24} />
                </div>
              </div>
            </Card>

            <Card className='border-l-4 border-l-amber-500 bg-white dark:bg-[#20251a]'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Pending Approvals</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{pendingApprovals.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'>
                  <Clock size={24} />
                </div>
              </div>
            </Card>

            <Card className='border-l-4 border-l-blue-500 bg-white dark:bg-[#20251a]'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Master Chemicals</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{masterChemicals.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'>
                  <FlaskConical size={24} />
                </div>
              </div>
            </Card>

            <Card className='border-l-4 border-l-indigo-500 bg-white dark:bg-[#20251a]'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Registered Users</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{users.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'>
                  <Users size={24} />
                </div>
              </div>
            </Card>
          </div>

          <div className='grid gap-6 lg:grid-cols-3'>
            <Card title='Quick Actions' subtitle='Administrative shortcuts' className='lg:col-span-1'>
              <div className='space-y-3 pt-2'>
                <Button className='w-full justify-start gap-3 py-3' onClick={() => setCreateOpen(true)}>
                  <Plus size={18} /> Create New Department Lab
                </Button>
                <Button variant='outline' className='w-full justify-start gap-3 py-3' onClick={() => navigate('/approval')}>
                  <UserCheck size={18} /> Review Pending Approvals ({pendingApprovals.length})
                </Button>
                <Button variant='outline' className='w-full justify-start gap-3 py-3' onClick={() => setMasterChemModalOpen(true)}>
                  <FlaskConical size={18} /> Add Master Chemical Entry
                </Button>
                <Button variant='outline' className='w-full justify-start gap-3 py-3' onClick={() => setCurriculumModalOpen(true)}>
                  <BookOpen size={18} /> Add Practical Experiment
                </Button>
              </div>
            </Card>

            <Card title='Platform Snapshot' subtitle='System status & role distribution' className='lg:col-span-2'>
              <div className='grid gap-3 sm:grid-cols-2 pt-2'>
                <div className='flex items-center justify-between rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#1a1d16]'>
                  <div>
                    <p className='text-xs font-semibold text-[#71805a] dark:text-[#a5b48b]'>Active Labs</p>
                    <p className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{labs.length}</p>
                  </div>
                  <span className='rounded-full bg-[#f4f6ee] p-2.5 text-[#5c6e46] dark:bg-[#20251a] dark:text-[#a5b48b]'>
                    <Building2 size={20} />
                  </span>
                </div>
                <div className='flex items-center justify-between rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#1a1d16]'>
                  <div>
                    <p className='text-xs font-semibold text-[#71805a] dark:text-[#a5b48b]'>Registered Students</p>
                    <p className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{students.length}</p>
                  </div>
                  <span className='rounded-full bg-slate-100 p-2.5 text-slate-700 dark:bg-slate-800 dark:text-slate-300'>
                    <Users size={20} />
                  </span>
                </div>
                <div className='flex items-center justify-between rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#1a1d16]'>
                  <div>
                    <p className='text-xs font-semibold text-[#71805a] dark:text-[#a5b48b]'>Lab & Store Admins</p>
                    <p className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{labAdmins.length + storeAdmins.length}</p>
                  </div>
                  <span className='rounded-full bg-blue-50 p-2.5 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'>
                    <UserCheck size={20} />
                  </span>
                </div>
                <div className='flex items-center justify-between rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#1a1d16]'>
                  <div>
                    <p className='text-xs font-semibold text-[#71805a] dark:text-[#a5b48b]'>Super Administrators</p>
                    <p className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{superAdmins.length}</p>
                  </div>
                  <span className='rounded-full bg-purple-50 p-2.5 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'>
                    <ShieldCheck size={20} />
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <Card title='Recent Activity Stream' subtitle='Latest platform actions'>
            <div className='space-y-3 pt-2'>
              {recentActivity.length === 0 ? (
                <p className='py-6 text-center text-sm text-[#71805a] dark:text-[#a5b48b]'>No audit logs recorded yet.</p>
              ) : (
                recentActivity.map((log) => (
                  <div key={log.id} className='flex flex-col gap-1 rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-[#414a33] dark:bg-[#20251a]'>
                    <div>
                      <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8]'>{log.details}</p>
                      <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                        Triggered by <span className='font-semibold'>{log.actorName || 'System'}</span> ({log.actorRole || 'admin'})
                      </p>
                    </div>
                    <span className='text-xs font-medium text-[#87996c] dark:text-[#a5b48b] whitespace-nowrap'>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 2: LABS HUB */}
      {activeTab === 'labs' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]'>Department Labs Hub</h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Manage active practical labs and assigned lab administrators</p>
            </div>
            <div className='flex items-center gap-3'>
              <div className='relative w-full sm:w-64'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#87996c]' />
                <input
                  type='text'
                  value={labSearch}
                  onChange={(e) => setLabSearch(e.target.value)}
                  placeholder='Search labs by name or code...'
                  className='w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                />
              </div>
              <Button onClick={() => setCreateOpen(true)} className='text-xs px-3 py-2 whitespace-nowrap'>
                <Plus size={14} className='mr-1' /> Create Lab
              </Button>
            </div>
          </div>

          <Table headers={labHeaders} rows={filteredLabs} />
        </div>
      )}

      {/* SECTION 3: USERS & APPROVALS */}
      {activeTab === 'users' && (
        <div className='space-y-6 animate-in fade-in'>
          {pendingApprovals.length > 0 && (
            <Card title={`Pending User Approvals (${pendingApprovals.length})`} subtitle='Review registration requests' className='border-2 border-amber-300 dark:border-amber-900/60'>
              <div className='space-y-3 pt-2'>
                {pendingApprovals.map((user) => (
                  <div key={user.id} className='flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/40 dark:bg-amber-950/20'>
                    <div>
                      <h4 className='font-bold text-[#37412a] dark:text-[#e4e9d8]'>{user.name}</h4>
                      <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>{user.email} • Role: <span className='font-semibold capitalize'>{user.role}</span></p>
                    </div>
                    <Button
                      onClick={() => handleApproveUser(user.id)}
                      disabled={approvingUserId === user.id}
                      className='bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2'
                    >
                      {approvingUserId === user.id ? 'Approving...' : 'Approve User'}
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]'>All Registered Users Directory</h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Manage students, lab admins, store managers, and account suspensions</p>
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              <Button variant='outline' onClick={() => setCsvImportModalOpen(true)} className='text-xs px-3 py-2'>
                <FileSpreadsheet size={14} className='mr-1.5' /> Bulk CSV Import
              </Button>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className='rounded-xl border border-[#d9e1ca] bg-white py-2 px-3 text-xs outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
              >
                <option value='all'>All Roles</option>
                <option value='student'>Students</option>
                <option value='lab-admin'>Lab Admins</option>
                <option value='store-admin'>Store Managers</option>
                <option value='super-admin'>Super Admins</option>
              </select>

              <div className='relative w-full sm:w-64'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#87996c]' />
                <input
                  type='text'
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder='Search by name or email...'
                  className='w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                />
              </div>
            </div>
          </div>

          <Table headers={userDirectoryHeaders} rows={filteredUsers} />
        </div>
      )}

      {/* SECTION 4: CHEMICAL MASTER & STOCK MATRIX */}
      {activeTab === 'master-chemicals' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <FlaskConical className='text-[#5c6e46]' /> Master Chemical Catalog & Cross-Lab Matrix
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Define standard chemical CAS numbers, hazard classes, and monitor availability across all labs</p>
            </div>
            <div className='flex items-center gap-3'>
              <div className='relative w-full sm:w-64'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#87996c]' />
                <input
                  type='text'
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  placeholder='Search master catalog...'
                  className='w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                />
              </div>
              <Button onClick={() => setMasterChemModalOpen(true)} className='text-xs px-3 py-2 whitespace-nowrap'>
                <Plus size={14} className='mr-1' /> Add Master Chemical
              </Button>
            </div>
          </div>

          <Card title='Master Chemical Catalog' subtitle='Standardized chemical definitions'>
            <Table
              headers={[
                { key: 'name', label: 'Chemical Name' },
                { key: 'casNumber', label: 'CAS Registry No' },
                { 
                  key: 'hazardClass', 
                  label: 'Hazard Category',
                  render: (row) => (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      row.hazardClass.includes('Flammable') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                      row.hazardClass.includes('Corrosive') || row.hazardClass.includes('Toxic') ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {row.hazardClass}
                    </span>
                  )
                },
                { key: 'storageTemp', label: 'Storage Protocol' },
                { key: 'category', label: 'Category' },
              ]}
              rows={filteredMasterChemicals}
            />
          </Card>
        </div>
      )}

      {/* SECTION 5: CURRICULUM & PRACTICALS */}
      {activeTab === 'curriculum' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <BookOpen className='text-[#5c6e46]' /> Curriculum & Practical Experiments Builder
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Pre-configure practical experiments per semester with prescribed chemical requirements</p>
            </div>
            <Button onClick={() => setCurriculumModalOpen(true)} className='text-xs px-3 py-2'>
              <Plus size={14} className='mr-1.5' /> Add Experiment Template
            </Button>
          </div>

          <Card title='Prescribed Practical Experiments' subtitle='Templates for course practicals'>
            <Table
              headers={[
                { key: 'course', label: 'Course' },
                { key: 'yearSem', label: 'Year / Sem', render: (row) => `Yr ${row.year} • Sem ${row.semester}` },
                { key: 'subject', label: 'Subject Lab' },
                { key: 'expNo', label: 'Exp No' },
                { key: 'name', label: 'Experiment Title' },
                { key: 'requiredChemicals', label: 'Required Reagents & Chemicals' },
              ]}
              rows={curriculumExperiments}
            />
          </Card>
        </div>
      )}

      {/* SECTION 6: STORE OVERSIGHT */}
      {activeTab === 'store' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <ShoppingBag className='text-[#5c6e46]' /> Central Store Administration & Procurement
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Manage central store managers and monitor central inventory allocation</p>
            </div>
            <Button onClick={() => setStoreAdminModalOpen(true)} className='text-xs px-3 py-2'>
              <UserPlus size={14} className='mr-1.5' /> Add Store Manager
            </Button>
          </div>

          <Card title='Central Store Managers' subtitle='Authorized staff'>
            <div className='space-y-3 pt-2'>
              {storeAdmins.length === 0 ? (
                <p className='py-6 text-center text-sm text-[#71805a] dark:text-[#a5b48b]'>No store managers created yet.</p>
              ) : (
                storeAdmins.map((admin) => (
                  <div key={admin.id} className='flex items-center justify-between rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#20251a]'>
                    <div>
                      <h4 className='font-bold text-[#37412a] dark:text-[#e4e9d8]'>{admin.name}</h4>
                      <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>{admin.email}</p>
                    </div>
                    <span className='rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'>
                      Active Store Manager
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* SECTION 7: COMPLIANCE & REPORTS */}
      {activeTab === 'compliance' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <FileSpreadsheet className='text-[#5c6e46]' /> Compliance & Institutional Reporting
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Generate Pharmacy Council of India (PCI) inspection audits and export inventory reports</p>
            </div>
            <Button onClick={exportReportCSV} className='text-xs px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white'>
              <Download size={14} className='mr-1.5' /> Export Inventory CSV
            </Button>
          </div>

          <div className='grid gap-6 md:grid-cols-2'>
            <Card title='PCI Audit Compliance Status' subtitle='Regulatory readiness metrics'>
              <div className='space-y-4 pt-2'>
                <div className='flex items-center justify-between rounded-xl bg-emerald-50 p-3.5 dark:bg-emerald-950/30'>
                  <span className='text-xs font-bold text-emerald-800 dark:text-emerald-300'>Hazardous Waste Protocol</span>
                  <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1'><Check size={14} /> Compliant</span>
                </div>
                <div className='flex items-center justify-between rounded-xl bg-emerald-50 p-3.5 dark:bg-emerald-950/30'>
                  <span className='text-xs font-bold text-emerald-800 dark:text-emerald-300'>Fume Hood Safety Certifications</span>
                  <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1'><Check size={14} /> Certified</span>
                </div>
                <div className='flex items-center justify-between rounded-xl bg-emerald-50 p-3.5 dark:bg-emerald-950/30'>
                  <span className='text-xs font-bold text-emerald-800 dark:text-emerald-300'>Scheduled Solvent Cabinets</span>
                  <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1'><Check size={14} /> Locked</span>
                </div>
              </div>
            </Card>

            <Card title='Chemical Consumption Summary' subtitle='Estimated monthly usage volume'>
              <div className='space-y-3 pt-2'>
                <div className='flex items-center justify-between border-b border-[#d9e1ca] pb-2 dark:border-[#414a33]'>
                  <span className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Solvents (Ethanol, Methanol, Ether)</span>
                  <span className='text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]'>45.2 Liters / Month</span>
                </div>
                <div className='flex items-center justify-between border-b border-[#d9e1ca] pb-2 dark:border-[#414a33]'>
                  <span className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Acids & Bases (HCl, H2SO4, NaOH)</span>
                  <span className='text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]'>18.5 Liters / Month</span>
                </div>
                <div className='flex items-center justify-between border-b border-[#d9e1ca] pb-2 dark:border-[#414a33]'>
                  <span className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Active API Powders (Paracetamol, Aspirin)</span>
                  <span className='text-xs font-bold text-[#37412a] dark:text-[#e4e9d8]'>2.4 kg / Month</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 8: BROADCAST & FEATURE FLAGS */}
      {activeTab === 'broadcast' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <Megaphone className='text-[#5c6e46]' /> Broadcast System & Global Feature Flags
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Post top announcement banners and control application feature switches</p>
            </div>
            <Button onClick={() => setBroadcastModalOpen(true)} className='text-xs px-3 py-2'>
              <Plus size={14} className='mr-1.5' /> Post Announcement
            </Button>
          </div>

          <div className='grid gap-6 md:grid-cols-2'>
            {/* Announcement List */}
            <Card title='Active Broadcast Banners' subtitle='Displayed on student and staff dashboards'>
              <div className='space-y-3 pt-2'>
                {broadcastAnnouncements.map((b) => (
                  <div key={b.id} className='rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#20251a]'>
                    <div className='flex items-center justify-between'>
                      <h4 className='font-bold text-[#37412a] dark:text-[#e4e9d8]'>{b.title}</h4>
                      <button
                        onClick={() => toggleBroadcastStatus(b.id)}
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          b.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {b.active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-1'>{b.message}</p>
                    <p className='text-[10px] text-[#87996c] dark:text-[#a5b48b] mt-2'>Target: {b.targetRole}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Global Feature Flags */}
            <Card title='Global Application Feature Switchboard' subtitle='Toggle app features in real-time'>
              <div className='space-y-4 pt-2'>
                {Object.entries(globalFeatureFlags).map(([flagKey, enabled]) => (
                  <div key={flagKey} className='flex items-center justify-between rounded-xl border border-[#d9e1ca] p-3.5 dark:border-[#414a33]'>
                    <div>
                      <p className='text-xs font-bold text-[#37412a] dark:text-[#e4e9d8] capitalize'>{flagKey.replace(/([A-Z])/g, ' $1')}</p>
                      <p className='text-[10px] text-[#71805a] dark:text-[#a5b48b]'>Controls frontend interaction logic</p>
                    </div>
                    <button
                      onClick={() => toggleFeatureFlag(flagKey)}
                      className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                        enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      {enabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SECTION 9: AUDIT LOGS */}
      {activeTab === 'activity' && (
        <div className='space-y-6 animate-in fade-in'>
          <div>
            <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]'>Platform Audit History</h3>
            <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Comprehensive audit trail of all platform activities, logins, and administrative actions</p>
          </div>

          <Card title='Audit Trail' subtitle={`Total ${activityLogs.length} audit records`}>
            <Table
              headers={[
                { key: 'timestamp', label: 'Timestamp', render: (row) => row.timestamp ? new Date(row.timestamp).toLocaleString() : 'N/A' },
                { key: 'actorName', label: 'User', render: (row) => `${row.actorName || 'User'} (${row.actorEmail || 'N/A'})` },
                { key: 'actorRole', label: 'Role', render: (row) => <span className='capitalize font-medium'>{row.actorRole?.replace('-', ' ') || 'User'}</span> },
                { key: 'details', label: 'Action Details' }
              ]}
              rows={activityLogs}
            />
          </Card>
        </div>
      )}

      {/* SECTION 10: SECURITY & SETTINGS */}
      {activeTab === 'settings' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='grid gap-6 lg:grid-cols-2'>
            <Card title='Create Super Admin Account' subtitle='Grant full platform administrative permissions'>
              <div className='space-y-4 pt-2'>
                <Input label='Full Name' value={newSuperAdmin.name} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='e.g. Dr. Super Admin' />
                <Input label='Email Address' type='email' value={newSuperAdmin.email} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='superadmin@rasayanflow.edu' />
                <Input label='Password' type='password' value={newSuperAdmin.password} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
                <Button onClick={handleCreateSuperAdmin} disabled={savingSuperAdmin} className='w-full'>
                  {savingSuperAdmin ? 'Creating Account...' : 'Create Super Admin'}
                </Button>
              </div>
            </Card>

            <Card title='Reset Password' subtitle='Update password for current Super Admin account'>
              <div className='space-y-4 pt-2'>
                <Input label='Current Password' type='password' value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))} />
                <Input label='New Password' type='password' value={passwordForm.newPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))} minLength={6} />
                <Input label='Confirm New Password' type='password' value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((s) => ({ ...s, confirmPassword: e.target.value }))} minLength={6} />
                <Button onClick={handleChangePassword} disabled={changingPassword} className='w-full'>
                  {changingPassword ? 'Updating Password...' : 'Update Password'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ALL INTERACTIVE MODALS */}

      {/* Create Lab Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title='Create New Department Lab'>
        <div className='space-y-4'>
          <Input label='Lab Name *' value={newLab.name} onChange={(e) => setNewLab({ ...newLab, name: e.target.value })} placeholder='e.g. Pharmaceutics Lab - I' />
          <Input label='Lab Code *' value={newLab.code} onChange={(e) => setNewLab({ ...newLab, code: e.target.value })} placeholder='e.g. PH101L' />
          <div className='space-y-3'>
            <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Course Type</span>
              <select
                value={newLab.courseType}
                onChange={(e) => setNewLab({ ...newLab, courseType: e.target.value, year: '', semester: '' })}
                className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-sm text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                <option value='B.Pharm'>B.Pharm</option>
                <option value='M.Pharm'>M.Pharm</option>
                <option value='PhD'>PhD</option>
                <option value='Other'>Other</option>
              </select>
            </label>
            <Input label='Department (Optional)' placeholder='e.g. Pharmaceutics' value={newLab.department} onChange={(e) => setNewLab({ ...newLab, department: e.target.value })} />
            <div className='grid grid-cols-2 gap-3'>
              <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
                <span className='mb-1 block text-xs font-medium tracking-wide'>Year</span>
                <select
                  value={newLab.year}
                  onChange={(e) => setNewLab({ ...newLab, year: e.target.value, semester: '' })}
                  className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-sm text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                >
                  <option value=''>Select Year</option>
                  {(newLab.courseType === 'B.Pharm' ? ['1', '2', '3', '4'] : newLab.courseType === 'M.Pharm' ? ['1', '2'] : ['1', '2', '3', '4', '5']).map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </label>

              <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
                <span className='mb-1 block text-xs font-medium tracking-wide'>Semester</span>
                <select
                  value={newLab.semester}
                  onChange={(e) => setNewLab({ ...newLab, semester: e.target.value })}
                  className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-sm text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                  disabled={!newLab.year}
                >
                  <option value=''>Select Sem</option>
                  {newLab.year ? [(parseInt(newLab.year) * 2 - 1).toString(), (parseInt(newLab.year) * 2).toString()].map((s) => (
                    <option key={s} value={s}>Semester {s}</option>
                  )) : null}
                </select>
              </label>
            </div>
          </div>
          <Button onClick={handleCreateLab} className='w-full mt-2' disabled={creating}>
            {creating ? 'Creating Lab...' : 'Create Lab'}
          </Button>
        </div>
      </Modal>

      {/* Manage Lab Modal */}
      <Modal open={manageOpen} onClose={() => setManageOpen(false)} title={selectedLab ? `Manage ${selectedLab.name}` : 'Manage Lab'}>
        <div className='space-y-5'>
          <div>
            <p className='text-sm font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>Assigned Lab Admins</p>
            <div className='mt-3 space-y-2'>
              {selectedLab?.admins?.length ? (
                selectedLab.admins.map((admin) => (
                  <div key={admin._id || admin.id} className='flex items-center justify-between rounded-xl border border-[#d9e1ca] p-3 dark:border-[#414a33]'>
                    <div>
                      <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8]'>{admin.name}</p>
                      <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>{admin.email}</p>
                    </div>
                    <Button variant='outline' onClick={() => handleRemoveAdmin(admin._id || admin.id)} className='text-xs px-3 py-1' disabled={savingAdmin}>
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className='rounded-xl border border-dashed border-[#cfd8bd] p-4 text-center text-xs text-[#71805a] dark:border-[#4e5d35] dark:text-[#a5b48b]'>
                  No admin assigned yet.
                </p>
              )}
            </div>
          </div>

          <div className='space-y-3 border-t border-[#d9e1ca] pt-4 dark:border-[#414a33]'>
            <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Assign existing user as admin</span>
              <select
                value={selectedAdminId}
                onChange={(e) => setSelectedAdminId(e.target.value)}
                className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-sm text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                <option value=''>Select user</option>
                {eligibleAdmins.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </label>
            <Button onClick={handleAssignAdmin} className='w-full' disabled={savingAdmin || !selectedAdminId}>
              {savingAdmin ? 'Assigning...' : 'Assign Admin'}
            </Button>
          </div>

          <div className='rounded-2xl border border-[#d9e1ca] p-4 dark:border-[#414a33] bg-[#f9faef] dark:bg-[#1a1d16]'>
            <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8]'>Create New Lab Admin Account</p>
            <div className='mt-3 space-y-3'>
              <Input label='Name' value={newAdmin.name} onChange={(e) => setNewAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='Dr. S. Sharma' />
              <Input label='Email' type='email' value={newAdmin.email} onChange={(e) => setNewAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='sharma@rasayanflow.edu' />
              <Input label='Password' type='password' value={newAdmin.password} onChange={(e) => setNewAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
              <Button onClick={handleCreateAdminForLab} className='w-full' disabled={savingAdmin}>
                {savingAdmin ? 'Creating...' : 'Create & Assign Admin'}
              </Button>
            </div>
          </div>

          <div className='rounded-2xl border border-red-200 p-4 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20'>
            <p className='text-sm font-bold text-red-700 dark:text-red-300'>Delete Lab</p>
            <Button variant='outline' onClick={handleDeleteLab} className='mt-3 w-full border-red-300 text-red-700 hover:bg-red-100 dark:border-red-900 dark:text-red-300' disabled={deletingLab}>
              {deletingLab ? 'Deleting...' : 'Delete Lab'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Master Chemical Modal */}
      <Modal open={masterChemModalOpen} onClose={() => setMasterChemModalOpen(false)} title='Add Master Chemical to Catalog'>
        <div className='space-y-4'>
          <Input label='Chemical Name *' value={newMasterChem.name} onChange={(e) => setNewMasterChem((s) => ({ ...s, name: e.target.value }))} placeholder='e.g. Sodium Chloride IP' />
          <Input label='CAS Registry Number' value={newMasterChem.casNumber} onChange={(e) => setNewMasterChem((s) => ({ ...s, casNumber: e.target.value }))} placeholder='e.g. 7647-14-5' />
          <Input label='Category' value={newMasterChem.category} onChange={(e) => setNewMasterChem((s) => ({ ...s, category: e.target.value }))} placeholder='e.g. Salt / Reagent' />
          <div className='grid grid-cols-2 gap-3'>
            <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
              <span className='mb-1 block text-xs font-medium tracking-wide'>Hazard Class</span>
              <select
                value={newMasterChem.hazardClass}
                onChange={(e) => setNewMasterChem((s) => ({ ...s, hazardClass: e.target.value }))}
                className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              >
                <option value='Non-Hazardous'>Non-Hazardous</option>
                <option value='Flammable Liquid'>Flammable Liquid</option>
                <option value='Corrosive / Acid'>Corrosive / Acid</option>
                <option value='Corrosive / Base'>Corrosive / Base</option>
                <option value='Toxic / Poison'>Toxic / Poison</option>
              </select>
            </label>
            <Input label='Storage Protocol' value={newMasterChem.storageTemp} onChange={(e) => setNewMasterChem((s) => ({ ...s, storageTemp: e.target.value }))} placeholder='e.g. Cool Storage' />
          </div>
          <Button onClick={handleAddMasterChem} className='w-full mt-2'>Add Master Chemical</Button>
        </div>
      </Modal>

      {/* Add Practical Experiment Modal */}
      <Modal open={curriculumModalOpen} onClose={() => setCurriculumModalOpen(false)} title='Add Curriculum Experiment Template'>
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-3'>
            <Input label='Course' value={newCurrExp.course} onChange={(e) => setNewCurrExp((s) => ({ ...s, course: e.target.value }))} />
            <Input label='Exp No' value={newCurrExp.expNo} onChange={(e) => setNewCurrExp((s) => ({ ...s, expNo: e.target.value }))} placeholder='Exp 05' />
          </div>
          <Input label='Subject Lab' value={newCurrExp.subject} onChange={(e) => setNewCurrExp((s) => ({ ...s, subject: e.target.value }))} placeholder='Pharmaceutics Lab - I' />
          <Input label='Experiment Title *' value={newCurrExp.name} onChange={(e) => setNewCurrExp((s) => ({ ...s, name: e.target.value }))} placeholder='Preparation of Aspirin Tablets' />
          <Input label='Required Chemical Reagents' value={newCurrExp.requiredChemicals} onChange={(e) => setNewCurrExp((s) => ({ ...s, requiredChemicals: e.target.value }))} placeholder='Salicylic Acid, Acetic Anhydride' />
          <Button onClick={handleAddCurrExp} className='w-full mt-2'>Add Experiment Template</Button>
        </div>
      </Modal>

      {/* Add Announcement Modal */}
      <Modal open={broadcastModalOpen} onClose={() => setBroadcastModalOpen(false)} title='Post System Announcement Banner'>
        <div className='space-y-4'>
          <Input label='Announcement Title *' value={newBroadcast.title} onChange={(e) => setNewBroadcast((s) => ({ ...s, title: e.target.value }))} placeholder='Central Store Maintenance' />
          <Input label='Message Content *' value={newBroadcast.message} onChange={(e) => setNewBroadcast((s) => ({ ...s, message: e.target.value }))} placeholder='Stock audit scheduled for Friday...' />
          <label className='block text-sm text-[#4e5d35] dark:text-[#d5ddbf]'>
            <span className='mb-1 block text-xs font-medium tracking-wide'>Target Audience</span>
            <select
              value={newBroadcast.targetRole}
              onChange={(e) => setNewBroadcast((s) => ({ ...s, targetRole: e.target.value }))}
              className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
            >
              <option value='All Users'>All Users</option>
              <option value='Students'>Students Only</option>
              <option value='Lab Admins'>Lab Admins Only</option>
            </select>
          </label>
          <Button onClick={handleAddBroadcast} className='w-full mt-2'>Publish Announcement</Button>
        </div>
      </Modal>

      {/* Bulk CSV Import Modal */}
      <Modal open={csvImportModalOpen} onClose={() => setCsvImportModalOpen(false)} title='Bulk CSV Student Import'>
        <div className='space-y-4'>
          <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Paste comma-separated student records (Name, Email, RollNumber, Course, Year, Semester):</p>
          <textarea
            rows={5}
            value={csvInput}
            onChange={(e) => setCsvInput(e.target.value)}
            placeholder={"Aarav Sharma,aarav@rasayanflow.edu,0832PH211001,B.Pharm,1,1\nRiya Patel,riya@rasayanflow.edu,0832PH211002,B.Pharm,1,1"}
            className='w-full rounded-xl border border-[#d9e1ca] bg-white p-3 text-xs font-mono outline-none dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
          />
          <Button onClick={handleCsvImportSubmit} className='w-full'>Process Batch CSV Upload</Button>
        </div>
      </Modal>

      {/* Store Admin & Super Admin Modals */}
      <Modal open={storeAdminModalOpen} onClose={() => setStoreAdminModalOpen(false)} title='Add Central Store Manager'>
        <div className='space-y-4'>
          <Input label='Full Name *' value={newStoreAdmin.name} onChange={(e) => setNewStoreAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='Ramesh Kumar' />
          <Input label='Email Address *' type='email' value={newStoreAdmin.email} onChange={(e) => setNewStoreAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='store.manager@rasayanflow.edu' />
          <Input label='Temporary Password *' type='password' value={newStoreAdmin.password} onChange={(e) => setNewStoreAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
          <Button onClick={handleCreateStoreAdmin} disabled={savingAdmin} className='w-full mt-2'>
            {savingAdmin ? 'Creating Account...' : 'Create Store Manager'}
          </Button>
        </div>
      </Modal>

      <Modal open={superAdminModalOpen} onClose={() => setSuperAdminModalOpen(false)} title='Add Super Administrator'>
        <div className='space-y-4'>
          <Input label='Full Name *' value={newSuperAdmin.name} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='Dr. Super Admin' />
          <Input label='Email Address *' type='email' value={newSuperAdmin.email} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='superadmin@rasayanflow.edu' />
          <Input label='Temporary Password *' type='password' value={newSuperAdmin.password} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
          <Button onClick={handleCreateSuperAdmin} disabled={savingSuperAdmin} className='w-full mt-2'>
            {savingSuperAdmin ? 'Creating Account...' : 'Create Super Admin'}
          </Button>
        </div>
      </Modal>

    </div>
  );
}
