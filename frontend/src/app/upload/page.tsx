'use client';

import { useEffect, useState } from 'react';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { getStages, getJobRoles, uploadResumes } from '@/lib/api';
import UploadZone from '@/components/UploadZone';

interface UploadResult {
  filename: string;
  success: boolean;
  message: string;
}

export default function UploadPage() {
  const [stages, setStages] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [uploadDone, setUploadDone] = useState(false);

  useEffect(() => {
    Promise.all([getStages(), getJobRoles()]).then(([s, r]) => {
      const uploadableStages = s.filter((st: string) => st.toLowerCase() !== 'archive');
      setStages(uploadableStages);
      setRoles(r);
      if (uploadableStages.length > 0) setSelectedStage(uploadableStages[0]);
      if (r.length > 0) setSelectedRole(r[0]);
    });
  }, []);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...newFiles.filter((f) => !existing.has(f.name))];
    });
    setResults([]);
    setUploadDone(false);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !selectedStage || !selectedRole) return;
    setUploading(true);
    setResults([]);
    try {
      const res = await uploadResumes(files, selectedRole, selectedStage);
      // Parse results from response
      const data = res as Record<string, unknown>;
      if (Array.isArray(data)) {
        setResults(data as UploadResult[]);
      } else if (data && typeof data === 'object') {
        // Try to extract per-file results
        const parsed: UploadResult[] = files.map((f) => ({
          filename: f.name,
          success: true,
          message: 'Uploaded successfully',
        }));
        setResults(parsed);
      }
      setUploadDone(true);
    } catch (err) {
      setResults(
        files.map((f) => ({
          filename: f.name,
          success: false,
          message: err instanceof Error ? err.message : 'Upload failed',
        }))
      );
      setUploadDone(true);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setResults([]);
    setUploadDone(false);
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Upload className="w-5 h-5 text-slate-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Upload Resumes</h1>
            <p className="text-sm text-slate-500">Parse and add candidates to your pipeline</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Role & Stage selection */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Target Position</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Job Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select role...</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {roles.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Add roles in Settings</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Pipeline Stage <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select stage...</option>
                  {stages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {stages.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Add stages in Settings</p>
                )}
              </div>
            </div>
          </div>

          {/* Upload zone */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Files</h2>
            <UploadZone
              onFilesSelected={handleFilesSelected}
              files={files}
              onRemoveFile={handleRemoveFile}
              results={uploadDone ? results : undefined}
            />
          </div>

          {/* Upload results summary */}
          {uploadDone && results.length > 0 && (
            <div className={`rounded-xl border p-4 ${failCount === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-center gap-2">
                {failCount === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                <span className={`font-semibold text-sm ${failCount === 0 ? 'text-green-800' : 'text-yellow-800'}`}>
                  Upload complete: {successCount} succeeded, {failCount} failed
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleUpload}
              disabled={uploading || files.length === 0 || !selectedStage || !selectedRole || uploadDone}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Uploading {files.length} file{files.length !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {files.length > 0 ? `${files.length} file${files.length !== 1 ? 's' : ''}` : 'Resumes'}
                </>
              )}
            </button>
            {uploadDone && (
              <button
                onClick={handleReset}
                className="px-5 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Upload More
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
