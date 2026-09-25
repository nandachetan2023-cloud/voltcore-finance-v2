'use client';

/**
 * Finance Help Chat Widget
 * ────────────────────────
 * A self-contained, offline assistant scoped to the FINANCE module.
 *
 * - A floating button (FAB) appears ONLY when a finance sub-module is active.
 * - Opens a right-side Sheet with a chat UI.
 * - Matches the user's query against the curated KB (`finance-help-data.ts`)
 *   and renders the best answer as Markdown.
 * - "Open …" chips call `setActiveModule` to jump to the relevant module.
 *
 * No AI / no backend — everything is bundled. To add topics, edit
 * `finance-help-data.ts`.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LifeBuoy, Send, Sparkles, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useERPStore } from '@/store/erp-store';
import { notifyFinanceDataChanged } from '@/store/erp-store';
import type { ModuleId } from '@/store/erp-store';
import ReactMarkdown from 'react-markdown';
import {
  FINANCE_HELP_ENTRIES,
  POPULAR_HELP_IDS,
  type HelpEntry,
} from './finance-help-data';

// ── Finance module ids (where the widget is visible) ────────────
// Sourced from MODULE_TREE.finance in src/store/erp-store.ts.
const FINANCE_MODULE_IDS = new Set<string>([
  'finance',
  'finance-dashboard',
  'ledger',
  'accounts-receivable',
  'accounts-payable',
  'journal-entries',
  'create-journal-entry',
  'bank-cash',
  'taxation',
  'budget',
  'financial-reports',
  'fin-sites',
  'fin-jobs',
  'fin-parties',
  'fin-invoices',
  'fin-payments',
  'fin-payment-advices',
  'fin-petty-cash',
  'fin-assets',
  'fin-profit-loss',
  'fin-bank-reconciliation',
  'fin-expense-claims',
  'fin-site-expenses',
  'fin-work-orders',
  'fin-purchase-orders',
  'fin-credit-notes',
  'fin-client-follow-up',
]);

// ── Types ───────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  /** KB entry attached to an assistant message (drives its quick-link chips). */
  entry?: HelpEntry;
}

// ── Search: score entries against the query ─────────────────────
const STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'is', 'are',
  'how', 'do', 'i', 'what', 'with', 'my', 'me', 'this', 'that', 'it', 'can',
  'please', 'from', 'into', 'where', 'when', 'why', 'who', 'be', 'get', 'got',
]);

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

function scoreEntry(entry: HelpEntry, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  let score = 0;
  const titleLc = entry.title.toLowerCase();
  const summaryLc = entry.summary.toLowerCase();
  const seen = new Set<string>();

  for (const token of queryTokens) {
    if (seen.has(token)) continue;
    seen.add(token);

    // exact keyword match (strongest)
    if (entry.keywords.includes(token)) score += 10;
    // keyword phrase contains the token
    for (const kw of entry.keywords) {
      if (kw.includes(token)) score += 3;
    }
    // title hit
    if (titleLc.includes(token)) score += 6;
    // summary hit
    if (summaryLc.includes(token)) score += 2;
  }

  // multi-token phrase bonus: if the whole query appears in a keyword
  const queryPhrase = queryTokens.join(' ');
  if (entry.keywords.some((kw) => kw.includes(queryPhrase))) score += 8;

  return score;
}

function findAnswer(query: string): HelpEntry | null {
  const tokens = tokenize(query);
  if (tokens.length === 0) return null;

  let best: HelpEntry | null = null;
  let bestScore = 0;
  for (const entry of FINANCE_HELP_ENTRIES) {
    const s = scoreEntry(entry, tokens);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }
  // Require a minimum signal so garbage doesn't match weakly.
  return bestScore >= 4 ? best : null;
}

