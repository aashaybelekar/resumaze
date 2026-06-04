'use client';

import { useState } from 'react';
import { GitBranch, Trash2, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { Resume } from '@/lib/api';
import { stageColor, roleColor, candidateName, formatDate } from '@/lib/utils';
import ConfirmDialog from './ConfirmDialog';

type SortField = 'name' | 'email' | 'role' | 'stage' | 'experience_years' | 'uploaded_time';
type SortDir = 'asc' | 'desc';

interface CandidateTableProps {
  resumes: Resume[];
  selectedIds: number[];
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onRowClick: (resume: Resume) => void;
  onDelete: (id: number) => void;
}

export default function CandidateTable({
  resumes,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  onDelete,
}: CandidateTableProps) {
  const [sortField, setSortField] = useState<SortField>('uploaded_time');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...resumes].sort((a, b) => {
    let av: string | number = '';
    let bv: string | number = '';
    if (sortField === 'name') {
      av = candidateName(a);
      bv = candidateName(b);
    } else if (sortField === 'experience_years') {
      av = a.experience_years;
      bv = b.experience_years;
    } else if (sortField === 'uploaded_time') {
      av = a.uploaded_time;
      bv = b.uploaded_time;
    } else {
      av = a[sortField as keyof Resume] as string || '';
      bv = b[sortField as keyof Resume] as string || '';
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
      : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  const allSelected = resumes.length > 0 && selectedIds.length === resumes.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < resumes.length;

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={onToggleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              {[
                { label: 'Name', field: 'name' as SortField },
                { label: 'Email / Phone', field: 'email' as SortField },
                { label: 'Role', field: 'role' as SortField },
                { label: 'Stage', field: 'stage' as SortField },
                { label: 'Exp.', field: 'experience_years' as SortField },
                { label: 'Added', field: 'uploaded_time' as SortField },
                { label: '', field: null },
              ].map(({ label, field }) => (
                <th
                  key={label}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap ${
                    field ? 'cursor-pointer hover:text-slate-900 select-none' : ''
                  }`}
                  onClick={() => field && handleSort(field)}
                >
                  <div className="flex items-center gap-1.5">
                    {label}
                    {field && <SortIcon field={field} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {sorted.map((resume) => {
              const name = candidateName(resume);
              const selected = selectedIds.includes(resume.id);
              return (
                <tr
                  key={resume.id}
                  onClick={() => onRowClick(resume)}
                  className={`cursor-pointer transition-colors ${
                    selected ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Checkbox — stopPropagation on click so row click doesn't fire */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(resume.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-900">{name}</span>
                      {resume.github_url && (
                        <a
                          href={resume.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-slate-400 hover:text-slate-900"
                          title="GitHub"
                        >
                          <GitBranch className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <span className="truncate block text-slate-600">{resume.email || '—'}</span>
                    {resume.phone && (
                      <span className="text-xs text-slate-400">{resume.phone}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {resume.role ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(resume.role)}`}>
                        {resume.role}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {resume.stage ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${stageColor(resume.stage)}`}>
                        {resume.stage}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {resume.experience_years > 0 ? `${resume.experience_years}y` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(resume.uploaded_time)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(resume);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                  No candidates found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete candidate"
          message={`Remove ${candidateName(deleteTarget)} from the pipeline? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            onDelete(deleteTarget.id);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
