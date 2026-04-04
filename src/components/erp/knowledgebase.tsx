'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Plus, FileText, Pencil, Trash2, AlertTriangle,
  Eye, ThumbsUp, Tag, User, Calendar, Layers, Eye as ViewIcon,
  BarChart3, CheckCircle2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useERPStore } from '@/store/erp-store';

// ── Types ──────────────────────────────────────────────
interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  author: string;
  tags: string;
  views: number;
  helpful: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ArticleFormData {
  title: string;
  category: string;
  content: string;
  author: string;
  tags: string;
  status: string;
}

const emptyForm: ArticleFormData = {
  title: '', category: 'General', content: '', author: '', tags: '', status: 'Published',
};

// ── Helpers ────────────────────────────────────────────
function statusColor(s: string) {
  switch (s?.toLowerCase()) {
    case 'published': return 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40';
    case 'draft': return 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40';
    case 'archived': return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
    default: return 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  'HR & Leave': 'bg-[#b388ff]/15 text-[#b388ff] border-[#b388ff]/40',
  'Safety & HSE': 'bg-[#ff3d3d]/15 text-[#ff3d3d] border-[#ff3d3d]/40',
  'Procurement': 'bg-[#00d4ff]/15 text-[#00d4ff] border-[#00d4ff]/40',
  'Finance': 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/40',
  'Operations': 'bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40',
  'Technical': 'bg-[#ffab40]/15 text-[#ffab40] border-[#ffab40]/40',
  'General': 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40',
};

function categoryColor(c: string) {
  return CATEGORY_COLORS[c] || 'bg-[#5a6878]/15 text-[#8899aa] border-[#5a6878]/40';
}

function formatDate(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatDateFull(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function parseTags(tags: string): string[] {
  if (!tags) return [];
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// ── Stat Card ──────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, sub }: {
  icon: React.ElementType; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="vc-stat-card">
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] text-[#5a6878] font-semibold uppercase tracking-wider mb-1">{label}</div>
          <div className="text-[28px] font-bold leading-none" style={{ fontFamily: "'Share Tech Mono', monospace", color }}>{value}</div>
          {sub && <div className="text-[10px] text-[#5a6878] mt-1">{sub}</div>}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// ── Loading Skeleton ───────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="vc-stat-card">
            <Skeleton className="h-3 w-24 mb-2 bg-[#1e2630]" />
            <Skeleton className="h-8 w-16 bg-[#1e2630]" />
          </div>
        ))}
      </div>
      <div className="vc-panel">
        <Skeleton className="h-10 w-full bg-[#1e2630]" />
        <div className="p-3 space-y-2">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-11 w-full bg-[#1e2630]" />)}
        </div>
      </div>
    </div>
  );
}

