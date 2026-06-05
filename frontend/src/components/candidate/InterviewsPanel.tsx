'use client';

import { useState, useCallback, useEffect } from 'react';
import { Calendar, Plus, Trash2, Save, XCircle, Pencil, Link, AlertTriangle } from 'lucide-react';
import {
  Resume,
  Interview,
  User,
  getInterviews,
  createInterview,
  updateInterview,
  deleteInterview,
} from '@/lib/api';
import { formatDate, outcomeColor } from '@/lib/utils';

interface Props {
  candidate: Resume;
  user: User | null;
}

const inputCls = 'w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function InterviewsPanel({ candidate, user }: Props) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [calendarWarning, setCalendarWarning] = useState('');

  const [newInterview, setNewInterview] = useState({
    interviewer: '',
    interview_date: '',
    meeting_link: '',
    feedback: '',
    outcome: '',
  });
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    interviewer: '',
    interview_date: '',
    outcome: '',
    feedback: '',
    meeting_link: '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInterviews(candidate.id);
      setInterviews(data);
    } catch (err) {
      console.error('Failed to load interviews:', err);
    } finally {
      setLoading(false);
    }
  }, [candidate.id]);

  useEffect(() => { load(); }, [load]);

  const openForm = () => {
    setNewInterview({
      interviewer: user?.name || '',
      interview_date: '',
      meeting_link: '',
      feedback: '',
      outcome: '',
    });
    setCalendarWarning('');
    setShowForm(true);
  };

  const handleAdd = async () => {
    if (!newInterview.interviewer) return;
    setAdding(true);
    setCalendarWarning('');
    try {
      const result = await createInterview(candidate.id, newInterview);
      if (result.calendar_warning) {
        setCalendarWarning(result.calendar_warning);
      } else {
        setShowForm(false);
      }
      await load();
    } catch (err) {
      alert('Failed to create interview: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (iv: Interview) => {
    setEditingId(iv.id);
    setEditForm({
      interviewer: iv.interviewer || '',
      interview_date: iv.interview_date ? iv.interview_date.slice(0, 16) : '',
      outcome: iv.outcome || '',
      feedback: iv.feedback || '',
      meeting_link: iv.meeting_link || '',
    });
  };

  const handleSave = async (iv: Interview) => {
    setSaving(true);
    try {
      await updateInterview(iv.id, editForm);
      setInterviews((prev) => prev.map((i) => i.id === iv.id ? { ...i, ...editForm } : i));
      setEditingId(null);
    } catch (err) {
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await deleteInterview(id);
      setInterviews((prev) => prev.filter((i) => i.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">
          {interviews.length} Interview{interviews.length !== 1 ? 's' : ''}
        </h3>
        <button
          onClick={openForm}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Interview
        </button>
      </div>

      {calendarWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Interview saved, but calendar invite was not sent</p>
            <p className="text-xs mt-0.5 text-amber-700">{calendarWarning}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700">New Interview</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Interviewer *</label>
              <input
                type="text"
                value={newInterview.interviewer}
                onChange={(e) => setNewInterview({ ...newInterview, interviewer: e.target.value })}
                className={inputCls}
                placeholder="Interviewer name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input
                type="datetime-local"
                value={newInterview.interview_date}
                onChange={(e) => setNewInterview({ ...newInterview, interview_date: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Meeting Link
              <span className="ml-1 font-normal text-slate-400">(auto-generated via Google Meet if left empty)</span>
            </label>
            <input
              type="url"
              value={newInterview.meeting_link}
              onChange={(e) => setNewInterview({ ...newInterview, meeting_link: e.target.value })}
              className={inputCls}
              placeholder="Leave empty to auto-generate"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Outcome</label>
            <select
              value={newInterview.outcome}
              onChange={(e) => setNewInterview({ ...newInterview, outcome: e.target.value })}
              className={inputCls}
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
              className={`${inputCls} resize-none`}
              placeholder="Interview feedback..."
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={adding || !newInterview.interviewer}
              className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {adding ? 'Saving...' : 'Save Interview'}
            </button>
            <button
              onClick={() => { setShowForm(false); setCalendarWarning(''); }}
              className="px-4 py-2 border border-slate-300 text-sm rounded-md hover:bg-slate-50 text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-400 text-sm">Loading...</div>
      ) : interviews.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-sm">No interviews scheduled yet</div>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => (
            <div key={interview.id} className="border border-slate-200 rounded-lg p-4 bg-white">
              {editingId === interview.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Interviewer</label>
                      <input
                        type="text"
                        value={editForm.interviewer}
                        onChange={(e) => setEditForm({ ...editForm, interviewer: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
                      <input
                        type="datetime-local"
                        value={editForm.interview_date}
                        onChange={(e) => setEditForm({ ...editForm, interview_date: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Outcome</label>
                    <select
                      value={editForm.outcome}
                      onChange={(e) => setEditForm({ ...editForm, outcome: e.target.value })}
                      className={inputCls}
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
                      value={editForm.feedback}
                      onChange={(e) => setEditForm({ ...editForm, feedback: e.target.value })}
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(interview)}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-slate-600 text-xs font-medium rounded-md hover:bg-slate-50"
                    >
                      <XCircle className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
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
                    {interview.feedback && (
                      <p className="mt-2 text-xs text-slate-600 leading-relaxed">{interview.feedback}</p>
                    )}
                    {(interview.meeting_link || interview.calendar_event_link) && (
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {interview.meeting_link && (
                          <a
                            href={interview.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700"
                          >
                            <Link className="w-3 h-3" />
                            Join Meeting
                          </a>
                        )}
                        {interview.calendar_event_link && (
                          <a
                            href={interview.calendar_event_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-2.5 py-1 border border-slate-300 text-slate-600 text-xs font-medium rounded-md hover:bg-slate-50"
                          >
                            <Calendar className="w-3 h-3" />
                            View in Calendar
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {confirmDeleteId === interview.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Delete?</span>
                        <button
                          onClick={() => handleDelete(interview.id)}
                          disabled={deleting}
                          className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          {deleting ? '…' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deleting}
                          className="px-2 py-1 text-xs font-medium text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(interview)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(interview.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
