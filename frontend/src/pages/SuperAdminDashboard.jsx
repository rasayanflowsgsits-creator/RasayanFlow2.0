import { useEffect, useMemo, useState } from 'react';
import { 
  Plus, CheckCircle2, Users, Warehouse, Search, ShieldCheck, 
  FlaskConical, ShoppingBag, History, KeyRound, UserPlus, 
  Building2, LayoutDashboard, Clock, UserCheck, AlertCircle, RefreshCw
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
    setHighlight
  } = useAppStore();
  const { changePassword } = useAuthStore();

  // Tab state derived from URL route
  const activeTab = useMemo(() => {
    if (location.pathname === '/labs') return 'labs';
    if (location.pathname === '/approval') return 'users';
    if (location.pathname === '/store-oversight') return 'store';
    if (location.pathname === '/activity') return 'activity';
    if (location.pathname === '/settings') return 'settings';
    return 'overview';
  }, [location.pathname]);

  // Modal & form states
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [storeAdminModalOpen, setStoreAdminModalOpen] = useState(false);
  const [superAdminModalOpen, setSuperAdminModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [creating, setCreating] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [savingSuperAdmin, setSavingSuperAdmin] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingLab, setDeletingLab] = useState(false);
  const [approvingUserId, setApprovingUserId] = useState('');

  const [selectedLab, setSelectedLab] = useState(null);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [newLab, setNewLab] = useState({ name: '', code: '', courseType: 'B.Pharm', department: '', year: '', semester: '' });
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [newStoreAdmin, setNewStoreAdmin] = useState({ name: '', email: '', password: '' });
  const [newSuperAdmin, setNewSuperAdmin] = useState({ name: '', email: '', password: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Filters & Search
  const [labSearch, setLabSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  const debouncedLabSearch = useDebounce(labSearch, 300);
  const debouncedUserSearch = useDebounce(userSearch, 300);

  useEffect(() => {
    fetchLabs();
    fetchUsers();
    fetchActivityLogs({ limit: 100 });
  }, [fetchActivityLogs, fetchLabs, fetchUsers]);

  // Memoized user counts & categories
  const pendingApprovals = useMemo(
    () => users.filter((u) => u.role !== 'super-admin' && !u.isApproved),
    [users]
  );

  const labAdmins = useMemo(
    () => users.filter((u) => u.role === 'lab-admin'),
    [users]
  );

  const storeAdmins = useMemo(
    () => users.filter((u) => u.role === 'store-admin' || u.role === 'store_admin'),
    [users]
  );

  const superAdmins = useMemo(
    () => users.filter((u) => u.role === 'super-admin'),
    [users]
  );

  const students = useMemo(
    () => users.filter((u) => u.role === 'student'),
    [users]
  );

  const recentActivity = useMemo(() => activityLogs.slice(0, 8), [activityLogs]);

  // Filtered labs
  const filteredLabs = useMemo(() => {
    const query = debouncedLabSearch.trim().toLowerCase();
    if (!query) return labs.map((l) => ({ ...l, id: l._id || l.id, admin: l.admin || 'Unassigned' }));
    return labs
      .filter((l) => [l.name, l.labName, l.location, l.labCode, l.department, l.courseType].filter(Boolean).some((val) => val.toLowerCase().includes(query)))
      .map((l) => ({ ...l, id: l._id || l.id, admin: l.admin || 'Unassigned' }));
  }, [labs, debouncedLabSearch]);

  // Filtered users for User Directory
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
      setPasswordModalOpen(false);
    } catch (error) {
      setToast({ type: 'error', message: error?.response?.data?.message || 'Failed to update password.' });
    } finally {
      setChangingPassword(false);
    }
  };

  // Render Table Headers
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
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
          row.isApproved ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
        }`}>
          {row.isApproved ? <><CheckCircle2 size={12} /> Approved</> : <><Clock size={12} /> Pending</>}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        !row.isApproved ? (
          <Button
            variant='outline'
            onClick={() => handleApproveUser(row.id)}
            className='text-xs px-3 py-1 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400'
            disabled={approvingUserId === row.id}
          >
            {approvingUserId === row.id ? 'Approving...' : 'Approve User'}
          </Button>
        ) : (
          <span className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Active</span>
        )
      )
    }
  ];

  return (
    <div className='space-y-6 pb-12 animate-in fade-in'>
      
      {/* Top Header & Section Selector Tabs */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#d9e1ca] pb-4 dark:border-[#3c452f]'>
        <div>
          <h1 className='text-2xl font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
            <ShieldCheck className='h-7 w-7 text-[#5c6e46] dark:text-[#a5b48b]' /> Super Admin Command Center
          </h1>
          <p className='text-sm text-[#71805a] dark:text-[#a5b48b] mt-1'>
            Manage labs, onboarding requests, administrators, central store oversight, and platform security.
          </p>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          <Button variant='primary' onClick={() => setCreateOpen(true)} className='text-xs px-3 py-2'>
            <Plus size={14} className='mr-1.5' /> New Lab
          </Button>
          <Button variant='outline' onClick={() => setStoreAdminModalOpen(true)} className='text-xs px-3 py-2'>
            <UserPlus size={14} className='mr-1.5' /> Add Store Admin
          </Button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className='space-y-6 animate-in fade-in'>
          {/* Key Analytics Cards */}
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
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Lab Admins</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{labAdmins.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'>
                  <UserCheck size={24} />
                </div>
              </div>
            </Card>

            <Card className='border-l-4 border-l-indigo-500 bg-white dark:bg-[#20251a]'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-semibold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]'>Store Managers</p>
                  <p className='text-3xl font-extrabold text-[#37412a] dark:text-[#e4e9d8] mt-1'>{storeAdmins.length}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'>
                  <ShoppingBag size={24} />
                </div>
              </div>
            </Card>
          </div>

          <div className='grid gap-6 lg:grid-cols-3'>
            {/* Quick Actions Panel */}
            <Card title='Quick Actions' subtitle='Administrative shortcuts' className='lg:col-span-1'>
              <div className='space-y-3 pt-2'>
                <Button className='w-full justify-start gap-3 py-3' onClick={() => setCreateOpen(true)}>
                  <Plus size={18} /> Create New Department Lab
                </Button>
                <Button variant='outline' className='w-full justify-start gap-3 py-3' onClick={() => navigate('/approval')}>
                  <UserCheck size={18} /> Review Pending User Approvals ({pendingApprovals.length})
                </Button>
                <Button variant='outline' className='w-full justify-start gap-3 py-3' onClick={() => setStoreAdminModalOpen(true)}>
                  <UserPlus size={18} /> Add Central Store Admin
                </Button>
                <Button variant='outline' className='w-full justify-start gap-3 py-3' onClick={() => setSuperAdminModalOpen(true)}>
                  <ShieldCheck size={18} /> Create Super Admin Account
                </Button>
              </div>
            </Card>

            {/* Platform Distribution & Snapshot */}
            <Card title='Platform Snapshot' subtitle='System-wide status distribution' className='lg:col-span-2'>
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
                    <p className='text-xs font-semibold text-[#71805a] dark:text-[#a5b48b]'>Super Administrators</p>
                    <p className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8]'>{superAdmins.length}</p>
                  </div>
                  <span className='rounded-full bg-purple-50 p-2.5 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'>
                    <ShieldCheck size={20} />
                  </span>
                </div>

                <div className='flex items-center justify-between rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#1a1d16]'>
                  <div>
                    <p className='text-xs font-semibold text-[#71805a] dark:text-[#a5b48b]'>Account Approvals Waiting</p>
                    <p className='text-xl font-bold text-amber-700 dark:text-amber-400'>{pendingApprovals.length}</p>
                  </div>
                  <span className='rounded-full bg-amber-50 p-2.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'>
                    <Clock size={20} />
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Platform Audit Trail */}
          <Card title='Recent Activity Stream' subtitle='Latest platform actions across labs and accounts'>
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

      {/* TAB 2: LABS HUB */}
      {activeTab === 'labs' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]'>Department Labs Hub</h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Manage active practical labs, courses, and assigned lab administrators</p>
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

      {/* TAB 3: USERS & APPROVALS */}
      {activeTab === 'users' && (
        <div className='space-y-6 animate-in fade-in'>
          {/* Pending Approvals Section */}
          {pendingApprovals.length > 0 && (
            <Card title={`Pending User Approvals (${pendingApprovals.length})`} subtitle='Review and approve user registration requests' className='border-2 border-amber-300 dark:border-amber-900/60'>
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

          {/* User Directory Filter & Search */}
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]'>All Registered Users Directory</h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Overview of all students, lab admins, store managers, and super admins</p>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
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

      {/* TAB 4: STORE & STOCK OVERSIGHT */}
      {activeTab === 'store' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex items-center justify-between'>
            <div>
              <h3 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]'>Central Store Administration</h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b]'>Manage central store managers and monitor central inventory allocation</p>
            </div>

            <Button onClick={() => setStoreAdminModalOpen(true)} className='text-xs px-3 py-2'>
              <UserPlus size={14} className='mr-1.5' /> Add Store Manager
            </Button>
          </div>

          <Card title='Store Managers' subtitle='Users with permission to manage central store chemicals and allotments'>
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
                      Active Manager
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
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

      {/* TAB 6: SECURITY & SETTINGS */}
      {activeTab === 'settings' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='grid gap-6 lg:grid-cols-2'>
            {/* Create Super Admin Account */}
            <Card title='Create Super Admin Account' subtitle='Grant another administrator full platform control'>
              <div className='space-y-4 pt-2'>
                <Input label='Full Name' value={newSuperAdmin.name} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='e.g. Dr. Admin' />
                <Input label='Email Address' type='email' value={newSuperAdmin.email} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='superadmin@rasayanflow.edu' />
                <Input label='Password' type='password' value={newSuperAdmin.password} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
                <Button onClick={handleCreateSuperAdmin} disabled={savingSuperAdmin} className='w-full'>
                  {savingSuperAdmin ? 'Creating Account...' : 'Create Super Admin'}
                </Button>
              </div>
            </Card>

            {/* Reset Super Admin Password */}
            <Card title='Reset Password' subtitle='Update password for your current Super Admin session'>
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

      {/* MODALS */}

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

            <Input label='Department (Optional)' placeholder='e.g. Pharmaceutics, Pharmacology' value={newLab.department} onChange={(e) => setNewLab({ ...newLab, department: e.target.value })} />

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
                    <Button
                      variant='outline'
                      onClick={() => handleRemoveAdmin(admin._id || admin.id)}
                      className='text-xs px-3 py-1'
                      disabled={savingAdmin}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              ) : (
                <p className='rounded-xl border border-dashed border-[#cfd8bd] p-4 text-center text-xs text-[#71805a] dark:border-[#4e5d35] dark:text-[#a5b48b]'>
                  No admin assigned to this lab yet.
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
            <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8]'>Create New Lab Admin</p>
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
            <p className='text-sm font-bold text-red-700 dark:text-red-300'>Danger Zone: Delete Lab</p>
            <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-1'>
              Permanently removes this lab and its associated history.
            </p>
            <Button
              variant='outline'
              onClick={handleDeleteLab}
              className='mt-3 w-full border-red-300 text-red-700 hover:bg-red-100 dark:border-red-900 dark:text-red-300'
              disabled={deletingLab}
            >
              {deletingLab ? 'Deleting...' : 'Delete Lab'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Store Admin Modal */}
      <Modal open={storeAdminModalOpen} onClose={() => setStoreAdminModalOpen(false)} title='Add Central Store Manager'>
        <div className='space-y-4'>
          <Input label='Full Name *' value={newStoreAdmin.name} onChange={(e) => setNewStoreAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='e.g. Ramesh Kumar' />
          <Input label='Email Address *' type='email' value={newStoreAdmin.email} onChange={(e) => setNewStoreAdmin((s) => ({ ...s, email: e.target.value }))} placeholder='store.manager@rasayanflow.edu' />
          <Input label='Temporary Password *' type='password' value={newStoreAdmin.password} onChange={(e) => setNewStoreAdmin((s) => ({ ...s, password: e.target.value }))} minLength={6} placeholder='••••••••' />
          <Button onClick={handleCreateStoreAdmin} disabled={savingAdmin} className='w-full mt-2'>
            {savingAdmin ? 'Creating Account...' : 'Create Store Manager'}
          </Button>
        </div>
      </Modal>

      {/* Create Super Admin Modal */}
      <Modal open={superAdminModalOpen} onClose={() => setSuperAdminModalOpen(false)} title='Add Super Administrator'>
        <div className='space-y-4'>
          <Input label='Full Name *' value={newSuperAdmin.name} onChange={(e) => setNewSuperAdmin((s) => ({ ...s, name: e.target.value }))} placeholder='e.g. Dr. Super Admin' />
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
