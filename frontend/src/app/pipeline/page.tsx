'use client';

import { useEffect, useState, useCallback } from 'react';
import { DropResult } from '@hello-pangea/dnd';
import { Search, RefreshCw } from 'lucide-react';
import { Resume, getResumes, getStages, getJobRoles, updateResumeStage } from '@/lib/api';
import KanbanBoard from '@/components/KanbanBoard';
import CandidateDrawer from '@/components/CandidateDrawer';

export default function PipelinePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [stages, setStages] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Resume | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resumesRes, stagesRes, rolesRes] = await Promise.all([
        getResumes({ search, role: roleFilter, limit: 500 }),
        getStages(),
        getJobRoles(),
      ]);
      setResumes(resumesRes.data || []);
      setStages(stagesRes);
      setRoles(rolesRes);
    } catch (err) {
      console.error('Failed to load pipeline:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const isArchive = (s: string) => s.toLowerCase() === 'archive';

  const visibleResumes = resumes.filter((r) => !isArchive(r.stage));
  const resumesByStage: Record<string, Resume[]> = {};
  stages.filter((s) => !isArchive(s)).forEach((s) => {
    resumesByStage[s] = visibleResumes.filter((r) => r.stage === s);
  });
  // Candidates with unknown (non-archive) stage
  const unknownStages = visibleResumes
    .filter((r) => !stages.includes(r.stage))
    .reduce<Record<string, Resume[]>>((acc, r) => {
      acc[r.stage] = acc[r.stage] || [];
      acc[r.stage].push(r);
      return acc;
    }, {});
  const allStages = [
    ...stages.filter((s) => !isArchive(s)),
    ...Object.keys(unknownStages).filter((s) => !stages.includes(s)),
  ];
  Object.entries(unknownStages).forEach(([s, rs]) => {
    resumesByStage[s] = rs;
  });

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const resumeId = parseInt(draggableId);
    const newStage = destination.droppableId;

    const resume = resumes.find((r) => r.id === resumeId);
    if (!resume || resume.stage === newStage) return;

    // Optimistic update
    setResumes((prev) =>
      prev.map((r) => (r.id === resumeId ? { ...r, stage: newStage } : r))
    );
    // Update selected candidate if it's the one being moved
    setSelectedCandidate((prev) => prev?.id === resumeId ? { ...prev, stage: newStage } : prev);

    try {
      await updateResumeStage(resumeId, newStage);
    } catch {
      // Revert on error
      setResumes((prev) =>
        prev.map((r) => (r.id === resumeId ? { ...r, stage: resume.stage } : r))
      );
    }
  };

  const totalCount = visibleResumes.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {totalCount} candidate{totalCount !== 1 ? 's' : ''} across {allStages.length} stage{allStages.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-6">
        {loading && resumes.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400 text-sm">Loading pipeline...</div>
          </div>
        ) : allStages.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-slate-500 text-sm">No stages configured.</p>
              <p className="text-slate-400 text-xs mt-1">Go to Settings to create stages.</p>
            </div>
          </div>
        ) : (
          <KanbanBoard
            stages={allStages}
            resumesByStage={resumesByStage}
            onDragEnd={handleDragEnd}
            onCardClick={setSelectedCandidate}
          />
        )}
      </div>

      {/* Candidate drawer */}
      {selectedCandidate && (
        <CandidateDrawer
          candidate={selectedCandidate}
          stages={stages}
          roles={roles}
          onClose={() => setSelectedCandidate(null)}
          onUpdate={(updated) => {
            setResumes((prev) => prev.map((r) => r.id === updated.id ? updated : r));
            setSelectedCandidate(updated);
          }}
        />
      )}
    </div>
  );
}
