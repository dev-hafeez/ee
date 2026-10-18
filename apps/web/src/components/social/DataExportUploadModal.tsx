'use client';

import { useState } from 'react';
import { importPostHistoryAction } from '@/app/(dashboard)/settings/import-actions';

interface DataExportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountHandle: string;
}

export function DataExportUploadModal({
  isOpen,
  onClose,
  accountId,
  accountHandle,
}: DataExportUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    metrics: number;
    errors: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setResult(null);
    }
  }

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const text = await file.text();
      const res = await importPostHistoryAction(accountId, text);

      if (!res.success) {
        setError(res.error || 'Failed to import post history.');
      } else if (res.summary) {
        setResult({
          imported: res.summary.importedPosts,
          metrics: res.summary.insertedMetrics,
          errors: res.summary.errors,
        });
        setFile(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error reading file');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="card-elevation w-full max-w-lg rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-[#373E3E]">
              Import Post History ({accountHandle ? `@${accountHandle}` : 'Account'})
            </h3>
            <p className="mt-0.5 text-xs text-zinc-600">
              Upload CSV export or official Instagram &quot;Download Your Information&quot; JSON.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
            <input
              type="file"
              id="export-file-input"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="export-file-input"
              className="flex cursor-pointer flex-col items-center justify-center"
            >
              <span className="text-3xl">📁</span>
              <span className="mt-2 text-xs font-semibold text-zinc-800">
                {file ? file.name : 'Click to select CSV or JSON export'}
              </span>
              <span className="mt-1 text-[11px] text-zinc-500">
                Supports standard CSV headers (caption, type, date, likes, comments) or media.json
              </span>
            </label>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <p className="font-semibold">Import Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          )}

          {result && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              <p className="font-bold">Import Complete!</p>
              <p className="mt-1">
                Successfully processed and ingested{' '}
                <span className="font-semibold">{result.imported} posts</span> and{' '}
                <span className="font-semibold">{result.metrics} engagement metrics</span> into the
                official pipeline.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-zinc-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || uploading}
              className="btn-solid rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {uploading ? 'Processing Import...' : 'Import Posts'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
