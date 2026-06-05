'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  Copy,
  Mail,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  getStages,
  createStage,
  deleteStage,
  reorderStages,
  getJobRoles,
  createJobRole,
  deleteJobRole,
  getDuplicates,
  DuplicateGroup,
} from '@/lib/api';
import { candidateName, stageColor, roleColor } from '@/lib/utils';

export default function SettingsPage() {
  const [stages, setStages] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [newStage, setNewStage] = useState('');
  const [addingStage, setAddingStage] = useState(false);

  const [newRole, setNewRole] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  const [stageError, setStageError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [mounted, setMounted] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r, d] = await Promise.all([getStages(), getJobRoles(), getDuplicates()]);
      setStages(s);
      setRoles(r);
      setDuplicates(d);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    load();
  }, []);

  const handleAddStage = async () => {
    if (!newStage.trim()) return;
    if (newStage.trim().toLowerCase() === 'archive') {
      setStageError('"Archive" is a reserved system stage');
      return;
    }
    if (stages.includes(newStage.trim())) {
      setStageError('Stage already exists');
      return;
    }
    setAddingStage(true);
    setStageError('');
    try {
      await createStage(newStage.trim());
      setStages((prev) => [...prev, newStage.trim()]);
      setNewStage('');
    } catch (err) {
      setStageError(err instanceof Error ? err.message : 'Failed to create stage');
    } finally {
      setAddingStage(false);
    }
  };

  const handleDeleteStage = async (name: string) => {
    if (!confirm(`Delete stage "${name}"? Candidates in this stage will remain but stage will be removed.`)) return;
    try {
      await deleteStage(name);
      setStages((prev) => prev.filter((s) => s !== name));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete stage');
    }
  };

  const handleStageDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const nonArchive = stages.filter((s) => s.toLowerCase() !== 'archive');
    const reordered = Array.from(nonArchive);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setStages(reordered);
    try {
      await reorderStages(reordered);
    } catch {
      setStages(stages);
    }
  };

  const handleAddRole = async () => {
    if (!newRole.trim()) return;
    if (roles.includes(newRole.trim())) {
      setRoleError('Role already exists');
      return;
    }
    setAddingRole(true);
    setRoleError('');
    try {
      await createJobRole(newRole.trim());
      setRoles((prev) => [...prev, newRole.trim()]);
      setNewRole('');
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setAddingRole(false);
    }
  };

  const handleDeleteRole = async (name: string) => {
    if (!confirm(`Delete role "${name}"?`)) return;
    try {
      await deleteJobRole(name);
      setRoles((prev) => prev.filter((r) => r !== name));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-slate-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Settings</h1>
              <p className="text-sm text-slate-500">Manage pipeline stages, job roles, and system configuration</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Stages */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold text-slate-800">Pipeline Stages</h2>
              <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {stages.filter((s) => s.toLowerCase() !== 'archive').length}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Define the stages candidates move through in your hiring pipeline. Order matters — stages appear in this order on the Kanban board.
            </p>

            {/* Add stage */}
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
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {stageError && <p className="text-xs text-red-500 mb-3">{stageError}</p>}

            {/* Stage list */}
            {loading ? (
              <div className="text-sm text-slate-400 py-4">Loading...</div>
            ) : stages.length === 0 ? (
              <div className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-200 rounded-lg">
                No stages yet. Add your first stage above.
              </div>
            ) : !mounted ? (
              <div className="space-y-2">
                {stages.filter((s) => s.toLowerCase() !== 'archive').map((stage) => (
                  <div key={stage} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-slate-300" />
                      <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium border ${stageColor(stage)}`}>{stage}</span>
                    </div>
                    <button onClick={() => handleDeleteStage(stage)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            ) : (
              <DragDropContext onDragEnd={handleStageDragEnd}>
                <Droppable droppableId="stages">
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
                                <span
                                  className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium border ${stageColor(stage)}`}
                                >
                                  {stage}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteStage(stage)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
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

          {/* Job Roles */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold text-slate-800">Job Roles</h2>
              <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {roles.length}
              </span>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Define the job roles you are hiring for. Roles are assigned when uploading resumes.
            </p>

            {/* Add role */}
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
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {roleError && <p className="text-xs text-red-500 mb-3">{roleError}</p>}

            {/* Role list */}
            {loading ? (
              <div className="text-sm text-slate-400 py-4">Loading...</div>
            ) : roles.length === 0 ? (
              <div className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-200 rounded-lg">
                No roles yet. Add your first role above.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {roles.map((role) => (
                  <div
                    key={role}
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${roleColor(role)}`}>
                      {role}
                    </span>
                    <button
                      onClick={() => handleDeleteRole(role)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Duplicates */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Copy className="w-4 h-4 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-800">Duplicate Candidates</h2>
              {duplicates.length > 0 && (
                <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {duplicates.reduce((n, g) => n + g.candidates.length, 0)} candidates · {duplicates.length} group{duplicates.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Candidates that appear to be duplicates based on email address.
            </p>

            {loading ? (
              <div className="text-sm text-slate-400 py-4">Loading...</div>
            ) : duplicates.length === 0 ? (
              <div className="text-sm text-green-600 py-4 text-center bg-green-50 rounded-lg border border-green-200">
                No duplicates found. Your candidate pool looks clean!
              </div>
            ) : (
              <div className="space-y-4">
                {duplicates.map((group, gi) => (
                  <div key={gi} className="border border-yellow-200 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200">
                      <Mail className="w-3.5 h-3.5 text-yellow-600" />
                      <span className="text-xs font-medium text-yellow-800">{group.match_value}</span>
                      <span className="ml-auto text-xs text-yellow-600">{group.candidates.length} entries</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {group.candidates.map((dup) => (
                        <div key={dup.id} className="flex items-center justify-between px-4 py-3 bg-white">
                          <div>
                            <div className="font-medium text-sm text-slate-900">{candidateName(dup)}</div>
                            <div className="text-xs text-slate-400 mt-0.5">ID #{dup.id}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {dup.stage && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${stageColor(dup.stage)}`}>
                                {dup.stage}
                              </span>
                            )}
                            {dup.role && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor(dup.role)}`}>
                                {dup.role}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
