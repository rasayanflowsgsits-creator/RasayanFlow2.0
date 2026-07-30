import { useEffect, useMemo, useState } from 'react';
import { 
  Plus, CheckCircle2, Users, Warehouse, Search, ShieldCheck, 
  FlaskConical, ShoppingBag, History, KeyRound, UserPlus, 
  Building2, LayoutDashboard, Clock, UserCheck, AlertCircle, RefreshCw,
  BookOpen, FileSpreadsheet, Megaphone, ToggleLeft, ToggleRight, Download,
  Ban, ShieldAlert, FileText, Check, X, AlertTriangle, Layers, Edit3, Trash2, Folder, FolderOpen
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
    updateCurriculumExperiment,
    deleteCurriculumExperiment,
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
  const [newLab, setNewLab] = useState({ name: '', code: '', courseType: 'B.Pharm', department: '', year: '1', semester: '1' });
  const [adminMode, setAdminMode] = useState('create_new'); // 'create_new', 'existing', 'unassigned'
  const [newLabAdmin, setNewLabAdmin] = useState({ name: '', email: '', password: '' });
  const [selectedExistingAdminId, setSelectedExistingAdminId] = useState('');
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
  const [labCourseFilter, setLabCourseFilter] = useState('all');
  const [labViewMode, setLabViewMode] = useState('grid');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [matrixSearch, setMatrixSearch] = useState('');

  // Curriculum State & Navigation
  const [currCourseFilter, setCurrCourseFilter] = useState('B.Pharm');
  const [currSemFilter, setCurrSemFilter] = useState('1');
  const [currSubjectFilter, setCurrSubjectFilter] = useState('all');
  const [currSearch, setCurrSearch] = useState('');
  const [editCurrModalOpen, setEditCurrModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);

  const debouncedLabSearch = useDebounce(labSearch, 300);
  const debouncedUserSearch = useDebounce(userSearch, 300);
  const debouncedMatrixSearch = useDebounce(matrixSearch, 300);
  const debouncedCurrSearch = useDebounce(currSearch, 300);

  // Available subjects for the active course and semester
  const availableSubjects = useMemo(() => {
    const list = curriculumExperiments
      .filter((e) => (e.course || 'B.Pharm') === currCourseFilter && (currSemFilter === 'all' || String(e.semester) === String(currSemFilter)))
      .map((e) => e.subject || 'General Practical Lab');
    return Array.from(new Set(list));
  }, [curriculumExperiments, currCourseFilter, currSemFilter]);

  // Filtered Curriculum Experiments for Active Course, Semester, Subject & Search
  const filteredCurriculumExperiments = useMemo(() => {
    let result = curriculumExperiments.filter((e) => (e.course || 'B.Pharm') === currCourseFilter);
    if (currSemFilter !== 'all') {
      result = result.filter((e) => String(e.semester) === String(currSemFilter));
    }
    if (currSubjectFilter !== 'all') {
      result = result.filter((e) => (e.subject || 'General Practical Lab') === currSubjectFilter);
    }
    const query = debouncedCurrSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((e) =>
        [e.name, e.subject, e.expNo, e.requiredChemicals].filter(Boolean).some((v) => v.toLowerCase().includes(query))
      );
    }
    return result;
  }, [curriculumExperiments, currCourseFilter, currSemFilter, currSubjectFilter, debouncedCurrSearch]);

  // Grouped Curriculum Experiments by Subject Lab
  const groupedCurriculumBySubject = useMemo(() => {
    const map = {};
    filteredCurriculumExperiments.forEach((exp) => {
      const subj = exp.subject || 'General Practical Lab';
      if (!map[subj]) map[subj] = [];
      map[subj].push(exp);
    });
    return map;
  }, [filteredCurriculumExperiments]);

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
    let result = labs;
    if (labCourseFilter === 'unassigned') {
      result = result.filter((l) => !l.admin || l.admin === 'Unassigned');
    } else if (labCourseFilter !== 'all') {
      result = result.filter((l) => (l.courseType || 'B.Pharm') === labCourseFilter);
    }

    const query = debouncedLabSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((l) => [l.name, l.labName, l.location, l.labCode, l.department, l.courseType].filter(Boolean).some((val) => val.toLowerCase().includes(query)));
    }

    return result.map((l) => ({ ...l, id: l._id || l.id, admin: l.admin || 'Unassigned' }));
  }, [labs, labCourseFilter, debouncedLabSearch]);

  // Filtered Users Directory with resolved assigned lab
  const filteredUsers = useMemo(() => {
    let result = users;

    if (userRoleFilter === 'pending') {
      result = result.filter((u) => u.role !== 'super-admin' && !u.isApproved);
    } else if (userRoleFilter !== 'all') {
      result = result.filter((u) => {
        if (userRoleFilter === 'store-admin') return u.role === 'store-admin' || u.role === 'store_admin';
        return u.role === userRoleFilter;
      });
    }

    const query = debouncedUserSearch.trim().toLowerCase();
    if (query) {
      result = result.filter((u) => [u.name, u.email, u.rollNumber, u.course].filter(Boolean).some((val) => val.toLowerCase().includes(query)));
    }

    return result.map((u) => {
      // Resolve assigned lab
      const matchedLab = labs.find(l => String(l.id || l._id) === String(u.labId || u.labId?._id));
      const adminLab = matchedLab || labs.find(l => Array.isArray(l.admins) && l.admins.some(a => String(a._id || a.id || a) === String(u._id || u.id)));

      return {
        ...u,
        id: u._id || u.id,
        roleDisplay: u.role === 'super-admin' ? 'Super Admin' : u.role === 'lab-admin' ? 'Lab Admin' : (u.role === 'store-admin' || u.role === 'store_admin') ? 'Store Manager' : 'Student',
        assignedLabName: adminLab ? (adminLab.name || adminLab.labName) : 'Unassigned',
        assignedLabCode: adminLab ? (adminLab.labCode || adminLab.code) : '',
      };
    });
  }, [users, labs, userRoleFilter, debouncedUserSearch]);

  // Stock Matrix Data
  const filteredMasterChemicals = useMemo(() => {
    const query = debouncedMatrixSearch.trim().toLowerCase();
    if (!query) return masterChemicals;
    return masterChemicals.filter((m) => [m.name, m.casNumber, m.hazardClass, m.category].filter(Boolean).some((val) => val.toLowerCase().includes(query)));
  }, [masterChemicals, debouncedMatrixSearch]);

  const handleOpenEditExp = (exp) => {
    setEditingExp({ ...exp });
    setEditCurrModalOpen(true);
  };

  const handleSaveEditExp = () => {
    if (!editingExp || !editingExp.name.trim()) return;
    updateCurriculumExperiment(editingExp.id, editingExp);
    setToast({ type: 'success', message: `Updated "${editingExp.name}" template.` });
    setEditCurrModalOpen(false);
    setEditingExp(null);
  };

  const handleDeleteExp = (expId, expName) => {
    deleteCurriculumExperiment(expId);
    setToast({ type: 'info', message: `Deleted "${expName}" experiment template.` });
  };

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
    if (!newLab.name.trim() || !newLab.code.trim()) {
      setToast({ type: 'error', message: 'Please enter Lab Name and Lab Code.' });
      return;
    }

    if (adminMode === 'create_new') {
      if (!newLabAdmin.name.trim() || !newLabAdmin.email.trim() || !newLabAdmin.password.trim()) {
        setToast({ type: 'error', message: 'Please fill in Admin Name, Email, and Password.' });
        return;
      }
    }

    setCreating(true);
    try {
      let createdAdminId = null;

      // 1. Create new Lab Admin account if requested
      if (adminMode === 'create_new') {
        const createdAdmin = await createLabAdmin({
          name: newLabAdmin.name.trim(),
          email: newLabAdmin.email.trim(),
          password: newLabAdmin.password,
        });
        createdAdminId = createdAdmin?.id || createdAdmin?._id;
      } else if (adminMode === 'existing') {
        createdAdminId = selectedExistingAdminId;
      }

      // 2. Create the Lab entity
      const createdLab = await createLab({
        name: newLab.name.trim(),
        code: newLab.code.trim().toUpperCase(),
        courseType: newLab.courseType,
        department: newLab.department,
        year: newLab.year,
        semester: newLab.semester
      });
      const labId = createdLab?.id || createdLab?._id;

      // 3. Assign Admin to Lab if available
      if (createdAdminId && labId) {
        await assignAdminToLab({ labId, adminId: createdAdminId });
      }

      await Promise.all([fetchLabs(), fetchUsers(), fetchActivityLogs({ limit: 100 })]);
      
      setToast({
        type: 'success',
        message: adminMode === 'create_new'
          ? `Created "${createdLab.name}" and provisioned Lab Admin account (${newLabAdmin.email})!`
          : `Created "${createdLab.name}" successfully!`
      });

      setCreateOpen(false);
      setHighlight(labId);
      setNewLab({ name: '', code: '', courseType: 'B.Pharm', department: '', year: '1', semester: '1' });
      setNewLabAdmin({ name: '', email: '', password: '' });
      setSelectedExistingAdminId('');
      setAdminMode('create_new');
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
    {
      key: 'name',
      label: 'User Name & Profile',
      render: (row) => (
        <div>
          <p className='text-sm font-bold text-[#37412a] dark:text-[#e4e9d8]'>{row.name}</p>
          {row.rollNumber && <p className='text-[11px] font-mono text-[#71805a] dark:text-[#a5b48b]'>ID: {row.rollNumber}</p>}
        </div>
      )
    },
    {
      key: 'email',
      label: 'Email Address',
      render: (row) => <span className='text-sm font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>{row.email}</span>
    },
    {
      key: 'roleDisplay',
      label: 'System Role',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${
          row.role === 'super-admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' :
          row.role === 'lab-admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' :
          (row.role === 'store-admin' || row.role === 'store_admin') ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300' :
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
        }`}>
          {row.roleDisplay}
        </span>
      )
    },
    {
      key: 'assignedLab',
      label: 'Assigned Lab & Code',
      render: (row) => {
        if (row.role === 'super-admin' || row.role === 'store-admin' || row.role === 'store_admin') {
          return <span className='text-xs text-[#87996c] dark:text-[#a5b48b] italic'>Global Access</span>;
        }
        const hasLab = row.assignedLabName && row.assignedLabName !== 'Unassigned';
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
            hasLab ? 'bg-[#f4f6ee] text-[#3c4e23] border border-[#d9e1ca] dark:bg-[#20251a] dark:text-[#eef4e8] dark:border-[#414a33]' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
          }`}>
            <Warehouse size={13} /> {hasLab ? `${row.assignedLabName} ${row.assignedLabCode ? `(${row.assignedLabCode})` : ''}` : 'Unassigned Lab'}
          </span>
        );
      }
    },
    {
      key: 'isApproved',
      label: 'Account Status',
      render: (row) => (
        <div className='flex items-center gap-1.5'>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
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
              className='text-xs px-2.5 py-1 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 font-bold'
              disabled={approvingUserId === row.id}
            >
              {approvingUserId === row.id ? 'Approving...' : 'Approve'}
            </Button>
          )}
          {row.role !== 'super-admin' && (
            <Button
              variant='outline'
              onClick={() => {
                toggleUserStatus(row.id);
                setToast({ type: 'info', message: `${row.name} account status updated.` });
              }}
              className={`text-xs px-2.5 py-1 font-semibold ${row.isSuspended ? 'border-emerald-500 text-emerald-700 hover:bg-emerald-50' : 'border-rose-300 text-rose-700 hover:bg-rose-50'}`}
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
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h3 className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <Warehouse className='text-[#5c6e46]' /> Department Labs Hub
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                Total {filteredLabs.length} active department labs configured for pharmacy practicals
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              {/* Search input */}
              <div className='relative w-full sm:w-60'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#87996c]' />
                <input
                  type='text'
                  value={labSearch}
                  onChange={(e) => setLabSearch(e.target.value)}
                  placeholder='Search lab name, code, dept...'
                  className='w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-xs outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                />
              </div>

              {/* View Switcher */}
              <div className='flex items-center gap-1 rounded-xl bg-[#f4f6ee] p-1 dark:bg-[#20251a] border border-[#d9e1ca] dark:border-[#414a33]'>
                <button
                  onClick={() => setLabViewMode('grid')}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    labViewMode === 'grid' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                  }`}
                >
                  Cards Grid
                </button>
                <button
                  onClick={() => setLabViewMode('table')}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
                    labViewMode === 'table' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                  }`}
                >
                  Table List
                </button>
              </div>

              <Button onClick={() => setCreateOpen(true)} className='text-xs px-3.5 py-2 whitespace-nowrap shadow-sm'>
                <Plus size={15} className='mr-1.5' /> Create New Lab
              </Button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className='flex overflow-x-auto gap-2 pb-1'>
            {[
              { id: 'all', label: `All Labs (${labs.length})` },
              { id: 'B.Pharm', label: 'B.Pharm Labs' },
              { id: 'M.Pharm', label: 'M.Pharm Labs' },
              { id: 'PhD', label: 'PhD Research Labs' },
              { id: 'unassigned', label: `⚠️ Unassigned Admin (${labs.filter(l => !l.admin || l.admin === 'Unassigned').length})` },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setLabCourseFilter(filter.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                  labCourseFilter === filter.id
                    ? 'bg-[#37412a] text-white dark:bg-[#e4e9d8] dark:text-[#20251a]'
                    : 'bg-[#f4f6ee] text-[#5c6e46] hover:bg-[#e8efd9] dark:bg-[#20251a] dark:text-[#c5d0b5]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* GRID VIEW */}
          {labViewMode === 'grid' ? (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {filteredLabs.length === 0 ? (
                <div className='col-span-full py-16 text-center border-2 border-dashed border-[#d9e1ca] rounded-2xl dark:border-[#414a33]'>
                  <Warehouse className='mx-auto h-12 w-12 text-[#87996c] mb-2' />
                  <h4 className='font-bold text-[#37412a] dark:text-[#e4e9d8]'>No Labs Found</h4>
                  <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-1'>Try adjusting your search query or filter criteria.</p>
                </div>
              ) : (
                filteredLabs.map((lab) => {
                  const hasAdmin = lab.admin && lab.admin !== 'Unassigned';
                  return (
                    <div
                      key={lab.id}
                      className='group flex flex-col justify-between rounded-2xl border border-[#d9e1ca] bg-white p-5 hover:border-[#87996c] hover:shadow-md transition-all dark:border-[#414a33] dark:bg-[#20251a]'
                    >
                      <div>
                        {/* Top Badge Header */}
                        <div className='flex items-start justify-between gap-2 mb-3'>
                          <span className='inline-flex items-center gap-1.5 rounded-lg bg-[#f4f6ee] px-2.5 py-1 text-xs font-mono font-bold text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#c5d0b5]'>
                            <Warehouse size={14} /> {lab.labCode || lab.code || 'LAB'}
                          </span>
                          <span className='rounded-full bg-[#e8efd9] px-2.5 py-0.5 text-[11px] font-bold text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                            {lab.courseType || 'B.Pharm'}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className='text-base font-bold text-[#37412a] dark:text-[#e4e9d8] group-hover:text-[#5c6e46] transition-colors'>
                          {lab.name || lab.labName}
                        </h4>
                        
                        <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-1'>
                          {lab.department ? `${lab.department} Department` : 'Pharmacy Department'}
                        </p>

                        {/* Batch / Semester Info */}
                        <div className='mt-3 flex flex-wrap items-center gap-2'>
                          <span className='rounded-md bg-[#f4f5eb] px-2 py-0.5 text-[11px] font-medium text-[#5c6e46] dark:bg-[#28301f] dark:text-[#c5d0b5]'>
                            {lab.year && lab.semester ? `Year ${lab.year} • Semester ${lab.semester}` : 'All Semester Batches'}
                          </span>
                        </div>
                      </div>

                      {/* Admin Footer Bar */}
                      <div className='mt-5 border-t border-[#f0f4e8] pt-3 dark:border-[#2a3121] flex items-center justify-between'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <div className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
                            hasAdmin ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                          }`}>
                            {hasAdmin ? lab.admin.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div className='min-w-0'>
                            <p className={`text-xs font-semibold truncate ${hasAdmin ? 'text-[#37412a] dark:text-[#e4e9d8]' : 'text-amber-700 dark:text-amber-400 font-bold'}`}>
                              {hasAdmin ? lab.admin : 'Unassigned Admin'}
                            </p>
                          </div>
                        </div>

                        <Button variant='outline' onClick={() => openManageModal(lab)} className='text-xs px-3 py-1 shrink-0'>
                          Manage
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* TABLE VIEW */
            <Table headers={labHeaders} rows={filteredLabs} />
          )}
        </div>
      )}

      {/* SECTION 3: USERS & APPROVALS */}
      {activeTab === 'users' && (
        <div className='space-y-6 animate-in fade-in'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#d9e1ca] pb-3 dark:border-[#414a33]'>
            <div>
              <h3 className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <Users className='text-[#5c6e46]' /> Institutional User & Account Control
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                Total {users.length} registered accounts across all institutional departments and roles
              </p>
            </div>

            <div className='flex items-center gap-3'>
              <Button variant='outline' onClick={() => setCsvImportModalOpen(true)} className='text-xs px-3.5 py-2 font-bold'>
                <FileSpreadsheet size={15} className='mr-1.5' /> Bulk CSV Student Upload
              </Button>
            </div>
          </div>

          {/* Role Metric Tab Cards Bar */}
          <div className='grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6'>
            {[
              { id: 'all', label: 'All Accounts', count: users.length, icon: Users },
              { id: 'student', label: 'Students', count: students.length, icon: Users },
              { id: 'lab-admin', label: 'Lab Admins', count: labAdmins.length, icon: UserCheck },
              { id: 'store-admin', label: 'Store Managers', count: storeAdmins.length, icon: ShoppingBag },
              { id: 'super-admin', label: 'Super Admins', count: superAdmins.length, icon: ShieldCheck },
              { id: 'pending', label: 'Pending Queue', count: pendingApprovals.length, icon: Clock, hasPending: pendingApprovals.length > 0 },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = userRoleFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type='button'
                  onClick={() => setUserRoleFilter(tab.id)}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 text-left transition-all duration-200 shadow-2xs hover:shadow-sm ${
                    isActive
                      ? 'bg-[#5c6e46] text-white border-2 border-[#4e5d35] shadow-sm dark:bg-[#e4e9d8] dark:text-[#20251a] dark:border-[#e4e9d8]'
                      : 'bg-[#fffef8] text-[#37412a] border-[#d9e1ca] hover:bg-[#f4f6ee] hover:border-[#87996c] dark:bg-[#1a1d16] dark:text-[#e4e9d8] dark:border-[#414a33]'
                  }`}
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    {/* Icon Logo on Left Side */}
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-[#20251a]/20 dark:text-[#20251a]'
                        : 'bg-[#f4f6ee] text-[#5c6e46] dark:bg-[#2a3121] dark:text-[#a5b48b]'
                    }`}>
                      <IconComp size={18} />
                    </div>

                    <div className='min-w-0'>
                      <p className={`text-base font-black tracking-tight leading-tight ${
                        isActive ? 'text-white dark:text-[#20251a]' : 'text-[#37412a] dark:text-[#e4e9d8]'
                      }`}>
                        {tab.count}
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider truncate mt-0.5 ${
                        isActive ? 'text-white/90 dark:text-[#20251a]/90' : 'text-[#71805a] dark:text-[#a5b48b]'
                      }`}>
                        {tab.label}
                      </p>
                    </div>
                  </div>

                  {tab.hasPending && (
                    <span className='rounded-full bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 leading-none animate-pulse shrink-0 ml-1'>
                      NEW
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab View Header & Search */}
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#20251a]'>
            <div>
              <h4 className='text-base font-bold text-[#37412a] dark:text-[#e4e9d8] capitalize'>
                {userRoleFilter === 'all' && 'Directory of All Institutional Accounts'}
                {userRoleFilter === 'student' && `Student Directory (${students.length} Total Enrolled Students)`}
                {userRoleFilter === 'lab-admin' && `Assigned Lab Administrators (${labAdmins.length} Active Admins)`}
                {userRoleFilter === 'store-admin' && `Central Store Managers (${storeAdmins.length} Managers)`}
                {userRoleFilter === 'super-admin' && `Super Administrators (${superAdmins.length} Governance Accounts)`}
                {userRoleFilter === 'pending' && `Pending Registration Approvals (${pendingApprovals.length} Accounts Awaiting Approval)`}
              </h4>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                {userRoleFilter === 'lab-admin' ? 'Displays assigned lab names and lab codes for every administrator' : 'Search and manage user access permissions'}
              </p>
            </div>

            <div className='flex items-center gap-3'>
              <div className='relative w-full sm:w-72'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#87996c]' />
                <input
                  type='text'
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder='Search by name, email, ID, or lab...'
                  className='w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#1a1d16] dark:text-[#e4e9d8]'
                />
              </div>

              {userRoleFilter === 'store-admin' && (
                <Button onClick={() => setStoreAdminModalOpen(true)} className='text-xs px-3 py-2 whitespace-nowrap'>
                  + Add Store Manager
                </Button>
              )}
              {userRoleFilter === 'super-admin' && (
                <Button onClick={() => setSuperAdminModalOpen(true)} className='text-xs px-3 py-2 whitespace-nowrap'>
                  + Create Super Admin
                </Button>
              )}
            </div>
          </div>

          {/* User Directory Data Table */}
          <div className='rounded-2xl border border-[#d9e1ca] bg-white overflow-hidden shadow-sm dark:border-[#414a33] dark:bg-[#20251a]'>
            <Table headers={userDirectoryHeaders} rows={filteredUsers} />
          </div>
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
          {/* Header Bar */}
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#d9e1ca] pb-3 dark:border-[#414a33]'>
            <div>
              <h3 className='text-xl font-bold text-[#37412a] dark:text-[#e4e9d8] flex items-center gap-2'>
                <BookOpen className='text-[#5c6e46]' /> Curriculum & Practical Experiments Builder
              </h3>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                Pre-configure practical experiments per semester with prescribed chemical requirements and Super Admin controls
              </p>
            </div>
            <div className='flex items-center gap-3'>
              <div className='relative w-full sm:w-64'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#87996c]' />
                <input
                  type='text'
                  value={currSearch}
                  onChange={(e) => setCurrSearch(e.target.value)}
                  placeholder='Search experiments or chemicals...'
                  className='w-full rounded-xl border border-[#d9e1ca] bg-white py-2 pl-9 pr-4 text-xs font-semibold outline-none focus:border-[#5c6e46] dark:border-[#414a33] dark:bg-[#1a1d16] dark:text-[#e4e9d8]'
                />
              </div>
              <Button onClick={() => setCurriculumModalOpen(true)} className='text-xs px-3.5 py-2 whitespace-nowrap font-bold'>
                <Plus size={15} className='mr-1.5' /> Add Experiment Template
              </Button>
            </div>
          </div>

          {/* Level 1: Course Category Tabs (B.Pharm, M.Pharm, PhD) */}
          <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-2 dark:border-[#414a33] dark:bg-[#20251a]'>
            {[
              { id: 'B.Pharm', label: 'B.Pharm (Bachelor of Pharmacy)', desc: '8 Academic Semesters' },
              { id: 'M.Pharm', label: 'M.Pharm (Master of Pharmacy)', desc: '4 Specialization Semesters' },
              { id: 'PhD', label: 'PhD & Advanced Research', desc: 'Doctoral Modules' },
            ].map((course) => {
              const isActive = currCourseFilter === course.id;
              const count = curriculumExperiments.filter((e) => (e.course || 'B.Pharm') === course.id).length;
              return (
                <button
                  key={course.id}
                  type='button'
                  onClick={() => {
                    setCurrCourseFilter(course.id);
                    setCurrSemFilter('1');
                  }}
                  className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#5c6e46] text-white shadow-md dark:bg-[#e4e9d8] dark:text-[#20251a]'
                      : 'bg-white text-[#37412a] hover:bg-[#f4f6ee] dark:bg-[#1a1d16] dark:text-[#e4e9d8]'
                  }`}
                >
                  <span>{course.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                    isActive ? 'bg-white/20 text-white dark:bg-[#20251a]/20 dark:text-[#20251a]' : 'bg-[#e8efd9] text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Level 2: Semester Folder Navigation Pills Bar */}
          <div className='flex flex-wrap items-center gap-2 border-b border-[#d9e1ca] pb-3 dark:border-[#414a33]'>
            <span className='text-xs font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b] mr-1 flex items-center gap-1'>
              <Folder size={14} /> Semesters:
            </span>
            {(currCourseFilter === 'B.Pharm'
              ? ['1', '2', '3', '4', '5', '6', '7', '8', 'all']
              : currCourseFilter === 'M.Pharm'
              ? ['1', '2', '3', '4', 'all']
              : ['1', 'all']
            ).map((sem) => {
              const isActive = currSemFilter === sem;
              const semCount = curriculumExperiments.filter(
                (e) => (e.course || 'B.Pharm') === currCourseFilter && (sem === 'all' || String(e.semester) === String(sem))
              ).length;
              return (
                <button
                  key={sem}
                  type='button'
                  onClick={() => {
                    setCurrSemFilter(sem);
                    setCurrSubjectFilter('all');
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-[#37412a] text-white shadow-xs dark:bg-[#e4e9d8] dark:text-[#20251a]'
                      : 'bg-[#f4f6ee] text-[#5c6e46] hover:bg-[#e4eed3] dark:bg-[#20251a] dark:text-[#c5d0b5]'
                  }`}
                >
                  {isActive ? <FolderOpen size={13} /> : <Folder size={13} />}
                  <span>{sem === 'all' ? 'All Semesters' : `Sem ${sem}`}</span>
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white dark:bg-[#20251a]/20 dark:text-[#20251a]' : 'bg-[#e2edd0] text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'
                  }`}>
                    {semCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Level 3: Subject Sub-Tabs Filter Bar (Solves Clutter for 15+ Experiments!) */}
          {availableSubjects.length > 0 && (
            <div className='flex flex-wrap items-center gap-2 rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-3 dark:border-[#414a33] dark:bg-[#20251a]'>
              <span className='text-xs font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b] mr-1 flex items-center gap-1'>
                <FlaskConical size={14} className='text-[#5c6e46]' /> Subject Labs:
              </span>

              <button
                type='button'
                onClick={() => setCurrSubjectFilter('all')}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  currSubjectFilter === 'all'
                    ? 'bg-[#5c6e46] text-white shadow-sm dark:bg-[#e4e9d8] dark:text-[#20251a]'
                    : 'bg-white text-[#37412a] border border-[#d9e1ca] hover:bg-[#f4f6ee] dark:bg-[#1a1d16] dark:text-[#e4e9d8] dark:border-[#414a33]'
                }`}
              >
                <span>All Subjects</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  currSubjectFilter === 'all' ? 'bg-white/20 text-white dark:bg-[#20251a]/20 dark:text-[#20251a]' : 'bg-[#e8efd9] text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'
                }`}>
                  {curriculumExperiments.filter(e => (e.course || 'B.Pharm') === currCourseFilter && (currSemFilter === 'all' || String(e.semester) === String(currSemFilter))).length}
                </span>
              </button>

              {availableSubjects.map((subj) => {
                const isActive = currSubjectFilter === subj;
                const subjCount = curriculumExperiments.filter(
                  e => (e.course || 'B.Pharm') === currCourseFilter && (currSemFilter === 'all' || String(e.semester) === String(currSemFilter)) && (e.subject || 'General Practical Lab') === subj
                ).length;
                return (
                  <button
                    key={subj}
                    type='button'
                    onClick={() => setCurrSubjectFilter(subj)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#5c6e46] text-white shadow-sm dark:bg-[#e4e9d8] dark:text-[#20251a]'
                        : 'bg-white text-[#37412a] border border-[#d9e1ca] hover:bg-[#f4f6ee] dark:bg-[#1a1d16] dark:text-[#e4e9d8] dark:border-[#414a33]'
                    }`}
                  >
                    <span>{subj}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      isActive ? 'bg-white/20 text-white dark:bg-[#20251a]/20 dark:text-[#20251a]' : 'bg-[#e8efd9] text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'
                    }`}>
                      {subjCount}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Subject-Grouped Experiment Cards / Tables */}
          {filteredCurriculumExperiments.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-[#d9e1ca] bg-[#fffef8] p-8 text-center dark:border-[#414a33] dark:bg-[#20251a]'>
              <BookOpen size={36} className='mx-auto text-[#87996c] mb-2' />
              <h4 className='text-lg font-bold text-[#37412a] dark:text-[#e4e9d8]'>No Practical Experiments Found</h4>
              <p className='text-xs text-[#71805a] dark:text-[#a5b48b] max-w-md mx-auto mt-1'>
                No experiment templates configured for {currCourseFilter} {currSemFilter !== 'all' ? `Semester ${currSemFilter}` : ''} {currSubjectFilter !== 'all' ? `(${currSubjectFilter})` : ''}. Click below to add a new experiment template.
              </p>
              <Button onClick={() => setCurriculumModalOpen(true)} className='text-xs px-4 py-2 mt-4 font-bold'>
                <Plus size={14} className='mr-1.5' /> Add Experiment Template
              </Button>
            </div>
          ) : (
            <div className='space-y-6'>
              {Object.entries(groupedCurriculumBySubject).map(([subjectName, exps]) => (
                <div key={subjectName} className='rounded-2xl border border-[#d9e1ca] bg-white overflow-hidden shadow-sm dark:border-[#414a33] dark:bg-[#20251a]'>
                  <div className='flex items-center justify-between border-b border-[#d9e1ca] bg-[#f8faee] px-4 py-3.5 dark:border-[#414a33] dark:bg-[#1a1d16]'>
                    <div className='flex items-center gap-2.5'>
                      <FlaskConical size={18} className='text-[#5c6e46]' />
                      <h4 className='text-base font-bold text-[#37412a] dark:text-[#e4e9d8]'>{subjectName}</h4>
                    </div>
                    <span className='rounded-full bg-[#e8efd9] px-3 py-1 text-xs font-extrabold text-[#3c4e23] dark:bg-[#2a3320] dark:text-[#a8be8a]'>
                      {exps.length} {exps.length === 1 ? 'Practical' : 'Practicals'}
                    </span>
                  </div>

                  <Table
                    headers={[
                      {
                        key: 'expNo',
                        label: 'Exp No',
                        render: (row) => (
                          <span className='inline-flex items-center rounded-lg bg-[#f4f6ee] px-3 py-1 text-xs font-mono font-black text-[#5c6e46] border border-[#d9e1ca] dark:bg-[#2a3121] dark:text-[#c5d0b5] dark:border-[#414a33]'>
                            {row.expNo || 'Exp 01'}
                          </span>
                        )
                      },
                      {
                        key: 'name',
                        label: 'Practical Experiment Title',
                        render: (row) => (
                          <div>
                            <p className='text-base font-bold text-[#37412a] dark:text-[#e4e9d8] leading-snug'>{row.name}</p>
                            <p className='text-xs font-semibold text-[#71805a] dark:text-[#a5b48b] mt-0.5'>
                              {row.course} • Yr {row.year} • Sem {row.semester}
                            </p>
                          </div>
                        )
                      },
                      {
                        key: 'requiredChemicals',
                        label: 'Prescribed Reagents & Chemicals',
                        render: (row) => (
                          <div className='flex flex-wrap items-center gap-1.5 max-w-xl'>
                            {row.requiredChemicals ? (
                              row.requiredChemicals.split(',').map((chem, idx) => (
                                <span key={idx} className='inline-flex items-center rounded-md bg-[#e4eed3] px-2.5 py-1 text-xs font-semibold text-[#2d3d17] border border-[#c5d6aa] dark:bg-[#2e3722] dark:text-[#eef4e8] dark:border-[#414a33]'>
                                  {chem.trim()}
                                </span>
                              ))
                            ) : (
                              <span className='text-xs text-[#87996c] italic'>No specific chemicals specified</span>
                            )}
                          </div>
                        )
                      },
                      {
                        key: 'actions',
                        label: 'Actions',
                        render: (row) => (
                          <div className='flex items-center gap-2'>
                            <Button
                              variant='outline'
                              onClick={() => handleOpenEditExp(row)}
                              className='text-xs px-3 py-1.5 border-[#5c6e46] text-[#5c6e46] hover:bg-[#f4f6ee] font-bold dark:border-[#a8be8a] dark:text-[#a8be8a]'
                            >
                              <Edit3 size={14} className='mr-1' /> Edit
                            </Button>
                            <Button
                              variant='outline'
                              onClick={() => handleDeleteExp(row.id, row.name)}
                              className='text-xs px-3 py-1.5 border-rose-300 text-rose-700 hover:bg-rose-50 font-bold dark:border-rose-800 dark:text-rose-400'
                            >
                              <Trash2 size={14} className='mr-1' /> Delete
                            </Button>
                          </div>
                        )
                      }
                    ]}
                    rows={exps}
                  />
                </div>
              ))}
            </div>
          )}
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
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title='Create New Department Lab & Provision Admin' panelClassName='max-w-4xl'>
        <div className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            
            {/* COLUMN 1: Lab Details */}
            <div className='space-y-4 rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#1a1d16]'>
              <h4 className='text-xs font-bold text-[#5c6e46] dark:text-[#a5b48b] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#d9e1ca] pb-2 dark:border-[#414a33]'>
                <Warehouse size={16} /> 1. Lab Specifications
              </h4>

              <Input
                label='Lab Name *'
                value={newLab.name}
                onChange={(e) => setNewLab({ ...newLab, name: e.target.value })}
                placeholder='e.g. Pharmaceutics Lab - I'
                required
              />

              <Input
                label='Lab Code *'
                value={newLab.code}
                onChange={(e) => setNewLab({ ...newLab, code: e.target.value })}
                placeholder='e.g. PH101L'
                required
              />

              <div className='grid grid-cols-2 gap-3'>
                <label className='block text-xs font-bold text-[#4e5d35] dark:text-[#d5ddbf]'>
                  <span className='mb-1 block'>Course Program</span>
                  <select
                    value={newLab.courseType}
                    onChange={(e) => setNewLab({ ...newLab, courseType: e.target.value, year: '1', semester: '1' })}
                    className='w-full rounded-xl border border-[#cfd8bd] bg-white p-2.5 text-xs font-bold text-[#3c4e23] outline-none focus:border-[#5c6e46] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                  >
                    <option value='B.Pharm'>B.Pharm (4 Years)</option>
                    <option value='M.Pharm'>M.Pharm (2 Years)</option>
                    <option value='PhD'>PhD Research</option>
                    <option value='Other'>Other Program</option>
                  </select>
                </label>

                <Input
                  label='Department (Optional)'
                  placeholder='e.g. Pharmaceutics'
                  value={newLab.department}
                  onChange={(e) => setNewLab({ ...newLab, department: e.target.value })}
                />
              </div>

              {/* Visual Academic Year */}
              <div>
                <p className='text-xs font-bold text-[#4e5d35] dark:text-[#d5ddbf] mb-1.5'>Academic Year</p>
                <div className='flex gap-2'>
                  {(newLab.courseType === 'B.Pharm' ? ['1', '2', '3', '4'] : newLab.courseType === 'M.Pharm' ? ['1', '2'] : ['1', '2', '3', '4', '5']).map((y) => (
                    <button
                      key={y}
                      type='button'
                      onClick={() => setNewLab({ ...newLab, year: y, semester: (parseInt(y) * 2 - 1).toString() })}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border ${
                        newLab.year === y
                          ? 'bg-[#5c6e46] text-white border-[#5c6e46] shadow-sm'
                          : 'border-[#d9e1ca] bg-white text-[#37412a] hover:bg-[#f4f6ee] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                      }`}
                    >
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Semester */}
              {newLab.year && (
                <div>
                  <p className='text-xs font-bold text-[#4e5d35] dark:text-[#d5ddbf] mb-1.5'>Semester</p>
                  <div className='flex gap-2'>
                    {[(parseInt(newLab.year) * 2 - 1).toString(), (parseInt(newLab.year) * 2).toString()].map((s) => (
                      <button
                        key={s}
                        type='button'
                        onClick={() => setNewLab({ ...newLab, semester: s })}
                        className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all border ${
                          newLab.semester === s
                            ? 'bg-[#37412a] text-white border-[#37412a] shadow-sm dark:bg-[#e4e9d8] dark:text-[#20251a]'
                            : 'border-[#d9e1ca] bg-white text-[#37412a] hover:bg-[#f4f6ee] dark:border-[#414a33] dark:bg-[#20251a] dark:text-[#e4e9d8]'
                        }`}
                      >
                        Semester {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* COLUMN 2: Assign / Create Lab Admin */}
            <div className='space-y-4 rounded-2xl border border-[#d9e1ca] bg-[#fffef8] p-4 dark:border-[#414a33] dark:bg-[#1a1d16] flex flex-col justify-between'>
              <div>
                <h4 className='text-xs font-bold text-[#5c6e46] dark:text-[#a5b48b] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#d9e1ca] pb-2 dark:border-[#414a33]'>
                  <UserPlus size={16} /> 2. Lab Administrator Provisioning
                </h4>

                {/* Mode Selector Tabs */}
                <div className='mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#f4f6ee] p-1 dark:bg-[#20251a] border border-[#d9e1ca] dark:border-[#414a33]'>
                  <button
                    type='button'
                    onClick={() => setAdminMode('create_new')}
                    className={`rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                      adminMode === 'create_new' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                    }`}
                  >
                    + New Admin
                  </button>
                  <button
                    type='button'
                    onClick={() => setAdminMode('existing')}
                    className={`rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                      adminMode === 'existing' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                    }`}
                  >
                    Existing Staff
                  </button>
                  <button
                    type='button'
                    onClick={() => setAdminMode('unassigned')}
                    className={`rounded-lg py-1.5 text-[11px] font-bold transition-all ${
                      adminMode === 'unassigned' ? 'bg-[#5c6e46] text-white shadow-sm' : 'text-[#71805a] hover:text-[#37412a] dark:text-[#a5b48b]'
                    }`}
                  >
                    Skip / Later
                  </button>
                </div>

                {/* Option A: Create New Lab Admin Account */}
                {adminMode === 'create_new' && (
                  <div className='mt-4 space-y-3.5 animate-in fade-in'>
                    <div className='rounded-xl bg-emerald-50/70 p-3 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/40'>
                      <p className='text-xs text-emerald-800 dark:text-emerald-300 font-medium leading-relaxed'>
                        🔑 Provision credentials for the Lab Admin. When this admin logs in with this email and password, they will immediately land inside this lab dashboard!
                      </p>
                    </div>

                    <Input
                      label='Admin Full Name *'
                      value={newLabAdmin.name}
                      onChange={(e) => setNewLabAdmin({ ...newLabAdmin, name: e.target.value })}
                      placeholder='e.g. Dr. Omprakash Tanwar'
                      required
                    />

                    <Input
                      label='Admin Login Email *'
                      type='email'
                      value={newLabAdmin.email}
                      onChange={(e) => setNewLabAdmin({ ...newLabAdmin, email: e.target.value })}
                      placeholder='admin.pharmaceutics@rasayanflow.edu'
                      required
                    />

                    <Input
                      label='Login Password *'
                      type='password'
                      value={newLabAdmin.password}
                      onChange={(e) => setNewLabAdmin({ ...newLabAdmin, password: e.target.value })}
                      placeholder='••••••••'
                      minLength={6}
                      required
                    />
                  </div>
                )}

                {/* Option B: Assign Existing Staff */}
                {adminMode === 'existing' && (
                  <div className='mt-4 space-y-3 animate-in fade-in'>
                    <label className='block text-xs font-bold text-[#4e5d35] dark:text-[#d5ddbf]'>
                      Select Registered User to Assign as Lab Admin
                    </label>
                    <select
                      value={selectedExistingAdminId}
                      onChange={(e) => setSelectedExistingAdminId(e.target.value)}
                      className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-xs text-[#3c4e23] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                    >
                      <option value=''>Select user account...</option>
                      {users.filter(u => u.role !== 'super-admin').map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email}) — {user.role}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Option C: Skip */}
                {adminMode === 'unassigned' && (
                  <div className='mt-6 rounded-xl bg-amber-50 p-4 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40 text-center animate-in fade-in'>
                    <p className='text-xs text-amber-800 dark:text-amber-300 font-medium'>
                      ⚠️ Lab will be created as <strong>Unassigned</strong>. You can assign or create a Lab Admin account later at any time from the Labs Hub dashboard.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          <Button
            onClick={handleCreateLab}
            className='w-full py-3.5 text-sm font-bold shadow-md bg-[#37412a] hover:bg-[#2a3220] text-white dark:bg-[#e4e9d8] dark:text-[#20251a]'
            disabled={creating}
          >
            {creating ? 'Creating & Provisioning Lab...' : 'Create & Provision Department Lab'}
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

      {/* Edit Experiment Template Modal */}
      <Modal open={editCurrModalOpen} onClose={() => { setEditCurrModalOpen(false); setEditingExp(null); }} title='Edit Practical Experiment Template'>
        {editingExp && (
          <div className='space-y-4'>
            <div className='grid grid-cols-3 gap-3'>
              <label className='block text-xs font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>
                Course
                <select
                  value={editingExp.course}
                  onChange={(e) => setEditingExp({ ...editingExp, course: e.target.value })}
                  className='w-full mt-1 rounded-xl border border-[#cfd8bd] bg-white p-2.5 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                >
                  <option value='B.Pharm'>B.Pharm</option>
                  <option value='M.Pharm'>M.Pharm</option>
                  <option value='PhD'>PhD</option>
                </select>
              </label>
              <label className='block text-xs font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>
                Year
                <select
                  value={editingExp.year}
                  onChange={(e) => setEditingExp({ ...editingExp, year: e.target.value })}
                  className='w-full mt-1 rounded-xl border border-[#cfd8bd] bg-white p-2.5 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                >
                  <option value='1'>Year 1</option>
                  <option value='2'>Year 2</option>
                  <option value='3'>Year 3</option>
                  <option value='4'>Year 4</option>
                </select>
              </label>
              <label className='block text-xs font-medium text-[#4e5d35] dark:text-[#d5ddbf]'>
                Semester
                <select
                  value={editingExp.semester}
                  onChange={(e) => setEditingExp({ ...editingExp, semester: e.target.value })}
                  className='w-full mt-1 rounded-xl border border-[#cfd8bd] bg-white p-2.5 text-xs dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={String(s)}>Sem {s}</option>
                  ))}
                </select>
              </label>
            </div>

            <Input
              label='Subject Lab Name *'
              value={editingExp.subject}
              onChange={(e) => setEditingExp({ ...editingExp, subject: e.target.value })}
              placeholder='e.g. Pharmaceutics Lab - I'
            />

            <div className='grid grid-cols-3 gap-3'>
              <div className='col-span-1'>
                <Input
                  label='Exp No *'
                  value={editingExp.expNo}
                  onChange={(e) => setEditingExp({ ...editingExp, expNo: e.target.value })}
                  placeholder='Exp 01'
                />
              </div>
              <div className='col-span-2'>
                <Input
                  label='Experiment Title *'
                  value={editingExp.name}
                  onChange={(e) => setEditingExp({ ...editingExp, name: e.target.value })}
                  placeholder='Formulation of Simple Syrup IP'
                />
              </div>
            </div>

            <div>
              <label className='block text-xs font-medium text-[#4e5d35] dark:text-[#d5ddbf] mb-1'>
                Prescribed Reagents & Chemicals (Comma Separated) *
              </label>
              <textarea
                rows={3}
                value={editingExp.requiredChemicals || ''}
                onChange={(e) => setEditingExp({ ...editingExp, requiredChemicals: e.target.value })}
                placeholder='Sucrose (66.7% w/w), Purified Water, Methylparaben'
                className='w-full rounded-xl border border-[#cfd8bd] bg-white p-3 text-xs outline-none focus:border-[#5c6e46] dark:border-[#4e5d35] dark:bg-[#20251a] dark:text-[#eef4e8]'
              />
            </div>

            <Button onClick={handleSaveEditExp} className='w-full font-bold mt-2'>
              Save Experiment Changes
            </Button>
          </div>
        )}
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
