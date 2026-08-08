import { useState, useEffect, useMemo } from 'react';
import useAppStore from '../store/appStore';
import useAuthStore from '../store/authStore';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import {
  Users, Plus, Zap, Pencil, Trash2, FlaskConical,
  Clock, UserCheck, ChevronRight, X, Check, Shuffle,
  Hash, UsersRound
} from 'lucide-react';

const AVATAR_COLORS = [
  'bg-[#556b2f]', 'bg-[#c8a030]', 'bg-[#4a7c59]', 'bg-[#6b4226]',
  'bg-[#2a4a6b]', 'bg-[#6b2a4a]', 'bg-[#4a6b2a]', 'bg-[#8b6914]',
];

function Avatar({ name, size = 'md', colorIdx = 0 }) {
  const sizeClass = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  return (
    <div className={`${sizeClass} ${AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`} title={name}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

const AUTO_METHODS = [
  { id: 'rollNumber', label: 'By Roll Number', desc: 'Sort by roll number, split into groups' },
  { id: 'count', label: 'By Count', desc: 'Divide equally into N groups' },
  { id: 'random', label: 'Random', desc: 'Randomly shuffle into groups' },
];

const GROUP_NAMES = ['Group-A', 'Group-B', 'Group-C', 'Group-D', 'Group-E', 'Group-F', 'Group-G', 'Group-H', 'Group-I', 'Group-J'];

export default function LabGroupsPage() {
  const user = useAuthStore((s) => s.user);
  const store = useAppStore();
  const {
    labs, teams, eligibleTeamMembers, experiments,
    fetchLabs, fetchTeams, fetchEligibleTeamMembers, fetchExperiments,
    createTeam, updateTeam, loading, setToast
  } = store;

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
  const [autoForm, setAutoForm] = useState({ method: 'rollNumber', perGroup: 5, rollPrefix: '' });
  const [assignForm, setAssignForm] = useState({ experimentId: '', scheduledDate: '' });

  // Assigned labs
  const assignedLabs = useMemo(() => {
    const uid = String(user?.id || user?._id || '');
    const email = (user?.email || '').toLowerCase();
    const userLabId = String(user?.labId?._id || user?.labId || '');
    return labs.filter((lab) => {
      const labId = String(lab.id || lab._id);
      const isAdmin = Array.isArray(lab.admins) && lab.admins.some((a) => {
        const aId = String(a.id || a._id || a);
        const aEmail = (a.email || '').toLowerCase();
        return (uid && aId === uid) || (email && aEmail === email);
      });
      return isAdmin || (userLabId && userLabId === labId);
    });
  }, [labs, user]);

  const activeLab = assignedLabs[0];
  const labId = activeLab?.id || activeLab?._id || '';

  useEffect(() => {
    fetchLabs();
    fetchEligibleTeamMembers();
  }, []);

  useEffect(() => {
    if (labId) {
      fetchTeams(labId);
      fetchExperiments({ labId });
    }
  }, [labId]);

  // Stats
  const totalStudentsInGroups = useMemo(() => {
    const allMemberIds = new Set();
    (teams || []).forEach((t) => {
      if (t.leaderId) allMemberIds.add(String(t.leaderId?._id || t.leaderId));
      (t.memberIds || []).forEach((m) => allMemberIds.add(String(m?._id || m)));
    });
    return allMemberIds.size;
  }, [teams]);

  const membersInTeams = new Set();
  (teams || []).forEach((t) => {
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
    } catch (e) {
      setToast({ type: 'error', message: 'Failed to update group' });
    } finally {
      setSaving(false);
    }
  };

  // Auto-generate groups
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
      setToast({ type: 'success', message: `${autoGenPreview.length} groups created!` });
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
    const member = (eligibleTeamMembers || []).find((m) => String(m.id || m._id) === String(memberId));
    return member?.name || member?.email || 'Unknown';
  };

  const getLeaderName = (leaderId) => {
    const member = (eligibleTeamMembers || []).find((m) => String(m.id || m._id) === String(leaderId?._id || leaderId));
    return member?.name || member?.email || 'Unknown';
  };

  const getExperimentName = (expId) => {
    const exp = (experiments || []).find((e) => String(e.id || e._id) === String(expId));
    return exp ? `Exp ${exp.experimentNumber}: ${exp.experimentObject}` : '—';
  };

  // Group form shared content
  const GroupFormContent = () => (
    <div className="space-y-4">
      {/* Group Name */}
      <div>
        <label className="block text-xs font-medium text-[#556b2f] mb-1">Group Name</label>
        <input
          type="text"
          value={groupForm.name}
          onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="e.g. Group-A"
          className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:text-[#eef4e8]"
        />
      </div>

      {/* Leader */}
      <div>
        <label className="block text-xs font-medium text-[#556b2f] mb-1">Group Leader</label>
        <select
          value={groupForm.leaderId}
          onChange={(e) => setGroupForm((p) => ({ ...p, leaderId: e.target.value }))}
          className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:text-[#eef4e8]"
        >
          <option value="">— Select Leader —</option>
          {(eligibleTeamMembers || []).map((m) => (
            <option key={m.id || m._id} value={m.id || m._id}>
              {m.name} {m.rollNumber ? `(${m.rollNumber})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Members */}
      <div>
        <label className="block text-xs font-medium text-[#556b2f] mb-1">
          Members <span className="text-[#87996c]">({groupForm.memberIds.length} selected)</span>
        </label>
        <div className="max-h-40 overflow-y-auto rounded-xl border border-[#cfd8bd] dark:border-[#4e5d35] bg-[#fafbf5] dark:bg-[#1c2117]">
          {(eligibleTeamMembers || []).map((m) => {
            const id = String(m.id || m._id);
            const checked = groupForm.memberIds.includes(id);
            return (
              <label
                key={id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-[#f0f4e8] dark:hover:bg-[#28301f] cursor-pointer transition"
              >
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'bg-[#556b2f] border-[#556b2f]' : 'border-[#cfd8bd] dark:border-[#4e5d35]'}`}>
                  {checked && <Check size={10} className="text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleMember(id)} />
                <Avatar name={m.name} size="sm" colorIdx={(m.rollNumber || '').charCodeAt(0)} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#2e3d19] dark:text-[#eef4e8] truncate">{m.name}</div>
                  {m.rollNumber && <div className="text-xs text-[#87996c]">{m.rollNumber}</div>}
                </div>
              </label>
            );
          })}
          {!(eligibleTeamMembers?.length) && (
            <div className="px-3 py-4 text-center text-sm text-[#87996c]">No eligible students found</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#3c4e23] dark:text-[#eef4e8]">Student Groups</h2>
          <p className="text-sm text-[#71805a] dark:text-[#c5d0b5]">
            Organize students into lab groups for {activeLab?.labName || activeLab?.name || 'your lab'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="bg-[#c8a030] hover:bg-[#b08c28] text-white flex items-center gap-2"
            onClick={() => setAutoGenOpen(true)}
          >
            <Zap size={15} />
            Auto-Generate
          </Button>
          <Button
            className="bg-[#556b2f] hover:bg-[#4a5f28] text-white flex items-center gap-2"
            onClick={() => { resetGroupForm(); setCreateOpen(true); }}
          >
            <Plus size={15} />
            Create Group
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Groups', value: (teams || []).length, icon: UsersRound, color: 'text-[#556b2f]' },
          { label: 'Students in Groups', value: totalStudentsInGroups, icon: Users, color: 'text-[#c8a030]' },
          { label: 'Available Students', value: availableStudents.length, icon: UserCheck, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Eligible Students', value: (eligibleTeamMembers || []).length, icon: Users, color: 'text-[#87996c]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] bg-white dark:bg-[#1a1d16] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-[#87996c] mb-1">
              <Icon size={14} className={color} /> {label}
            </div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Groups Grid */}
      {loading && !(teams?.length) ? (
        <div className="flex items-center justify-center py-16 text-[#87996c] text-sm">Loading groups...</div>
      ) : !(teams?.length) ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd8bd] bg-[#fdfdf7] py-20 text-center dark:border-[#4e5d35] dark:bg-[#1a1d16]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f4f5eb] dark:bg-[#28301f]">
            <UsersRound size={28} className="text-[#87996c]" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#3c4e23] dark:text-[#eef4e8]">No Groups Yet</h3>
          <p className="max-w-sm text-sm text-[#71805a] dark:text-[#c5d0b5] mb-6">
            Create your first group manually or use Auto-Generate to organize students by roll number automatically.
          </p>
          <div className="flex gap-3">
            <Button className="bg-[#c8a030] hover:bg-[#b08c28] text-white" onClick={() => setAutoGenOpen(true)}>
              <Zap size={15} className="mr-1.5" /> Auto-Generate Groups
            </Button>
            <Button className="bg-[#556b2f] hover:bg-[#4a5f28] text-white" onClick={() => { resetGroupForm(); setCreateOpen(true); }}>
              <Plus size={15} className="mr-1.5" /> Create Group
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {(teams || []).map((team, idx) => {
            const leaderName = getLeaderName(team.leaderId);
            const memberCount = (team.memberIds || []).length + (team.leaderId ? 1 : 0);
            const visibleMembers = (team.memberIds || []).slice(0, 3);
            const extraCount = Math.max(0, (team.memberIds || []).length - 3);

            return (
              <div
                key={team._id || team.id}
                className="rounded-2xl border border-[#d9e1ca] dark:border-[#3c452f] bg-white dark:bg-[#1a1d16] p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                {/* Group Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
                      {team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2e3d19] dark:text-[#eef4e8] text-base">{team.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-[#87996c]">
                        <Users size={11} /> {memberCount} member{memberCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(team)}
                      className="p-1.5 rounded-lg hover:bg-[#f0f4e8] dark:hover:bg-[#28301f] text-[#87996c] transition"
                      title="Edit Group"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { setAssigningTeam(team); setAssignForm({ experimentId: '', scheduledDate: '' }); setAssignExpOpen(true); }}
                      className="p-1.5 rounded-lg hover:bg-[#f0f4e8] dark:hover:bg-[#28301f] text-[#87996c] transition"
                      title="Assign Experiment"
                    >
                      <FlaskConical size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(team)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[#87996c] hover:text-red-500 transition"
                      title="Delete Group"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Leader */}
                {team.leaderId && (
                  <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[#f6f8f0] dark:bg-[#1c2117]">
                    <div className="h-6 w-6 rounded-full bg-[#c8a030] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {leaderName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#2e3d19] dark:text-[#eef4e8]">{leaderName}</div>
                      <div className="text-[10px] text-[#c8a030] font-medium">Leader</div>
                    </div>
                  </div>
                )}

                {/* Members Avatars */}
                <div className="flex items-center gap-1.5 mb-4">
                  {visibleMembers.map((memberId, mi) => (
                    <Avatar
                      key={String(memberId?._id || memberId)}
                      name={getMemberName(memberId)}
                      size="sm"
                      colorIdx={mi + 2}
                    />
                  ))}
                  {extraCount > 0 && (
                    <div className="h-7 w-7 rounded-full bg-[#e8efd9] dark:bg-[#28301f] flex items-center justify-center text-xs font-semibold text-[#556b2f]">
                      +{extraCount}
                    </div>
                  )}
                  {memberCount === 0 && (
                    <span className="text-xs text-[#87996c]">No members assigned</span>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-[#e8efd9] dark:border-[#2e3d19] space-y-1.5">
                  {team.currentExperiment ? (
                    <div className="flex items-center gap-1.5 text-xs text-[#71805a] dark:text-[#c5d0b5]">
                      <FlaskConical size={12} className="text-[#556b2f]" />
                      <span className="truncate">{getExperimentName(team.currentExperiment)}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-[#aab89a] italic">No experiment assigned</div>
                  )}
                  {team.scheduledSlot && (
                    <div className="flex items-center gap-1.5 text-xs text-[#87996c]">
                      <Clock size={12} /> {new Date(team.scheduledSlot).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Group">
        <GroupFormContent />
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[#e8efd9] dark:border-[#2e3d19]">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button className="bg-[#556b2f] hover:bg-[#4a5f28] text-white" onClick={handleSaveGroup} disabled={saving || !groupForm.name.trim()}>
            {saving ? 'Creating...' : 'Create Group'}
          </Button>
        </div>
      </Modal>

      {/* Edit Group Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit Group: ${editingTeam?.name}`}>
        <GroupFormContent />
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[#e8efd9] dark:border-[#2e3d19]">
          <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button className="bg-[#556b2f] hover:bg-[#4a5f28] text-white" onClick={handleEditGroup} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      {/* Auto-Generate Modal */}
      <Modal open={autoGenOpen} onClose={() => setAutoGenOpen(false)} title="Auto-Generate Groups">
        <div className="space-y-5">
          {/* Method Selector */}
          <div>
            <label className="block text-xs font-medium text-[#556b2f] mb-2">Generation Method</label>
            <div className="space-y-2">
              {AUTO_METHODS.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    autoForm.method === method.id
                      ? 'border-[#556b2f] bg-[#f0f4e8] dark:bg-[#1c2117]'
                      : 'border-[#cfd8bd] dark:border-[#4e5d35] hover:bg-[#fafbf5]'
                  }`}
                >
                  <div className={`h-4 w-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${autoForm.method === method.id ? 'border-[#556b2f] bg-[#556b2f]' : 'border-[#cfd8bd]'}`}>
                    {autoForm.method === method.id && <div className="h-2 w-2 bg-white rounded-full m-auto mt-0.5" />}
                  </div>
                  <input
                    type="radio"
                    className="hidden"
                    checked={autoForm.method === method.id}
                    onChange={() => setAutoForm((p) => ({ ...p, method: method.id }))}
                  />
                  <div>
                    <div className="text-sm font-semibold text-[#2e3d19] dark:text-[#eef4e8]">{method.label}</div>
                    <div className="text-xs text-[#87996c]">{method.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Students Per Group */}
          <div>
            <label className="block text-xs font-medium text-[#556b2f] mb-1">Students Per Group</label>
            <input
              type="number"
              min="1"
              max="20"
              value={autoForm.perGroup}
              onChange={(e) => setAutoForm((p) => ({ ...p, perGroup: Number(e.target.value) }))}
              className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:text-[#eef4e8]"
            />
          </div>

          {/* Preview */}
          <div className="rounded-xl bg-[#f6f8f0] dark:bg-[#1c2117] p-3">
            <div className="text-xs font-medium text-[#556b2f] mb-2">Preview</div>
            <div className="text-sm text-[#4e5d35] dark:text-[#c5d0b5]">
              {eligibleTeamMembers?.length || 0} students will be divided into{' '}
              <strong className="text-[#556b2f]">{autoGenPreview.length} groups</strong>
              {autoGenPreview.length > 0 && ` (named ${GROUP_NAMES.slice(0, Math.min(autoGenPreview.length, 3)).join(', ')}${autoGenPreview.length > 3 ? ', ...' : ''})`}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#e8efd9] dark:border-[#2e3d19]">
            <Button variant="outline" onClick={() => setAutoGenOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#c8a030] hover:bg-[#b08c28] text-white"
              onClick={handleAutoGenerate}
              disabled={saving || !autoGenPreview.length}
            >
              <Zap size={14} className="mr-1.5" />
              {saving ? 'Generating...' : `Generate ${autoGenPreview.length} Groups`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Experiment Modal */}
      <Modal open={assignExpOpen} onClose={() => setAssignExpOpen(false)} title={`Assign Experiment to ${assigningTeam?.name}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#556b2f] mb-1">Experiment</label>
            <select
              value={assignForm.experimentId}
              onChange={(e) => setAssignForm((p) => ({ ...p, experimentId: e.target.value }))}
              className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:text-[#eef4e8]"
            >
              <option value="">— Select Experiment —</option>
              {(experiments || []).map((exp) => (
                <option key={exp.id || exp._id} value={exp.id || exp._id}>
                  Exp {exp.experimentNumber}: {exp.experimentObject}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#556b2f] mb-1">Scheduled Date & Time</label>
            <input
              type="datetime-local"
              value={assignForm.scheduledDate}
              onChange={(e) => setAssignForm((p) => ({ ...p, scheduledDate: e.target.value }))}
              className="w-full rounded-xl border border-[#cfd8bd] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6f7d45] dark:border-[#4e5d35] dark:bg-[#1a1d16] dark:text-[#eef4e8]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-[#e8efd9] dark:border-[#2e3d19]">
            <Button variant="outline" onClick={() => setAssignExpOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#556b2f] hover:bg-[#4a5f28] text-white"
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
            >
              {saving ? 'Assigning...' : 'Assign Experiment'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Group">
        {deleteConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-[#4e5d35] dark:text-[#c5d0b5]">
              Are you sure you want to delete <strong className="text-[#2e3d19] dark:text-[#eef4e8]">{deleteConfirm.name}</strong>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={async () => {
                  // Teams don't have a deleteTeam action exposed, use updateTeam to archive
                  try {
                    await updateTeam(deleteConfirm._id || deleteConfirm.id, { status: 'archived' });
                    setDeleteConfirm(null);
                    fetchTeams(labId);
                    setToast({ type: 'success', message: 'Group archived' });
                  } catch {
                    setToast({ type: 'error', message: 'Failed to delete group' });
                    setDeleteConfirm(null);
                  }
                }}
              >
                <Trash2 size={14} className="mr-1.5" /> Delete Group
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
