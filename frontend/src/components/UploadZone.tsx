'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X, CheckCircle, XCircle } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  files: File[];
  onRemoveFile: (index: number) => void;
  results?: Array<{ filename: string; success: boolean; message: string }>;
}

export default function UploadZone({ onFilesSelected, files, onRemoveFile, results }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = Array.from(e.dataTransfer.files).filter(
        (f) => f.type === 'application/pdf' || f.name.endsWith('.docx') || f.name.endsWith('.doc')
      );
      if (dropped.length > 0) onFilesSelected(dropped);
    },
    [onFilesSelected]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
        }`}
      >
        <label className="flex flex-col items-center justify-center py-14 cursor-pointer">
          <Upload className={`w-10 h-10 mb-3 ${dragging ? 'text-blue-500' : 'text-slate-400'}`} />
          <span className="text-base font-medium text-slate-700">
            {dragging ? 'Drop files here' : 'Drag & drop resumes here'}
          </span>
          <span className="text-sm text-slate-500 mt-1">or click to browse</span>
          <span className="text-xs text-slate-400 mt-2">Supports PDF, DOCX</span>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            onChange={handleFileInput}
            className="sr-only"
          />
        </label>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">Selected files ({files.length})</h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {files.map((file, i) => {
              const result = results?.find((r) => r.filename === file.name);
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm ${
                    result
                      ? result.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {result ? (
                    result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    )
                  ) : (
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="truncate block text-slate-700">{file.name}</span>
                    {result && (
                      <span className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                        {result.message}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  {!result && (
                    <button
                      onClick={() => onRemoveFile(i)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
