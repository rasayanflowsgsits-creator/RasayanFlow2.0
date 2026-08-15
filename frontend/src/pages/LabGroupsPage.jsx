import { useState, useEffect, useMemo } from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import {
  Users, Plus, Zap, Pencil, Trash2, FlaskConical,
  Clock, UserCheck, ChevronRight, X, Check, Shuffle,
  Hash, UsersRound, Layers, AlertCircle, Sparkles
} from 'lucide-react';

const AVATAR_COLORS = [
  'bg-[#5c6e46]', 'bg-[#b89228]', 'bg-[#3b6748]', 'bg-[#6b4226]',
  'bg-[#2d4b68]', 'bg-[#682d4b]', 'bg-[#4b682d]', 'bg-[#7a5e18]',
];

function Avatar({ name, size = 'md', colorIdx = 0 }) {
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  return (
    <div className={`${sizeClass} ${AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]} rounded-md flex items-center justify-center text-white font-extrabold flex-shrink-0`} title={name}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

const AUTO_METHODS = [
  { id: 'rollNumber', label: 'Sequential Roll Number', desc: 'Sort students by Roll Number, split into equal lab groups' },
  { id: 'count', label: 'Equal Group Distribution', desc: 'Divide all students equally across N groups' },
  { id: 'random', label: 'Random Shuffling', desc: 'Randomly shuffle students into balanced lab groups' },
];

const GROUP_NAMES = ['Group-A', 'Group-B', 'Group-C', 'Group-D', 'Group-E', 'Group-F', 'Group-G', 'Group-H', 'Group-I', 'Group-J'];

export default function LabGroupsPage() {
  const user = useAuthStore((s) => s.user);
  const store = useAppStore();
  const {
    labs, teams, eligibleTeamMembers, experiments,
    fetchLabs, fetchTeams, fetchEligibleTeamMembers, fetchExperiments,
    createTeam, updateTeam, setToast
  } = store;

  const [selectedLabId, setSelectedLabId] = useState(() => localStorage.getItem('pharmlab-active-lab') || '');
  
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);
  const [assignExpOpen, setAssignExpOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [assigningTeam, setAssigningTeam] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [groupForm, setGroupForm] = useState({ name: '', leaderId: '', memberIds: [] });
  const [autoForm, setAutoForm] = useState({ method: 'rollNumber', perGroup: 5 });
  const [assignForm, setAssignForm] = useState({ experimentId: '', scheduledDate: '' });

  // Assigned labs
  const assignedLabs = useMemo(() => {
    const uid = String(user?.id || user?._id || '');
    const email = (user?.email || '').toLowerCase();
    const userLabId = String(user?.labId?._id || user?.labId || '');
    return (labs || []).filter((lab) => {
      const labId = String(lab.id || lab._id);
      const isAdmin = Array.isArray(lab.admins) && lab.admins.some((a) => {
        const aId = String(a.id || a._id || a);
        const aEmail = (a.email || '').toLowerCase();
        return (uid && aId === uid) || (email && aEmail === email);
      });
      return isAdmin || (userLabId && userLabId === labId);
    });
  }, [labs, user]);

  useEffect(() => {
    fetchLabs();
    fetchEligibleTeamMembers();
  }, []);

  useEffect(() => {
    if (!assignedLabs.length) return;
    const validSelection = assignedLabs.some((lab) => String(lab.id || lab._id) === String(selectedLabId));
    if (!selectedLabId || !validSelection) {
      const nextLabId = String(assignedLabs[0].id || assignedLabs[0]._id);
      setSelectedLabId(nextLabId);
      localStorage.setItem('pharmlab-active-lab', nextLabId);
    }
  }, [assignedLabs, selectedLabId]);

  const activeLab = assignedLabs.find((lab) => String(lab.id || lab._id) === String(selectedLabId)) || assignedLabs[0] || (labs || [])[0];
  const labId = activeLab?.id || activeLab?._id || '';

  useEffect(() => {
    if (labId) {
      fetchTeams(labId);
      fetchExperiments({ labId });
    }
  }, [labId]);

  // Filter teams for current active lab
  const labTeams = useMemo(() => {
    if (!teams?.length) return [];
    if (!labId) return teams;
    return teams.filter(t => {
      const tLabId = String(t.labId?._id || t.labId || '');
      return !tLabId || tLabId === String(labId);
    });
  }, [teams, labId]);

  // Stats
  const totalStudentsInGroups = useMemo(() => {
    const allMemberIds = new Set();
    (labTeams || []).forEach((t) => {
      if (t.leaderId) allMemberIds.add(String(t.leaderId?._id || t.leaderId));
      (t.memberIds || []).forEach((m) => allMemberIds.add(String(m?._id || m)));
    });
    return allMemberIds.size;
  }, [labTeams]);

  const membersInTeams = new Set();
  (labTeams || []).forEach((t) => {
    if (t.leaderId) membersInTeams.add(String(t.leaderId?._id || t.leaderId));
    (t.memberIds || []).forEach((m) => membersInTeams.add(String(m?._id || m)));
  });

  const availableStudents = (eligibleTeamMembers || []).filter(
    (s) => !membersInTeams.has(String(s.id || s._id))
  );

  // Handlers
  const resetGroupForm = () => setGroupForm({ name: '', leaderId: '', memberIds: [] });

  const openEdit = (team) => {
    setEditingTeam(team);
    setGroupForm({
      name: team.name,
      leaderId: String(team.leaderId?._id || team.leaderId || ''),
      memberIds: (team.memberIds || []).map((m) => String(m?._id || m)),
    });
    setEditOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return;
    setSaving(true);
    try {
      await createTeam({ name: groupForm.name, leaderId: groupForm.leaderId, memberIds: groupForm.memberIds, labId });
      setCreateOpen(false);
      resetGroupForm();
      fetchTeams(labId);
      setToast({ type: 'success', message: `Group ${groupForm.name} created successfully` });
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to create group' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditGroup = async () => {
    if (!editingTeam || !groupForm.name.trim()) return;
    setSaving(true);
    try {
      await updateTeam(editingTeam._id || editingTeam.id, {
        name: groupForm.name,
        leaderId: groupForm.leaderId,
        memberIds: groupForm.memberIds,
      });
      setEditOpen(false);
      setEditingTeam(null);
      resetGroupForm();
      fetchTeams(labId);
      setToast({ type: 'success', message: `Group updated successfully` });
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to update group' });
    } finally {
      setSaving(false);
    }
  };

  // Auto-generate groups logic
  const autoGenPreview = useMemo(() => {
    if (!eligibleTeamMembers?.length) return [];
    const members = [...eligibleTeamMembers];
    if (autoForm.method === 'rollNumber') {
      members.sort((a, b) => (a.rollNumber || a.name || '').localeCompare(b.rollNumber || b.name || ''));
    } else if (autoForm.method === 'random') {
      for (let i = members.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [members[i], members[j]] = [members[j], members[i]];
      }
    }
    const perGroup = Math.max(1, Number(autoForm.perGroup) || 5);
    const groups = [];
    for (let i = 0; i < members.length; i += perGroup) {
      groups.push(members.slice(i, i + perGroup));
    }
    return groups;
  }, [eligibleTeamMembers, autoForm.method, autoForm.perGroup]);

  const handleAutoGenerate = async () => {
    if (!autoGenPreview.length) return;
    setSaving(true);
    try {
      for (let i = 0; i < autoGenPreview.length; i++) {
        const grp = autoGenPreview[i];
        const leader = grp[0];
        const members = grp.slice(1);
        await createTeam({
          name: GROUP_NAMES[i] || `Group-${i + 1}`,
          leaderId: leader?.id || leader?._id,
          memberIds: members.map((m) => m.id || m._id),
          labId,
        });
      }
      setAutoGenOpen(false);
      fetchTeams(labId);
      setToast({ type: 'success', message: `${autoGenPreview.length} lab groups auto-generated successfully!` });
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to generate groups' });
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (id) => {
    setGroupForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(id)
        ? prev.memberIds.filter((m) => m !== id)
        : [...prev.memberIds, id],
    }));
  };

  const getMemberName = (memberId) => {
    const member = (eligibleTeamMembers || []).find((m) => String(m.id || m._id) === String(memberId?._id || memberId));
    return member?.name || member?.email || 'Student';
  };

  const getMemberRoll = (memberId) => {
    const member = (eligibleTeamMembers || []).find((m) => String(m.id || m._id) === String(memberId?._id || memberId));
    return member?.rollNumber || '';
  };

  const getLeaderName = (leaderId) => {
    const member = (eligibleTeamMembers || []).find((m) => String(m.id || m._id) === String(leaderId?._id || leaderId));
    return member?.name || member?.email || 'Leader';
  };

  const getExperimentName = (expId) => {
    const exp = (experiments || []).find((e) => String(e.id || e._id) === String(expId));
    return exp ? `Exp ${exp.experimentNumber}: ${exp.experimentObject}` : 'Practical Experiment';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header & Lab Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#e4eed3] pb-4 dark:border-[#2e3722]">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#87996c] dark:text-[#7a8f62]">
            <span>Pharma Laboratory</span>
            <ChevronRight size={12} />
            <span className="text-[#5c6e46] dark:text-[#a8be8a] font-bold">Student Groups</span>
          </div>
          <h1 className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8] mt-0.5 flex items-center gap-2">
            <UsersRound size={24} className="text-[#5c6e46]" />
            Student Groups Manager
          </h1>
          <p className="text-[#71805a] dark:text-[#c5d0b5] text-xs font-semibold">
            Organize students into lab practical groups for <strong className="text-[#37412a] dark:text-[#e4e9d8]">{activeLab?.name || activeLab?.labName || 'HAP1'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {assignedLabs.length > 1 && (
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-xs font-extrabold text-[#71805a] dark:text-[#a5b48b] flex items-center gap-1">
                <Layers size={13} /> Switch Lab:
              </span>
              {assignedLabs.map((lab) => {
                const labKey = String(lab.id || lab._id);
                const isSelected = labKey === String(selectedLabId);
                return (
                  <button
                    key={labKey}
                    type="button"
                    onClick={() => {
                      setSelectedLabId(labKey);
                      localStorage.setItem('pharmlab-active-lab', labKey);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all border ${
                      isSelected
                        ? 'bg-[#5c6e46] text-white border-[#5c6e46] dark:bg-[#e4e9d8] dark:text-[#20251a]'
                        : 'bg-white text-[#5c6e46] border-[#d9e1ca] hover:bg-[#f4f6ee] dark:bg-[#1a1d16] dark:text-[#a8be8a] dark:border-[#414a33]'
                    }`}
                  >
                    {lab.labName || lab.name || 'Lab'} ({lab.courseType || 'B.Pharm'} Y{lab.year})
                  </button>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => setAutoGenOpen(true)}
            className="flex items-center gap-1.5 bg-[#b89228] hover:bg-[#a07e20] text-white px-4 py-2.5 rounded-lg text-xs font-extrabold shadow-2xs transition-all"
          >
            <Zap size={15} /> Auto-Generate
          </button>
          <button
            type="button"
            onClick={() => { resetGroupForm(); setCreateOpen(true); }}
            className="flex items-center gap-1.5 bg-[#5c6e46] hover:bg-[#475735] text-white px-4 py-2.5 rounded-lg text-xs font-extrabold shadow-2xs transition-all"
          >
            <Plus size={15} /> Create Group
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Lab Groups', value: labTeams.length, icon: UsersRound, color: 'text-[#37412a] dark:text-[#e4e9d8]', bg: 'bg-[#f4f6ee] dark:bg-[#20251a]' },
          { label: 'Students In Groups', value: totalStudentsInGroups, icon: Users, color: 'text-[#b89228]', bg: 'bg-amber-100 dark:bg-amber-900/30' },
          { label: 'Available Unassigned', value: availableStudents.length, icon: UserCheck, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Total Eligible Students', value: (eligibleTeamMembers || []).length, icon: Users, color: 'text-[#5c6e46]', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-[#fffef8] dark:bg-[#1a1d16] border border-[#d9e1ca] dark:border-[#414a33] rounded-xl p-4 flex items-center gap-4 shadow-2xs">
            <div className={`p-3 rounded-lg ${bg} ${color}`}>
              <Icon size={22} />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#71805a] dark:text-[#a5b48b]">{label}</p>
              <p className="text-2xl font-black text-[#37412a] dark:text-[#e4e9d8]">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Groups Grid */}
      {store.loading && !labTeams.length ? (
        <div className="flex items-center justify-center py-16 text-[#87996c] text-xs font-bold">Loading lab groups...</div>
      ) : !labTeams.length ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd8bd] bg-[#fdfdf7] py-16 text-center dark:border-[#414a33] dark:bg-[#1a1d16]">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#f4f5eb] dark:bg-[#28301f]">
            <UsersRound size={26} className="text-[#5c6e46]" />
          </div>
          <h3 className="mb-1 text-lg font-black text-[#37412a] dark:text-[#e4e9d8]">No Groups Formed Yet</h3>
          <p className="max-w-md text-xs font-semibold text-[#71805a] dark:text-[#a5b48b] mb-6">
            You have <strong className="text-[#37412a] dark:text-[#e4e9d8]">{eligibleTeamMembers?.length || 0} registered students</strong> in {activeLab?.name || 'HAP1'}. Click Auto-Generate to split them into balanced lab groups in 1 click!
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className="bg-[#b89228] hover:bg-[#a07e20] text-white px-5 py-2.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5"
              onClick={() => setAutoGenOpen(true)}
            >
              <Zap size={15} /> Auto-Generate Groups
            </button>
            <button
              type="button"
              className="bg-[#5c6e46] hover:bg-[#475735] text-white px-5 py-2.5 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5"
              onClick={() => { resetGroupForm(); setCreateOpen(true); }}
            >
              <Plus size={15} /> Create Group Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {labTeams.map((team, idx) => {
            const leaderName = getLeaderName(team.leaderId);
            const memberList = team.memberIds || [];
            const memberCount = memberList.length + (team.leaderId ? 1 : 0);

            return (
              <div
                key={team._id || team.id}
                className="rounded-xl border border-[#d9e1ca] dark:border-[#414a33] bg-[#fffef8] dark:bg-[#1a1d16] p-5 shadow-2xs hover:shadow-md transition-all duration-200"
              >
                {/* Group Card Header */}
                <div className="flex items-start justify-between mb-4 border-b border-[#e4eed3] pb-3 dark:border-[#2e3722]">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} rounded-lg flex items-center justify-center text-white font-extrabold text-base`}>
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[#37412a] dark:text-[#e4e9d8] text-base">{team.name}</h3>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#71805a]">
                        <Users size={12} /> {memberCount} Student Member{memberCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(team)}
                      className="p-1.5 rounded-lg hover:bg-[#f4f6ee] dark:hover:bg-[#20251a] text-[#5c6e46] transition"
                      title="Edit Group"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAssigningTeam(team); setAssignForm({ experimentId: '', scheduledDate: '' }); setAssignExpOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-[#f4f6ee] dark:hover:bg-[#20251a] text-[#5c6e46] transition"
                      title="Assign Practical Experiment"
                    >
                      <FlaskConical size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(team)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-[#71805a] hover:text-rose-600 transition"
                      title="Delete Group"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Group Leader Badge */}
                {team.leaderId && (
                  <div className="flex items-center justify-between mb-3 p-2.5 rounded-lg bg-[#f4f6ee] dark:bg-[#20251a] border border-[#d9e1ca] dark:border-[#414a33]">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={leaderName} size="sm" colorIdx={idx} />
                      <div>
                        <div className="text-xs font-extrabold text-[#37412a] dark:text-[#e4e9d8]">{leaderName}</div>
                        <div className="text-[10px] text-[#71805a]">Group Leader</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      LEADER
                    </span>
                  </div>
                )}

                {/* Group Members List */}
                <div className="space-y-1.5 mb-4">
                  <div className="text-[11px] font-extrabold text-[#71805a] uppercase tracking-wider">Members List</div>
                  {memberList.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {memberList.map((m, mi) => (
                        <div key={mi} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#151712] border border-[#e8efd9] dark:border-[#2e3722] text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar name={getMemberName(m)} size="sm" colorIdx={mi + 3} />
                            <span className="font-semibold text-[#37412a] dark:text-[#e4e9d8] truncate">{getMemberName(m)}</span>
                          </div>
                          {getMemberRoll(m) && (
                            <span className="text-[10px] font-mono text-[#71805a] font-bold">Roll: {getMemberRoll(m)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-[#71805a] italic py-1">No additional members added.</div>
                  )}
                </div>

                {/* Assigned Experiment Slot */}
                <div className="pt-3 border-t border-[#e4eed3] dark:border-[#2e3722] space-y-1">
                  {team.currentExperiment ? (
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#5c6e46] dark:text-[#a8be8a]">
                      <FlaskConical size={13} className="shrink-0" />
                      <span className="truncate">{getExperimentName(team.currentExperiment)}</span>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-[#71805a] italic">No experiment assigned</div>
                  )}
                  {team.scheduledSlot && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#71805a]">
                      <Clock size={12} /> Slot: {new Date(team.scheduledSlot).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Lab Group" panelClassName="max-w-4xl">
        <GroupFormContent />
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[#e4eed3] dark:border-[#2e3722]">
          <button 
            type="button" 
            onClick={() => setCreateOpen(false)}
            className="px-4 py-2 rounded-lg border border-[#cfd8bd] text-xs font-bold text-[#5c6e46] hover:bg-[#f4f6ee]"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSaveGroup} 
            disabled={saving || !groupForm.name.trim()}
            className="px-5 py-2 rounded-lg bg-[#5c6e46] text-xs font-extrabold text-white hover:bg-[#475735]"
          >
            {saving ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Group: ${editingTeam?.name}`} panelClassName="max-w-4xl">
        <GroupFormContent />
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[#e4eed3] dark:border-[#2e3722]">
          <button 
            type="button" 
            onClick={() => setEditOpen(false)}
            className="px-4 py-2 rounded-lg border border-[#cfd8bd] text-xs font-bold text-[#5c6e46] hover:bg-[#f4f6ee]"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleEditGroup} 
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#5c6e46] text-xs font-extrabold text-white hover:bg-[#475735]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      {/* Auto-Generate Modal */}
      <Modal open={autoGenOpen} onClose={() => setAutoGenOpen(false)} title="Auto-Generate Lab Groups">
        <div className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block font-extrabold text-[#37412a] dark:text-[#e4e9d8] mb-2">Generation Method</label>
            <div className="space-y-2">
              {AUTO_METHODS.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    autoForm.method === method.id
                      ? 'border-[#5c6e46] bg-[#f4f6ee] dark:bg-[#20251a]'
                      : 'border-[#cfd8bd] dark:border-[#414a33] hover:bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-0.5"
                    checked={autoForm.method === method.id}
                    onChange={() => setAutoForm((p) => ({ ...p, method: method.id }))}
                  />
                  <div>
                    <div className="font-extrabold text-[#37412a] dark:text-[#e4e9d8]">{method.label}</div>
                    <div className="text-[11px] text-[#71805a]">{method.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-extrabold text-[#37412a] dark:text-[#e4e9d8] mb-1">Students Per Group</label>
            <input
              type="number"
              min="1"
              max="20"
              value={autoForm.perGroup}
              onChange={(e) => setAutoForm((p) => ({ ...p, perGroup: Number(e.target.value) }))}
              className="w-full rounded-lg border border-[#cfd8bd] bg-white px-3.5 py-2 text-xs font-bold text-[#37412a] dark:text-[#e4e9d8] dark:border-[#414a33] dark:bg-[#1a1d16] outline-none"
            />
          </div>

          <div className="rounded-lg bg-[#f4f6ee] dark:bg-[#20251a] p-3 border border-[#d9e1ca] dark:border-[#414a33]">
            <div className="text-[11px] font-extrabold text-[#5c6e46] mb-1 uppercase tracking-wider">Preview Generation</div>
            <div className="text-xs font-semibold text-[#37412a] dark:text-[#e4e9d8]">
              {eligibleTeamMembers?.length || 0} registered students will be divided into{' '}
              <strong className="text-[#5c6e46] dark:text-[#a8be8a] font-extrabold">{autoGenPreview.length} groups</strong>
              {autoGenPreview.length > 0 && ` (${GROUP_NAMES.slice(0, Math.min(autoGenPreview.length, 3)).join(', ')}${autoGenPreview.length > 3 ? ', ...' : ''})`}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[#e4eed3] dark:border-[#2e3722]">
            <button
              type="button"
              onClick={() => setAutoGenOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#cfd8bd] text-xs font-bold text-[#5c6e46] hover:bg-[#f4f6ee]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAutoGenerate}
              disabled={saving || !autoGenPreview.length}
              className="px-5 py-2 rounded-lg bg-[#b89228] text-xs font-extrabold text-white hover:bg-[#a07e20] flex items-center gap-1.5"
            >
              <Zap size={14} />
              {saving ? 'Generating...' : `Generate ${autoGenPreview.length} Groups`}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Experiment Modal */}
      <Modal open={assignExpOpen} onClose={() => setAssignExpOpen(false)} title={`Assign Experiment to ${assigningTeam?.name}`}>
        <div className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block font-extrabold text-[#37412a] dark:text-[#e4e9d8] mb-1">Experiment</label>
            <select
              value={assignForm.experimentId}
              onChange={(e) => setAssignForm((p) => ({ ...p, experimentId: e.target.value }))}
              className="w-full rounded-lg border border-[#cfd8bd] bg-white px-3.5 py-2.5 text-xs font-bold text-[#37412a] dark:text-[#e4e9d8] dark:border-[#414a33] dark:bg-[#1a1d16] outline-none"
            >
              <option value="">— Select Practical Experiment —</option>
              {(experiments || []).map((exp) => (
                <option key={exp.id || exp._id} value={exp.id || exp._id}>
                  Exp {exp.experimentNumber}: {exp.experimentObject}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-extrabold text-[#37412a] dark:text-[#e4e9d8] mb-1">Scheduled Date & Time</label>
            <input
              type="datetime-local"
              value={assignForm.scheduledDate}
              onChange={(e) => setAssignForm((p) => ({ ...p, scheduledDate: e.target.value }))}
              className="w-full rounded-lg border border-[#cfd8bd] bg-white px-3.5 py-2.5 text-xs font-bold text-[#37412a] dark:text-[#e4e9d8] dark:border-[#414a33] dark:bg-[#1a1d16] outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[#e4eed3] dark:border-[#2e3722]">
            <button
              type="button"
              onClick={() => setAssignExpOpen(false)}
              className="px-4 py-2 rounded-lg border border-[#cfd8bd] text-xs font-bold text-[#5c6e46] hover:bg-[#f4f6ee]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!assignForm.experimentId || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await updateTeam(assigningTeam._id || assigningTeam.id, {
                    currentExperiment: assignForm.experimentId,
                    scheduledSlot: assignForm.scheduledDate || null,
                  });
                  setAssignExpOpen(false);
                  fetchTeams(labId);
                  setToast({ type: 'success', message: 'Experiment assigned to group!' });
                } catch (e) {
                  setToast({ type: 'error', message: 'Failed to assign experiment' });
                } finally {
                  setSaving(false);
                }
              }}
              className="px-5 py-2 rounded-lg bg-[#5c6e46] text-xs font-extrabold text-white hover:bg-[#475735]"
            >
              {saving ? 'Assigning...' : 'Assign Experiment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Group">
        {deleteConfirm && (
          <div className="space-y-4 text-xs font-semibold">
            <p className="text-[#37412a] dark:text-[#e4e9d8]">
              Are you sure you want to delete <strong className="font-extrabold">{deleteConfirm.name}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-[#cfd8bd] text-xs font-bold text-[#5c6e46]"
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold"
                onClick={async () => {
                  try {
                    await updateTeam(deleteConfirm._id || deleteConfirm.id, { status: 'archived' });
                    setDeleteConfirm(null);
                    fetchTeams(labId);
                    setToast({ type: 'success', message: 'Group removed' });
                  } catch {
                    setToast({ type: 'error', message: 'Failed to delete group' });
                    setDeleteConfirm(null);
                  }
                }}
              >
                Delete Group
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
