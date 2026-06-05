'use client';

import { useState, useCallback, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Resume, Note, User, getNotes, createNote, deleteNote } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Props {
  candidate: Resume;
  user: User | null;
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function NotesPanel({ candidate, user }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotes(candidate.id);
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  }, [candidate.id]);

  useEffect(() => { load(); }, [load]);

  // Pre-fill author from current user
  useEffect(() => {
    if (user?.name && !author) {
      setAuthor(user.name);
    }
  }, [user]);

  const handleAdd = async () => {
    if (!content.trim()) return;
    setAdding(true);
    try {
      const n = await createNote(candidate.id, { content, created_by: author || 'Anonymous' });
      setNotes((prev) => [n, ...prev]);
      setContent('');
    } catch (err) {
      alert('Failed to add note: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      alert('Failed to delete note: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">
        {notes.length} Note{notes.length !== 1 ? 's' : ''}
      </h3>

      <div className="bg-slate-50 rounded-lg p-4 space-y-3 border border-slate-200">
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className={inputCls}
          placeholder="Your name"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Add a note..."
        />
        <button
          onClick={handleAdd}
          disabled={adding || !content.trim()}
          className="w-full py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {adding ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      {loading ? (
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
                {confirmDeleteId === note.id ? (
                  <div className="flex items-center gap-1 ml-2">
                    <span className="text-xs text-slate-500">Delete?</span>
                    <button
                      onClick={() => handleDelete(note.id)}
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
                  <button
                    onClick={() => setConfirmDeleteId(note.id)}
                    className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
