'use client';

import { useState } from 'react';
import { generateImageAction } from '@/app/(dashboard)/recommendations/recommendation-actions';

export function ImageGeneratorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState('Minimalist abstract product launch banner');
  const [loading, setLoading] = useState(false);
  const [imageResult, setImageResult] = useState<{
    url: string;
    label: string;
    provider: string;
    remainingDaily?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await generateImageAction(prompt.trim());
      if (res?.error) {
        setError(res.error);
      } else if (res?.url) {
        setImageResult({
          url: res.url,
          label: res.label || 'AI-generated',
          provider: res.provider || 'Mock Generator',
          remainingDaily: res.remainingDaily,
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="flex w-full max-w-lg flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-[#373E3E]">AI Image Generator Studio</h2>
            <p className="text-[11px] text-zinc-500">
              Provider-abstracted studio. Outputs are watermarked &apos;AI-generated&apos;.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleGenerate} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700">Image Prompt</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the aesthetic social media visual..."
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-xs focus:border-[#373E3E] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {imageResult?.remainingDaily !== undefined
                ? `${imageResult.remainingDaily} generations remaining today`
                : 'Daily cap: 10 images / user'}
            </span>
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="rounded-lg border border-black bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? 'Synthesizing...' : 'Generate Image'}
            </button>
          </div>

          {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}

          {/* Result preview */}
          {imageResult && (
            <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-900 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageResult.url}
                  alt={prompt}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-600">
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {imageResult.label}
                </span>
                <span>Provider: {imageResult.provider}</span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
