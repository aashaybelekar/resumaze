'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Link,
  Trash2,
  Plus,
  MessageSquare,
  ClipboardList,
  FileText,
  Pencil,
  Save,
  XCircle,
} from 'lucide-react';
import {
  Resume,
  Interview,
  Note,
  getInterviews,
  createInterview,
  deleteInterview,
  getNotes,
  createNote,
  deleteNote,
  updateResume,
  updateResumeStage,
  updateResumeRole,
} from '@/lib/api';
import { stageColor, roleColor, formatDate, outcomeColor } from '@/lib/utils';

interface CandidateDrawerProps {
  candidate: Resume | null;
  stages: string[];
  roles: string[];
  onClose: () => void;
  onUpdate: (updated: Resume) => void;
}

type Tab = 'overview' | 'interviews' | 'notes';

export default function CandidateDrawer({ candidate, stages, roles, onClose, onUpdate }: CandidateDrawerProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    phone: '',
    stage: '',
    role: '',
  });

  // Interview form
  const [newInterview, setNewInterview] = useState({
    interviewer: '',
    interview_date: '',
    meeting_link: '',
    feedback: '',
    outcome: '',
  });
  const [addingInterview, setAddingInterview] = useState(false);
  const [showInterviewForm, setShowInterviewForm] = useState(false);

  // Note form
  const [noteContent, setNoteContent] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const loadInterviews = useCallback(async () => {
    if (!candidate) return;
    setLoadingInterviews(true);
    try {
      const data = await getInterviews(candidate.id);
      setInterviews(data);
    } catch {
      // ignore
    } finally {
      setLoadingInterviews(false);
    }
  }, [candidate]);

  const loadNotes = useCallback(async () => {
    if (!candidate) return;
    setLoadingNotes(true);
    try {
      const data = await getNotes(candidate.id);
      setNotes(data);
    } catch {
      // ignore
    } finally {
      setLoadingNotes(false);
    }
  }, [candidate]);

  useEffect(() => {
    if (!candidate) return;
    setTab('overview');
    setEditMode(false);
    setInterviews([]);
    setNotes([]);
    setShowInterviewForm(false);
    setNoteContent('');
    setNoteAuthor('');
  }, [candidate]);

  useEffect(() => {
    if (tab === 'interviews') loadInterviews();
    if (tab === 'notes') loadNotes();
  }, [tab, loadInterviews, loadNotes]);

  const enterEditMode = () => {
    if (!candidate) return;
    setEditForm({
      first_name: candidate.first_name,
      middle_name: candidate.middle_name || '',
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone,
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
        }),
      ];
      if (editForm.stage !== candidate.stage) {
        promises.push(updateResumeStage(candidate.id, editForm.stage));
      }
      if (editForm.role !== candidate.role) {
        promises.push(updateResumeRole(candidate.id, editForm.role));
      }
      await Promise.all(promises);
      onUpdate({
        ...candidate,
        first_name: editForm.first_name,
        middle_name: editForm.middle_name,
        last_name: editForm.last_name,
        email: editForm.email,
        phone: editForm.phone,
        stage: editForm.stage,
        role: editForm.role,
      });
      setEditMode(false);
    } catch {
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInterview = async () => {
    if (!candidate || !newInterview.interviewer) return;
    setAddingInterview(true);
    try {
      await createInterview(candidate.id, newInterview);
      setNewInterview({ interviewer: '', interview_date: '', meeting_link: '', feedback: '', outcome: '' });
      setShowInterviewForm(false);
      await loadInterviews();
    } catch {
      // ignore
    } finally {
      setAddingInterview(false);
    }
  };

  const handleDeleteInterview = async (id: number) => {
    if (!confirm('Delete this interview?')) return;
    try {
      await deleteInterview(id);
      setInterviews((prev) => prev.filter((i) => i.id !== id));
    } catch {
      // ignore
    }
  };

  const handleAddNote = async () => {
    if (!candidate || !noteContent.trim()) return;
    setAddingNote(true);
    try {
      const n = await createNote(candidate.id, { content: noteContent, created_by: noteAuthor || 'Anonymous' });
      setNotes((prev) => [n, ...prev]);
      setNoteContent('');
      setNoteAuthor('');
    } catch {
      // ignore
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    if (!confirm('Delete this note?')) return;
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // ignore
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
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer */}
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50 transition-colors"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
            >
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
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                  tab === t
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
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
                /* Edit form */
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">First Name</label>
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Middle Name</label>
                      <input
                        type="text"
                        value={editForm.middle_name}
                        onChange={(e) => setEditForm({ ...editForm, middle_name: e.target.value })}
                        className={inputCls}
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
                      <select
                        value={editForm.stage}
                        onChange={(e) => setEditForm({ ...editForm, stage: e.target.value })}
                        className={inputCls}
                      >
                        {stages.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        className={inputCls}
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* View mode */
                <>
                  {/* Contact info */}
                  <div className="grid grid-cols-1 gap-3">
                    {candidate.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <a href={`mailto:${candidate.email}`} className="text-blue-600 hover:underline truncate">
                          {candidate.email}
                        </a>
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
                        <a href={candidate.github_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                          {candidate.github_url}
                        </a>
                      </div>
                    )}
                    {candidate.linkedin_url && (
                      <div className="flex items-center gap-3 text-sm">
                        <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                          {candidate.linkedin_url}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {(candidate.experience_years || candidate.education) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                          <Briefcase className="w-3.5 h-3.5" />
                          Experience
                        </div>
                        <div className="font-semibold text-slate-900">
                          {candidate.experience_years && candidate.experience_years > 0
                            ? `${candidate.experience_years} years`
                            : 'Not specified'}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                          <GraduationCap className="w-3.5 h-3.5" />
                          Education
                        </div>
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          {candidate.education || 'Not specified'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Summary */}
                  {candidate.summary && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Summary</h3>
                      <p className="text-sm text-slate-700 leading-relaxed">{candidate.summary}</p>
                    </div>
                  )}

                  {/* Skills */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Skills</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md font-medium"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="border-t border-slate-100 pt-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User className="w-3.5 h-3.5" />
                      <span>File: {candidate.drive_file_name}</span>
                    </div>
                    {driveUrl && (
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                        <a
                          href={driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline flex items-center gap-1"
                        >
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

          {tab === 'interviews' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">
                  {interviews.length} Interview{interviews.length !== 1 ? 's' : ''}
                </h3>
                <button
                  onClick={() => setShowInterviewForm(!showInterviewForm)}
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Interview
                </button>
              </div>

              {showInterviewForm && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700">New Interview</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Interviewer *</label>
                      <input
                        type="text"
                        value={newInterview.interviewer}
                        onChange={(e) => setNewInterview({ ...newInterview, interviewer: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Interviewer name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                      <input
                        type="datetime-local"
                        value={newInterview.interview_date}
                        onChange={(e) => setNewInterview({ ...newInterview, interview_date: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Meeting Link</label>
                    <input
                      type="url"
                      value={newInterview.meeting_link}
                      onChange={(e) => setNewInterview({ ...newInterview, meeting_link: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Outcome</label>
                    <select
                      value={newInterview.outcome}
                      onChange={(e) => setNewInterview({ ...newInterview, outcome: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select outcome</option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                      <option value="Pending">Pending</option>
                      <option value="No Show">No Show</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Feedback</label>
                    <textarea
                      value={newInterview.feedback}
                      onChange={(e) => setNewInterview({ ...newInterview, feedback: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Interview feedback..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddInterview}
                      disabled={addingInterview || !newInterview.interviewer}
                      className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                    >
                      {addingInterview ? 'Saving...' : 'Save Interview'}
                    </button>
                    <button
                      onClick={() => setShowInterviewForm(false)}
                      className="px-4 py-2 border border-slate-300 text-sm rounded-md hover:bg-slate-50 text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {loadingInterviews ? (
                <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
              ) : interviews.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No interviews scheduled yet</div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((interview) => (
                    <div key={interview.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-slate-900">{interview.interviewer}</span>
                            {interview.outcome && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${outcomeColor(interview.outcome)}`}>
                                {interview.outcome}
                              </span>
                            )}
                          </div>
                          {interview.interview_date && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(interview.interview_date)}
                            </div>
                          )}
                          {interview.meeting_link && (
                            <div className="flex items-center gap-1.5 mt-1 text-xs">
                              <Link className="w-3.5 h-3.5 text-slate-400" />
                              <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[280px]">
                                {interview.meeting_link}
                              </a>
                            </div>
                          )}
                          {interview.feedback && (
                            <p className="mt-2 text-xs text-slate-600 leading-relaxed">{interview.feedback}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteInterview(interview.id)}
                          className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div className="p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                {notes.length} Note{notes.length !== 1 ? 's' : ''}
              </h3>

              <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
                <input
                  type="text"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your name (optional)"
                />
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Add a note..."
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !noteContent.trim()}
                  className="w-full py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {addingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>

              {loadingNotes ? (
                <div className="text-center py-4 text-slate-400 text-sm">Loading...</div>
              ) : notes.length === 0 ? (
                <div className="text-center py-4 text-slate-400 text-sm">No notes yet</div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                            {note.created_by && <span>— {note.created_by}</span>}
                            <span>{formatDate(note.created_at)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