// ── Form Field ─────────────────────────────────────────
function FormField({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={span ? 'md:col-span-2' : ''}>
      <label className="block text-[10px] text-[#8899aa] font-semibold uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623]";
const selectCls = "w-full bg-[#141920] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none transition-colors focus:border-[#f5a623] appearance-none cursor-pointer";

const CATEGORIES = ['HR & Leave', 'Safety & HSE', 'Procurement', 'Finance', 'Operations', 'Technical', 'General'];

// ── Main Component ─────────────────────────────────────
export default function KnowledgebaseModule() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [helpfulLocal, setHelpfulLocal] = useState<Record<string, number>>({});
  const [form, setForm] = useState<ArticleFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const { triggerCreate } = useERPStore();

  useEffect(() => { if (triggerCreate > 0) setCreateOpen(true); }, [triggerCreate]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledgebase');
      const json = await res.json();
      if (json.success) setArticles(json.data.articles);
      else setError(json.error || 'Failed to load knowledge base articles');
    } catch { setError('Network error fetching articles'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalArticles = articles.length;
  const publishedCount = articles.filter(a => a.status === 'Published').length;
  const uniqueCategories = new Set(articles.map(a => a.category)).size;
  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);

  const openCreate = () => { setForm(emptyForm); setCreateOpen(true); };
  const openEdit = (a: Article) => {
    setForm({
      title: a.title, category: a.category, content: a.content,
      author: a.author, tags: a.tags, status: a.status,
    });
    setSelectedId(a.id);
    setEditOpen(true);
  };
  const openView = (a: Article) => {
    setSelectedArticle(a);
    setViewOpen(true);
  };
  const openDelete = (id: string) => { setSelectedId(id); setDeleteOpen(true); };

  const handleSubmit = async (mode: 'create' | 'edit') => {
    setSubmitting(true);
    try {
      const url = '/api/knowledgebase';
      const method = mode === 'create' ? 'POST' : 'PUT';
      const body = mode === 'edit' ? { id: selectedId, ...form } : form;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === 'create' ? 'Article created successfully' : 'Article updated successfully');
        if (mode === 'create') setCreateOpen(false); else setEditOpen(false);
        fetchData();
      } else {
        toast.error(json.error || `Failed to ${mode} article`);
      }
    } catch { toast.error(`Failed to ${mode} article`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/knowledgebase', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selectedId }) });
      const json = await res.json();
      if (json.success) {
        toast.success('Article deleted successfully');
        setDeleteOpen(false);
        fetchData();
      } else { toast.error(json.error || 'Failed to delete article'); }
    } catch { toast.error('Failed to delete article'); }
    finally { setSubmitting(false); }
  };

  const handleHelpful = (articleId: string) => {
    setHelpfulLocal(prev => ({
      ...prev,
      [articleId]: (prev[articleId] || 0) + 1,
    }));
    toast.success('Thanks for your feedback!');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <BookOpen size={40} className="text-[#ff3d3d]" />
        <p className="text-[#8899aa] text-sm">{error}</p>
        <button className="vc-btn-primary" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;

  const dialogContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
      <FormField label="Article Title" span>
        <input className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="How to submit a leave request" />
      </FormField>
      <FormField label="Category">
        <select className={selectCls} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </FormField>
      <FormField label="Author">
        <input className={inputCls} value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="HR Department" />
      </FormField>
      <FormField label="Tags (comma-separated)">
        <input className={inputCls} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="leave, hr, policy, annual" />
      </FormField>
      <FormField label="Status">
        <select className={selectCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Archived">Archived</option>
        </select>
      </FormField>
      <FormField label="Content" span>
        <textarea
          className={`${inputCls} min-h-[200px] resize-none`}
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          placeholder="Write the article content here..."
        />
      </FormField>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Total Articles" value={totalArticles} color="#f5a623" sub="All categories" />
        <StatCard icon={CheckCircle2} label="Published" value={publishedCount} color="#00e676" sub="Live articles" />
        <StatCard icon={Layers} label="Categories" value={uniqueCategories} color="#00d4ff" sub="Active topics" />
        <StatCard icon={BarChart3} label="Total Views" value={formatNumber(totalViews)} color="#b388ff" sub="Across all articles" />
      </div>

      {/* ── Articles Table ── */}
      <div className="vc-panel">
        <div className="vc-panel-header">
          <BookOpen size={15} className="text-[#f5a623]" />
          <span className="text-[12px] font-bold text-[#e2e8f0]">Knowledge Base</span>
          <span className="ml-auto text-[10px] text-[#5a6878]">{articles.length} articles</span>
          <button className="vc-btn-primary ml-2 flex items-center gap-1" onClick={openCreate}>
            <Plus size={13} /> New Article
          </button>
        </div>

        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#5a6878]">
            <BookOpen size={36} className="mb-2 opacity-40" />
            <p className="text-[12px]">No articles found</p>
            <p className="text-[10px] mt-1">Create your first knowledge base article</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#252e3a] bg-[#141920]/50">
                  {['Title', 'Category', 'Author', 'Tags', 'Views', 'Helpful', 'Status', 'Created', '', ''].map(h => (
                    <th key={h} className="text-left px-3 py-[9px] text-[9px] font-bold uppercase tracking-wider text-[#5a6878] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => {
                  const tags = parseTags(a.tags);
                  const helpfulBoost = helpfulLocal[a.id] || 0;
                  return (
                    <tr key={a.id} className="border-b border-[#252e3a]/60 hover:bg-[#141920] transition-colors group">
                      <td className="px-3 py-[10px] text-[#e2e8f0] whitespace-nowrap max-w-[220px] truncate font-medium cursor-pointer hover:text-[#f5a623]" onClick={() => openView(a)}>
                        {a.title}
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <span className={`vc-badge border ${categoryColor(a.category)}`}>{a.category}</span>
                      </td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap max-w-[110px] truncate">
                        <span className="flex items-center gap-1"><User size={10} className="text-[#5a6878] shrink-0" />{a.author}</span>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <div className="flex gap-1 flex-wrap max-w-[160px]">
                          {tags.length > 0 ? tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#141920] border border-[#2e3a48] text-[#5a6878]">
                              {tag}
                            </span>
                          )) : <span className="text-[#5a6878]">—</span>}
                          {tags.length > 3 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#141920] border border-[#2e3a48] text-[#5a6878]">
                              +{tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        <span className="flex items-center gap-1"><ViewIcon size={10} className="text-[#5a6878]" />{a.views || 0}</span>
                      </td>
                      <td className="px-3 py-[10px] text-[#8899aa] whitespace-nowrap" style={{ fontFamily: "'Share Tech Mono', monospace" }}>
                        <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-[#5a6878]" />{a.helpful + helpfulBoost}</span>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <span className={`vc-badge border ${statusColor(a.status)}`}>{a.status}</span>
                      </td>
                      <td className="px-3 py-[10px] text-[#5a6878] whitespace-nowrap">{formatDate(a.createdAt)}</td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openView(a)}>
                          <Eye size={13} />
                        </button>
                      </td>
                      <td className="px-3 py-[10px] whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors" onClick={() => openEdit(a)}><Pencil size={13} /></button>
                          <button className="w-7 h-7 rounded-md flex items-center justify-center text-[#8899aa] hover:text-[#ff3d3d] hover:bg-[#ff3d3d]/10 transition-colors" onClick={() => openDelete(a.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Create New Article</DialogTitle></DialogHeader>
          {dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('create')}>
              {submitting ? 'Creating...' : 'Create Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Edit Article</DialogTitle></DialogHeader>
          {dialogContent()}
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button className="bg-[#f5a623] text-black hover:bg-[#e8891a] font-semibold" disabled={submitting} onClick={() => handleSubmit('edit')}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-2xl max-h-[80vh]">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`vc-badge border ${categoryColor(selectedArticle.category)}`}>{selectedArticle.category}</span>
                  <span className={`vc-badge border ${statusColor(selectedArticle.status)}`}>{selectedArticle.status}</span>
                </div>
                <DialogTitle className="text-[#e2e8f0] text-base">{selectedArticle.title}</DialogTitle>
                <div className="flex items-center gap-4 mt-2 text-[11px] text-[#5a6878]">
                  <span className="flex items-center gap-1"><User size={11} />{selectedArticle.author}</span>
                  <span className="flex items-center gap-1"><Calendar size={11} />{formatDateFull(selectedArticle.createdAt)}</span>
                  <span className="flex items-center gap-1"><ViewIcon size={11} />{selectedArticle.views} views</span>
                  <span className="flex items-center gap-1"><ThumbsUp size={11} />{selectedArticle.helpful + (helpfulLocal[selectedArticle.id] || 0)} helpful</span>
                </div>
              </DialogHeader>
              {parseTags(selectedArticle.tags).length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {parseTags(selectedArticle.tags).map((tag, i) => (
                    <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-[#141920] border border-[#2e3a48] text-[#8899aa]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="p-4 rounded-md bg-[#141920] border border-[#2e3a48] text-[12px] text-[#c8d6e0] leading-relaxed whitespace-pre-wrap max-h-[350px] overflow-y-auto">
                {selectedArticle.content}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="ghost"
                  className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623] flex items-center gap-1.5"
                  onClick={() => handleHelpful(selectedArticle.id)}
                >
                  <ThumbsUp size={14} /> Mark as Helpful
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[#161c24] border-[#252e3a] max-w-md">
          <DialogHeader><DialogTitle className="text-[#e2e8f0] text-base">Delete Article</DialogTitle></DialogHeader>
          <div className="flex items-start gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-[#ff3d3d]/15 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={20} className="text-[#ff3d3d]" />
            </div>
            <div>
              <p className="text-[13px] text-[#e2e8f0] mb-1">Are you sure you want to delete this article?</p>
              <p className="text-[11px] text-[#8899aa]">This action cannot be undone. All associated data will be permanently removed.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="bg-[#141920] text-[#8899aa] hover:text-[#e2e8f0] border border-[#2e3a48] hover:border-[#f5a623]" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button className="bg-[#ff3d3d] text-white hover:bg-[#cc2020] font-semibold" disabled={submitting} onClick={handleDelete}>
              {submitting ? 'Deleting...' : 'Delete Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
