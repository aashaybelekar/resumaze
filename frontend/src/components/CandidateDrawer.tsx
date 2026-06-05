'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Mail,
  Phone,
  GitBranch,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Calendar,
  User,
  FileText,
  Pencil,
  Save,
  XCircle,
  ClipboardList,
  MessageSquare,
} from 'lucide-react';
import { Resume, updateResume, updateResumeStage, updateResumeRole } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { stageColor, roleColor, formatDate } from '@/lib/utils';
import InterviewsPanel from './candidate/InterviewsPanel';
import NotesPanel from './candidate/NotesPanel';

interface CandidateDrawerProps {
  candidate: Resume | null;
  stages: string[];
  roles: string[];
  onClose: () => void;
  onUpdate: (updated: Resume) => void;
}

type Tab = 'overview' | 'interviews' | 'notes';

export default function CandidateDrawer({ candidate, stages, roles, onClose, onUpdate }: CandidateDrawerProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    current_ctc: '',
    expected_ctc: '',
    stage: '',
    role: '',
  });

  useEffect(() => {
    if (!candidate) return;
    setTab('overview');
    setEditMode(false);
  }, [candidate]);

  const enterEditMode = () => {
    if (!candidate) return;
    setEditForm({
      first_name: candidate.first_name,
      middle_name: candidate.middle_name || '',
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone,
      current_ctc: candidate.current_ctc || '',
      expected_ctc: candidate.expected_ctc || '',
      stage: candidate.stage,
      role: candidate.role,
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!candidate) return;
    setSaving(true);
    try {
      const promises: Promise<void>[] = [
        updateResume(candidate.id, {
          first_name: editForm.first_name,
          middle_name: editForm.middle_name,
          last_name: editForm.last_name,
          email: editForm.email,
          phone: editForm.phone,
          current_ctc: editForm.current_ctc,
          expected_ctc: editForm.expected_ctc,
        }),
      ];
      if (editForm.stage !== candidate.stage) promises.push(updateResumeStage(candidate.id, editForm.stage));
      if (editForm.role !== candidate.role) promises.push(updateResumeRole(candidate.id, editForm.role));
      await Promise.all(promises);
      onUpdate({ ...candidate, ...editForm });
      setEditMode(false);
    } catch {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (!candidate) return null;

  const fullName = `${candidate.first_name} ${candidate.last_name}`.trim();
  const driveUrl = candidate.drive_file_id
    ? `https://drive.google.com/file/d/${candidate.drive_file_id}/view`
    : null;

  const inputCls = 'w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[560px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 truncate">{fullName}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${stageColor(candidate.stage)}`}>
                {candidate.stage}
              </span>
              {candidate.role && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor(candidate.role)}`}>
                  {candidate.role}
                </span>
              )}
              {candidate.has_github && (
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <GitBranch className="w-3.5 h-3.5" />
                  GitHub
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
                title="Open resume in Google Drive"
              >
                <FileText className="w-3.5 h-3.5" />
                Resume
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {!editMode ? (
              <button
                onClick={enterEditMode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(['overview', 'interviews', 'notes'] as Tab[]).map((t) => {
            const icons = { overview: FileText, interviews: ClipboardList, notes: MessageSquare };
            const Icon = icons[t];
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 capitalize ${
                  tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'overview' && (
            <div className="p-6 space-y-5">
              {editMode ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
                      <input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Middle Name</label>
                      <input type="text" value={editForm.middle_name} onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })} className={inputCls} placeholder="Optional" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
                      <input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Current CTC</label>
                      <input type="text" value={editForm.current_ctc} onChange={(e) => setEditForm({ ...editForm, current_ctc: e.target.value })} className={inputCls} placeholder="e.g. 12 LPA" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Expected CTC</label>
                      <input type="text" value={editForm.expected_ctc} onChange={(e) => setEditForm({ ...editForm, expected_ctc: e.target.value })} className={inputCls} placeholder="e.g. 18 LPA" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
                      <select value={editForm.stage} onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })} className={inputCls}>
                        {stages.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                      <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className={inputCls}>
                        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3">
                    {candidate.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline truncate">{candidate.email}</a>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-700">{candidate.phone}</span>
                      </div>
                    )}
                    {candidate.github_url && (
                      <div className="flex items-center gap-3 text-sm">
                        <GitBranch className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{candidate.github_url}</a>
                      </div>
                    )}
                    {candidate.linkedin_url && (
                      <div className="flex items-center gap-3 text-sm">
                        <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{candidate.linkedin_url}</a>
                      </div>
                    )}
                  </div>

                  {(candidate.experience_years || candidate.education) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          Experience
                        </div>
                        <div className="font-semibold text-slate-900">
                          {candidate.experience_years && candidate.experience_years > 0 ? `${candidate.experience_years} years` : 'Not specified'}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          Education
                        </div>
                        <div className="font-semibold text-slate-900 text-sm truncate">{candidate.education || 'Not specified'}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-slate-500 text-xs mb-1">Current CTC</div>
                      <div className="font-semibold text-slate-900 text-sm">{candidate.current_ctc || 'Not specified'}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="text-slate-500 text-xs mb-1">Expected CTC</div>
                      <div className="font-semibold text-slate-900 text-sm">{candidate.expected_ctc || 'Not specified'}</div>
                    </div>
                  </div>

                  {candidate.summary && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{candidate.summary}</p>
                    </div>
                  )}

                  {candidate.skills && candidate.skills.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.skills.map((skill) => (
                          <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">{skill}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      <span>File: {candidate.drive_file_name}</span>
                    </div>
                    {driveUrl && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                        <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                          Open in Google Drive
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Added: {formatDate(candidate.uploaded_time)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'interviews' && <InterviewsPanel candidate={candidate} user={user} />}
          {tab === 'notes' && <NotesPanel candidate={candidate} user={user} />}
        </div>
      </div>
    </>
  );
}
