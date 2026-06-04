'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Download, RefreshCw, Users, Archive, GitBranch } from 'lucide-react';
import {
  Resume,
  getResumes,
  getStages,
  getJobRoles,
  deleteResume,
  bulkUpdateStage,
  getExportUrl,
} from '@/lib/api';
import CandidateTable from '@/components/CandidateTable';
import CandidateDrawer from '@/components/CandidateDrawer';

export default function CandidatesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [total, setTotal] = useState(0);
  const [stages, setStages] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStage, setBulkStage] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Resume | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [githubOnly, setGithubOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resumesRes, stagesRes, rolesRes] = await Promise.all([
        getResumes({ search, stage: stageFilter, role: roleFilter, has_github: githubOnly ? 'true' : undefined, limit: 500 }),
        getStages(),
        getJobRoles(),
      ]);
      setResumes(resumesRes.data || []);
      setTotal(resumesRes.total);
      setStages(stagesRes);
      setRoles(rolesRes);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, roleFilter, githubOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: number) => {
    try {
      await deleteResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      if (selectedCandidate?.id === id) setSelectedCandidate(null);
    } catch {
      // table will show nothing — could surface a toast here
    }
  };

  const handleBulkStage = async () => {
    if (!bulkStage || selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      await bulkUpdateStage(selectedIds, bulkStage);
      setResumes((prev) =>
        prev.map((r) => (selectedIds.includes(r.id) ? { ...r, stage: bulkStage } : r))
      );
      setSelectedIds([]);
      setBulkStage('');
    } catch {
      alert('Failed to update stages');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === resumes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(resumes.map((r) => r.id));
    }
  };

  const isArchive = (s: string) => s.toLowerCase() === 'archive';
  const displayedResumes = showArchived
    ? resumes.filter((r) => isArchive(r.stage))
    : resumes.filter((r) => !isArchive(r.stage));

  const exportUrl = getExportUrl({ search, stage: stageFilter, role: roleFilter });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-slate-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Candidates</h1>
              <p className="text-sm text-slate-500">
                {showArchived ? `${displayedResumes.length} archived` : `${total} total${displayedResumes.length !== total ? ` · ${displayedResumes.length} shown` : ''}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            {/* Stage filter */}
            {!showArchived && (
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="py-2 pl-3 pr-8 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All stages</option>
                {stages.filter((s) => !isArchive(s)).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
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
            {/* GitHub filter */}
            <button
              onClick={() => setGithubOnly((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg font-medium transition-colors ${
                githubOnly
                  ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              GitHub
            </button>

            {/* Archived toggle */}
            <button
              onClick={() => { setShowArchived((v) => !v); setStageFilter(''); setSelectedIds([]); }}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg font-medium transition-colors ${
                showArchived
                  ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Archive className="w-4 h-4" />
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
            {/* Export */}
            <a
              href={exportUrl}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </a>
            <button
              onClick={load}
              disabled={loading}
              className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <div className="mt-3 flex items-center gap-3 py-2.5 px-4 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-700">
              {selectedIds.length} selected
            </span>
            <select
              value={bulkStage}
              onChange={(e) => setBulkStage(e.target.value)}
              className="py-1.5 pl-3 pr-8 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Move to stage...</option>
              {stages.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={handleBulkStage}
              disabled={!bulkStage || bulkLoading}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {bulkLoading ? 'Moving...' : 'Apply'}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        {loading && resumes.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400 text-sm">Loading candidates...</div>
          </div>
        ) : (
          <CandidateTable
            resumes={displayedResumes}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onRowClick={setSelectedCandidate}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Drawer */}
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