// ── Component ───────────────────────────────────────────────────
export function FinanceHelpChat() {
  const activeModule = useERPStore((s) => s.activeModule);
  const setActiveModule = useERPStore((s) => s.setActiveModule);

  const visible = FINANCE_MODULE_IDS.has(activeModule);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  /** Pending form the assistant asked us to fill in — forwarded on the next message. */
  const [pending, setPending] = useState<{ formId: string; text: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: 'assistant',
      text: "Hi! I'm your **Finance** helper. Ask me how to use any finance feature — or tell me to create an entry, e.g. *\"create a journal entry Dr Rent 50000 Cr SBI Bank 50000\"* or *\"raise an invoice of 2 lakh to L&T at site NTPC Rihand\"*.",
    },
  ]);

  const currentUserEmail = () => {
    try {
      const user = localStorage.getItem('erp_auth_user');
      return user ? (JSON.parse(user).email as string) : '';
    } catch {
      return '';
    }
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const popularEntries = useMemo(
    () =>
      POPULAR_HELP_IDS
        .map((id) => FINANCE_HELP_ENTRIES.find((e) => e.id === id))
        .filter((e): e is HelpEntry => Boolean(e)),
    [],
  );

  async function send(text: string, fresh = false) {
    const query = text.trim();
    if (!query) return;
    if (fresh) setPending(null);

    const userMsg: ChatMessage = { role: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/finance-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: query,
          userEmail: currentUserEmail(),
          moduleId: activeModule,
          context: pending ?? undefined,
        }),
      });
      const j = await res.json();

      if (j.success) {
        // Entry created — alert, refresh tables/dashboard, navigate.
        setPending(null);
        toast.success(`${j.title || 'Entry'} created`);
        notifyFinanceDataChanged();
        const entry: HelpEntry = {
          id: 'action-created',
          title: j.title || 'Entry',
          keywords: [],
          summary: j.message,
          body: `✅ **${j.title || 'Entry'} created.**\n\n${j.message}${j.reference ? `\n\nReference: \`${j.reference}\`` : ''}`,
          ...(j.moduleId ? { relatedModule: j.moduleId } : {}),
        };
        setMessages((prev) => [...prev, { role: 'assistant', text: entry.body, entry }]);
        return;
      }

      if (j.action === 'info') {
        // Question / unclear → fall back to the local KB.
        setPending(null);
        const match = findAnswer(query);
        if (match) {
          setMessages((prev) => [...prev, { role: 'assistant', text: match.body, entry: match }]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              text: j.message || "I couldn't find a direct match for that. Here are some popular topics — tap one:",
            },
            { role: 'assistant', text: '__suggestions__' },
          ]);
        }
        return;
      }

      // Error / needs more info — if the assistant says to continue the same
      // form (missing fields), keep the context so the next message fills it in.
      if (j.context?.formId && j.context?.text) {
        setPending({ formId: j.context.formId, text: j.context.text });
      } else {
        setPending(null);
      }
      const entry: HelpEntry = {
        id: 'action-error',
        title: j.title || 'Entry',
        keywords: [],
        summary: j.message,
        body: `⚠️ **Could not create ${j.title || 'entry'}**\n\n${j.message}`,
        ...(j.moduleId ? { relatedModule: j.moduleId } : {}),
      };
      setMessages((prev) => [...prev, { role: 'assistant', text: entry.body, entry }]);
    } catch (e) {
      setPending(null);
      const match = findAnswer(query);
      if (match) {
        setMessages((prev) => [...prev, { role: 'assistant', text: match.body, entry: match }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: "The assistant service isn't reachable right now. Here are some popular topics — tap one:" },
          { role: 'assistant', text: '__suggestions__' },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function clearChat() {
    setPending(null);
    setMessages([
      {
        role: 'assistant',
        text: "Cleared. What would you like to know about the **Finance** module?",
      },
    ]);
  }

  function openModule(moduleId: string) {
    setActiveModule(moduleId as ModuleId);
    setOpen(false);
  }

  // Don't render the FAB outside finance modules.
  if (!visible) return null;

  const showSuggestions = messages.length > 0 && messages[messages.length - 1].text === '__suggestions__';

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        aria-label="Open Finance Help"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center',
          'rounded-full shadow-lg shadow-black/40 transition-transform',
          'bg-[#f5a623] text-[#0a0d12] hover:scale-105 hover:bg-[#ffb84d]',
          'ring-2 ring-[#f5a623]/30 focus:outline-none focus-visible:ring-4',
        )}
      >
        <LifeBuoy className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            'flex w-full flex-col gap-0 p-0 sm:max-w-md',
            'border-[#252e3a] bg-[#0a0d12]',
          )}
        >
          {/* Header */}
          <SheetHeader className="flex-row items-center justify-between gap-2 border-b border-[#252e3a] bg-[#161c24] p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5a623]/15">
                <LifeBuoy className="h-4 w-4 text-[#f5a623]" />
              </div>
              <div>
                <SheetTitle className="text-sm font-semibold text-[#e2e8f0]">
                  Finance Help
                </SheetTitle>
                <p className="text-[10px] uppercase tracking-wider text-[#5a6878]">
                  Self-contained guide
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[#5a6878] hover:text-[#e2e8f0]"
                onClick={clearChat}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div ref={scrollRef} className="finance-help-scroll flex-1 flex-col gap-3 p-4">
              {messages.map((m, i) => {
                if (m.role === 'user') {
                  return (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#f5a623] px-3 py-2 text-[13px] font-medium text-[#0a0d12]">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                // assistant
                if (m.text === '__suggestions__') {
                  return (
                    <div key={i} className="flex flex-wrap gap-2 pl-1">
                      {popularEntries.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => send(e.title, true)}
                          className="rounded-full border border-[#252e3a] bg-[#161c24] px-3 py-1.5 text-[12px] text-[#cbd5e1] transition-colors hover:border-[#f5a623]/50 hover:text-[#f5a623]"
                        >
                          {e.title}
                        </button>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex justify-start">
                    <div className="max-w-[90%] space-y-3">
                      <div className="rounded-2xl rounded-bl-sm border border-[#252e3a] bg-[#161c24] px-3 py-2 text-[13px] leading-relaxed text-[#cbd5e1]">
                        <ReactMarkdown
                          components={{
                            // lean styling tuned for the dark theme
                            h3: ({ children }) => (
                              <p className="mb-1 text-[13px] font-semibold text-[#e2e8f0]">{children}</p>
                            ),
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => (
                              <ul className="mb-2 list-disc space-y-1 pl-4">{children}</ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="mb-2 list-decimal space-y-1 pl-4">{children}</ol>
                            ),
                            li: ({ children }) => <li className="text-[13px]">{children}</li>,
                            strong: ({ children }) => (
                              <strong className="font-semibold text-[#e2e8f0]">{children}</strong>
                            ),
                            code: ({ children }) => (
                              <code className="rounded bg-[#0a0d12] px-1 py-0.5 font-mono text-[12px] text-[#f5a623]">
                                {children}
                              </code>
                            ),
                            pre: ({ children }) => (
                              <pre className="my-2 overflow-x-auto rounded-lg border border-[#252e3a] bg-[#0a0d12] p-2 text-[12px]">
                                {children}
                              </pre>
                            ),
                            hr: () => <hr className="my-2 border-[#252e3a]" />,
                          }}
                        >
                          {m.text}
                        </ReactMarkdown>
                      </div>

                      {/* Quick-link chips */}
                      {m.entry?.relatedModule && (
                        <button
                          type="button"
                          onClick={() => openModule(m.entry!.relatedModule!)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#f5a623]/40 bg-[#f5a623]/10 px-2.5 py-1.5 text-[12px] font-medium text-[#f5a623] transition-colors hover:bg-[#f5a623]/20"
                        >
                          Open module <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                      {m.entry?.links && m.entry.links.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.entry.links.map((link, li) => (
                            <button
                              key={`${link.moduleId}-${link.label}-${li}`}
                              type="button"
                              onClick={() => openModule(link.moduleId)}
                              className="inline-flex items-center gap-1 rounded-md border border-[#252e3a] bg-[#161c24] px-2 py-1 text-[11px] text-[#cbd5e1] transition-colors hover:border-[#5a6878] hover:text-[#e2e8f0]"
                            >
                              {link.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Starting suggestions (welcome screen = only the greeting) */}
              {messages.length === 1 && (
                <div className="mt-2 space-y-2">
                  <p className="flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-[#5a6878]">
                    <Sparkles className="h-3 w-3 text-[#f5a623]" /> Suggested questions
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {popularEntries.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => send(e.title, true)}
                        className="rounded-lg border border-[#252e3a] bg-[#161c24] px-3 py-2 text-left text-[12.5px] text-[#cbd5e1] transition-colors hover:border-[#f5a623]/50 hover:text-[#f5a623]"
                      >
                        {e.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inline suggestions after a no-match (badge already rendered above). */}
              {showSuggestions && null}

              {/* Busy / thinking indicator */}
              {busy && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-[#252e3a] bg-[#161c24] px-3 py-2">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f5a623]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f5a623] [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#f5a623] [animation-delay:300ms]" />
                  </div>
                </div>
              )}
          </div>

          {/* Input */}
          <form
            onSubmit={onSubmit}
            className="flex items-end gap-2 border-t border-[#252e3a] bg-[#161c24] p-3"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={busy}
              placeholder={'Ask, or create - e.g. "create a journal entry"'}
              rows={1}
              className={cn(
                'min-h-[40px] max-h-32 flex-1 resize-none border-[#252e3a] bg-[#0a0d12] text-[13px]',
                'text-[#e2e8f0] placeholder:text-[#5a6878] focus-visible:ring-[#f5a623]/40',
              )}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || busy}
              className="h-10 w-10 shrink-0 bg-[#f5a623] text-[#0a0d12] hover:bg-[#ffb84d] disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
