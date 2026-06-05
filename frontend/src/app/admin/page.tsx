'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2, RefreshCw, Archive, Plus, GripVertical, ShieldAlert,
  UserCheck, UserX, Shield, ShieldOff,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  getArchivedResumes, permanentDeleteResume, Resume,
  getStages, createStage, deleteStage, reorderStages,
  getJobRoles, createJobRole, deleteJobRole,
  getUsers, updateUserApproved, updateUserRole, AdminUser,
} from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { candidateName, formatDate, roleColor, stageColor } from '@/lib/utils';

type Tab = 'archived' | 'stages' | 'roles' | 'users';


export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('archived');
  const [mounted, setMounted] = useState(false);

  // Archived
  const [archived, setArchived] = useState<Resume[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Stages
  const [stages, setStages] = useState<string[]>([]);
  const [stagesLoading, setStagesLoading] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [addingStage, setAddingStage] = useState(false);
  const [stageError, setStageError] = useState('');

  // Roles
  const [roles, setRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [addingRole, setAddingRole] = useState(false);
  const [roleError, setRoleError] = useState('');

  // Users
  const [appUsers, setAppUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') router.replace('/');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (tab === 'archived') loadArchived();
    else if (tab === 'stages') loadStages();
    else if (tab === 'roles') loadRoles();
    else if (tab === 'users') loadUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadArchived = async () => {
    setArchivedLoading(true);
    try { setArchived(await getArchivedResumes()); } finally { setArchivedLoading(false); }
  };
  const loadStages = async () => {
    setStagesLoading(true);
    try { setStages(await getStages()); } finally { setStagesLoading(false); }
  };
  const loadRoles = async () => {
    setRolesLoading(true);
    try { setRoles(await getJobRoles()); } finally { setRolesLoading(false); }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try { setAppUsers(await getUsers()); } finally { setUsersLoading(false); }
  };

  const handlePermanentDelete = async (candidate: Resume) => {
    if (!confirm(`Permanently delete ${candidateName(candidate)}? This cannot be undone.`)) return;
    setDeletingId(candidate.id);
    try {
      await permanentDeleteResume(candidate.id);
      setArchived((prev) => prev.filter((r) => r.id !== candidate.id));
    } catch (err) { alert(err instanceof Error ? err.message : 'Delete failed'); }
    finally { setDeletingId(null); }
  };

  const handleAddStage = async () => {
    if (!newStage.trim()) return;
    if (newStage.trim().toLowerCase() === 'archive') { setStageError('"Archive" is reserved'); return; }
    if (stages.includes(newStage.trim())) { setStageError('Stage already exists'); return; }
    setAddingStage(true); setStageError('');
    try {
      await createStage(newStage.trim());
      setStages((prev) => [...prev, newStage.trim()]);
      setNewStage('');
    } catch (err) { setStageError(err instanceof Error ? err.message : 'Failed'); }
    finally { setAddingStage(false); }
  };

  const handleDeleteStage = async (name: string) => {
    if (!confirm(`Delete stage "${name}"?`)) return;
    try { await deleteStage(name); setStages((prev) => prev.filter((s) => s !== name)); }
    catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleStageDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const nonArchive = stages.filter((s) => s.toLowerCase() !== 'archive');
    const reordered = Array.from(nonArchive);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const prev = stages;
    setStages(reordered);
    try { await reorderStages(reordered); } catch { setStages(prev); }
  };

  const handleAddRole = async () => {
    if (!newRole.trim()) return;
    if (roles.includes(newRole.trim())) { setRoleError('Role already exists'); return; }
    setAddingRole(true); setRoleError('');
    try {
      await createJobRole(newRole.trim());
      setRoles((prev) => [...prev, newRole.trim()]);
      setNewRole('');
    } catch (err) { setRoleError(err instanceof Error ? err.message : 'Failed'); }
    finally { setAddingRole(false); }
  };

  const handleDeleteRole = async (name: string) => {
    if (!confirm(`Delete role "${name}"?`)) return;
    try { await deleteJobRole(name); setRoles((prev) => prev.filter((r) => r !== name)); }
    catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
  };

  if (authLoading) return null;

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
        <ShieldAlert className="w-10 h-10 text-slate-300" />
        <p className="text-sm font-medium">Access restricted</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'archived', label: 'Archived Candidates' },
    { id: 'stages', label: 'Pipeline Stages' },
    { id: 'roles', label: 'Job Roles' },
    { id: 'users', label: 'User Access' },
  ];

  const handleToggleApproved = async (u: AdminUser) => {
    if (u.is_super_admin && u.approved) return;
    try {
      await updateUserApproved(u.id, !u.approved);
      setAppUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, approved: !u.approved } : x));
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleToggleRole = async (u: AdminUser) => {
    if (u.is_super_admin) return;
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      await updateUserRole(u.id, newRole);
      setAppUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, role: newRole } : x));
    } catch (err) { alert(err instanceof Error ? err.message : 'Failed'); }
  };

  const refresh = () => {
    if (tab === 'archived') loadArchived();
    else if (tab === 'stages') loadStages();
    else if (tab === 'roles') loadRoles();
    else if (tab === 'users') loadUsers();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-slate-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin</h1>
              <p className="text-sm text-slate-500">Manage archived candidates, pipeline stages, and job roles</p>
            </div>
          </div>
          <button onClick={refresh} className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-1 mt-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">

          {/* Archived Candidates */}
          {tab === 'archived' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">Archived</h2>
                {!archivedLoading && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {archived.length} candidate{archived.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {archivedLoading ? (
                <div className="px-6 py-10 text-center text-sm text-slate-400">Loading...</div>
              ) : archived.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-400">Archive is empty.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {archived.map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm text-slate-900">{candidateName(candidate)}</span>
                          {candidate.role && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(candidate.role)}`}>{candidate.role}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {candidate.email && <span className="text-xs text-slate-400">{candidate.email}</span>}
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">Uploaded {formatDate(candidate.uploaded_time)}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-400">ID #{candidate.id}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handlePermanentDelete(candidate)}
                        disabled={deletingId === candidate.id}
                        className="ml-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingId === candidate.id ? 'Deleting...' : 'Delete permanently'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pipeline Stages */}
          {tab === 'stages' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-slate-800">Pipeline Stages</h2>
                <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
                  {stages.filter((s) => s.toLowerCase() !== 'archive').length}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">Stages appear in this order on the Kanban board. Drag to reorder.</p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newStage}
                  onChange={(e) => { setNewStage(e.target.value); setStageError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                  placeholder="New stage name..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddStage}
                  disabled={addingStage || !newStage.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              {stageError && <p className="text-xs text-red-500 mb-3">{stageError}</p>}

              {stagesLoading ? (
                <div className="text-sm text-slate-400 py-4">Loading...</div>
              ) : stages.filter((s) => s.toLowerCase() !== 'archive').length === 0 ? (
                <div className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-200 rounded-lg">No stages yet.</div>
              ) : !mounted ? (
                <div className="space-y-2">
                  {stages.filter((s) => s.toLowerCase() !== 'archive').map((stage) => (
                    <div key={stage} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-slate-300" />
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${stageColor(stage)}`}>{stage}</span>
                      </div>
                      <button onClick={() => handleDeleteStage(stage)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <DragDropContext onDragEnd={handleStageDragEnd}>
                  <Droppable droppableId="admin-stages">
                    {(provided) => (
                      <div className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
                        {stages.filter((s) => s.toLowerCase() !== 'archive').map((stage, index) => (
                          <Draggable key={stage} draggableId={stage} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200 ${snapshot.isDragging ? 'shadow-md opacity-90' : ''}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${stageColor(stage)}`}>{stage}</span>
                                </div>
                                <button onClick={() => handleDeleteStage(stage)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          )}

          {/* Job Roles */}
          {tab === 'roles' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-semibold text-slate-800">Job Roles</h2>
                <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">{roles.length}</span>
              </div>
              <p className="text-sm text-slate-500 mb-4">Define the roles you are hiring for.</p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => { setNewRole(e.target.value); setRoleError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                  placeholder="New job role..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddRole}
                  disabled={addingRole || !newRole.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              {roleError && <p className="text-xs text-red-500 mb-3">{roleError}</p>}

              {rolesLoading ? (
                <div className="text-sm text-slate-400 py-4">Loading...</div>
              ) : roles.length === 0 ? (
                <div className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-200 rounded-lg">No roles yet.</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <div key={role} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${roleColor(role)}`}>{role}</span>
                      <button onClick={() => handleDeleteRole(role)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users */}
          {tab === 'users' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">User Access</h2>
                {!usersLoading && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                    {appUsers.length} user{appUsers.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {usersLoading ? (
                <div className="px-6 py-10 text-center text-sm text-slate-400">Loading...</div>
              ) : appUsers.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-slate-400">No users found.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {appUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {u.picture ? (
                          <img src={u.picture} alt={u.name} className="w-8 h-8 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-semibold">{u.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 truncate">{u.name}</span>
                            {u.is_super_admin && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium flex-shrink-0">superadmin</span>
                            )}
                            {u.role === 'admin' && !u.is_super_admin && (
                              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium flex-shrink-0">admin</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {/* Role toggle */}
                        {!u.is_super_admin && (
                          <button
                            onClick={() => handleToggleRole(u)}
                            title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                            className={`p-1.5 rounded transition-colors ${u.role === 'admin' ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`}
                          >
                            {u.role === 'admin' ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                          </button>
                        )}
                        {/* Approve/revoke toggle */}
                        {!u.is_super_admin && (
                          <button
                            onClick={() => handleToggleApproved(u)}
                            title={u.approved ? 'Revoke access' : 'Approve access'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              u.approved
                                ? 'text-red-600 bg-red-50 border border-red-200 hover:bg-red-100'
                                : 'text-green-600 bg-green-50 border border-green-200 hover:bg-green-100'
                            }`}
                          >
                            {u.approved ? (
                              <><UserX className="w-3.5 h-3.5" /> Revoke</>
                            ) : (
                              <><UserCheck className="w-3.5 h-3.5" /> Approve</>
                            )}
                          </button>
                        )}
                        {u.is_super_admin && (
                          <span className="text-xs text-slate-400 italic">Protected</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
