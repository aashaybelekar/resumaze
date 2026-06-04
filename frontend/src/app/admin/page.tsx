'use client';

import { useEffect, useState } from 'react';
import { Trash2, RefreshCw, Archive, AlertTriangle } from 'lucide-react';
import { getArchivedResumes, permanentDeleteResume, Resume } from '@/lib/api';
import { candidateName, formatDate, roleColor } from '@/lib/utils';

export default function AdminPage() {
  const [archived, setArchived] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getArchivedResumes();
      setArchived(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load archived candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePermanentDelete = async (candidate: Resume) => {
    if (
      !confirm(
        `Permanently delete ${candidateName(candidate)}? This cannot be undone — the record and Drive file will be gone forever.`
      )
    )
      return;

    setDeletingId(candidate.id);
    try {
      await permanentDeleteResume(candidate.id);
      setArchived((prev) => prev.filter((r) => r.id !== candidate.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Archive className="w-5 h-5 text-slate-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Admin — Archived Candidates</h1>
              <p className="text-sm text-slate-500">
                Candidates moved here when deleted from the pipeline. Permanently delete to remove from DB and Drive.
              </p>
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
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Archived</h2>
              {!loading && (
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {archived.length} candidate{archived.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loading ? (
              <div className="px-6 py-10 text-center text-sm text-slate-400">Loading...</div>
            ) : archived.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-400">
                No archived candidates. The archive is empty.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {archived.map((candidate) => (
                  <div key={candidate.id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm text-slate-900">
                          {candidateName(candidate)}
                        </span>
                        {candidate.role && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(candidate.role)}`}>
                            {candidate.role}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {candidate.email && (
                          <span className="text-xs text-slate-400">{candidate.email}</span>
                        )}
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">
                          Uploaded {formatDate(candidate.uploaded_time)}
                        </span>
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
        </div>
      </div>
    </div>
  );
}
