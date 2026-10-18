'use client';

import { useState } from 'react';
import { chatWithAssistantAction } from '@/app/(dashboard)/recommendations/recommendation-actions';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  source?: string;
  grounded?: boolean;
}

export function AssistantModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your Entangled Echo AI Assistant. I am strictly grounded in your historical post metrics, optimal schedule slots, and recommendations.',
      source: 'Deterministic Guardrail',
      grounded: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await chatWithAssistantAction(userMsg);
      if (res?.error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${res.error}`,
            source: 'Error',
            grounded: false,
          },
        ]);
      } else if (res?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.reply,
            source: res.source,
            grounded: res.grounded,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Failed to communicate with assistant service.',
          source: 'System Error',
          grounded: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="flex h-[560px] w-full max-w-lg flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-bold text-[#373E3E]">In-App AI Assistant</h2>
            <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">
              Grounded in User Data
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
          >
            ✕
          </button>
        </div>

        {/* Message history */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#373E3E] text-white'
                    : 'border border-zinc-200 bg-zinc-50 text-zinc-800'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'assistant' && m.source && (
                <span className="mt-1 text-[10px] text-zinc-400">Source: {m.source}</span>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}
        </div>

        {/* Input box */}
        <form onSubmit={handleSend} className="border-t border-zinc-200 p-4 bg-zinc-50 flex gap-2">
          <input
            type="text"
            placeholder="Ask about your posting slots, top media, or performance..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs focus:border-[#373E3E] focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg border border-black bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
