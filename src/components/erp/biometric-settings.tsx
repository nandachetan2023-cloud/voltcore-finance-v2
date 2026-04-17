'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, Wifi, WifiOff, Eye, EyeOff, Settings2 } from 'lucide-react';

interface BiometricSiteConfig {
  id: number;
  siteId: string;
  siteName: string;
  baseUrl: string;
  corporateId: string;
  username: string;
  isActive: boolean;
}

const emptyForm = {
  siteId: '',
  siteName: '',
  baseUrl: 'https://api.etimeoffice.com/api',
  corporateId: '',
  username: '',
  password: '',
  isActive: true,
};

export default function BiometricSettings() {
  const [sites, setSites] = useState<BiometricSiteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'ok' | 'fail' | null>>({});
  const [error, setError] = useState('');

  useEffect(() => { fetchSites(); }, []);

  const fetchSites = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/biometric/config');
      const data = await res.json();
      if (data.success) setSites(data.data);
    } catch (e) {
      setError('Failed to load biometric configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.siteId || !form.siteName || !form.corporateId || !form.username) {
      setError('Site ID, Site Name, Corporate ID and Username are required');
      return;
    }
    if (!editId && !form.password) {
      setError('Password is required when creating a new site');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const method = editId ? 'PUT' : 'POST';
      const body = editId ? { id: editId, ...form } : form;
      const res = await fetch('/api/biometric/config', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        await fetchSites();
        setShowForm(false);
        setForm(emptyForm);
        setEditId(null);
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch (e) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (site: BiometricSiteConfig) => {
    setForm({
      siteId: site.siteId,
      siteName: site.siteName,
      baseUrl: site.baseUrl,
      corporateId: site.corporateId,
      username: site.username,
      password: '', // don't pre-fill password
      isActive: site.isActive,
    });
    setEditId(site.id);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this biometric site configuration?')) return;
    try {
      const res = await fetch('/api/biometric/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) fetchSites();
    } catch (e) {
      setError('Failed to delete');
    }
  };

  const handleTest = async (siteId: string) => {
    setTesting(siteId);
    setTestResults(r => ({ ...r, [siteId]: null }));
    try {
      const res = await fetch(`/api/biometric/test?siteId=${siteId}`);
      const data = await res.json();
      const siteResult = data.data?.[0];
      const ok = siteResult?.format1?.success || siteResult?.format2?.success;
      setTestResults(r => ({ ...r, [siteId]: ok ? 'ok' : 'fail' }));
    } catch {
      setTestResults(r => ({ ...r, [siteId]: 'fail' }));
    } finally {
      setTesting(null);
    }
  };

  const inputCls = 'w-full bg-[#0d1117] border border-[#2e3a48] rounded-md px-3 py-2 text-[12px] text-[#e2e8f0] outline-none focus:border-[#f5a623] transition-colors';
  const labelCls = 'block text-[10px] font-semibold text-[#5a6878] uppercase tracking-wider mb-1';

  return (
    <div className="p-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#f5a623]/10 rounded-xl flex items-center justify-center">
            <Settings2 size={18} className="text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#e2e8f0]">Biometric Site Configuration</h2>
            <p className="text-[11px] text-[#5a6878]">Manage punch machine API credentials for this account</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setForm(emptyForm); setEditId(null); setError(''); }}
            className="flex items-center gap-2 px-3 py-2 bg-[#f5a623] text-black text-[12px] font-semibold rounded-lg hover:bg-[#e8891a] transition-colors"
          >
            <Plus size={14} /> Add Site
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-semibold text-[#e2e8f0]">
              {editId ? 'Edit Site Configuration' : 'Add New Site'}
            </h3>
            <button onClick={() => { setShowForm(false); setError(''); }} className="text-[#5a6878] hover:text-[#e2e8f0]">
              <X size={16} />
            </button>
          </div>

          {error && (
            <div className="mb-3 px-3 py-2 bg-[#ff3d3d]/10 border border-[#ff3d3d]/30 rounded-lg text-[11px] text-[#ff3d3d]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Site ID *</label>
              <input className={inputCls} value={form.siteId} onChange={e => setForm(f => ({ ...f, siteId: e.target.value }))}
                placeholder="e.g. site1" disabled={!!editId} />
            </div>
            <div>
              <label className={labelCls}>Site Name *</label>
              <input className={inputCls} value={form.siteName} onChange={e => setForm(f => ({ ...f, siteName: e.target.value }))}
                placeholder="e.g. Head Office" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>API Base URL</label>
              <input className={inputCls} value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://api.etimeoffice.com/api" />
            </div>
            <div>
              <label className={labelCls}>Corporate ID *</label>
              <input className={inputCls} value={form.corporateId} onChange={e => setForm(f => ({ ...f, corporateId: e.target.value }))}
                placeholder="e.g. UA567" />
            </div>
            <div>
              <label className={labelCls}>Username *</label>
              <input className={inputCls} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="API username" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Password {editId ? '(leave blank to keep current)' : '*'}</label>
              <div className="relative">
                <input
                  className={inputCls + ' pr-10'}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editId ? '••••••••' : 'API password'}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5a6878] hover:text-[#e2e8f0]">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="isActive" checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                className="accent-[#f5a623]" />
              <label htmlFor="isActive" className="text-[12px] text-[#8899aa]">Active</label>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#f5a623] text-black text-[12px] font-semibold rounded-lg hover:bg-[#e8891a] disabled:opacity-50 transition-colors">
              <Save size={13} /> {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button onClick={() => { setShowForm(false); setError(''); }}
              className="px-4 py-2 text-[12px] text-[#8899aa] bg-[#141920] border border-[#2e3a48] rounded-lg hover:border-[#f5a623] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Sites list */}
      {loading ? (
        <div className="text-center py-10 text-[#5a6878] text-[12px]">Loading configurations...</div>
      ) : sites.length === 0 ? (
        <div className="bg-[#161c24] border border-[#252e3a] rounded-xl p-8 text-center">
          <Settings2 size={32} className="mx-auto text-[#5a6878] mb-3" />
          <p className="text-[13px] font-semibold text-[#e2e8f0] mb-1">No biometric sites configured</p>
          <p className="text-[11px] text-[#5a6878]">Add your punch machine API credentials to enable biometric sync</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sites.map(site => (
            <div key={site.id} className="bg-[#161c24] border border-[#252e3a] rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${site.isActive ? 'bg-[#22c55e]/10' : 'bg-[#5a6878]/10'}`}>
                    {site.isActive
                      ? <Wifi size={15} className="text-[#22c55e]" />
                      : <WifiOff size={15} className="text-[#5a6878]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#e2e8f0]">{site.siteName}</span>
                      <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#f5a623]/10 text-[#f5a623]">{site.siteId}</span>
                      {!site.isActive && <span className="text-[9px] font-bold px-2 py-[2px] rounded-full bg-[#5a6878]/20 text-[#5a6878]">INACTIVE</span>}
                    </div>
                    <div className="text-[11px] text-[#5a6878] mt-0.5">
                      Corporate: <span className="text-[#8899aa]">{site.corporateId}</span>
                      {' · '}User: <span className="text-[#8899aa]">{site.username}</span>
                    </div>
                    <div className="text-[10px] text-[#5a6878] mt-0.5 truncate max-w-xs">{site.baseUrl}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Test connection */}
                  <button
                    onClick={() => handleTest(site.siteId)}
                    disabled={testing === site.siteId}
                    className={`px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-colors ${
                      testResults[site.siteId] === 'ok'
                        ? 'border-[#22c55e]/40 text-[#22c55e] bg-[#22c55e]/10'
                        : testResults[site.siteId] === 'fail'
                        ? 'border-[#ff3d3d]/40 text-[#ff3d3d] bg-[#ff3d3d]/10'
                        : 'border-[#2e3a48] text-[#8899aa] hover:border-[#f5a623] hover:text-[#f5a623]'
                    }`}
                  >
                    {testing === site.siteId ? 'Testing...'
                      : testResults[site.siteId] === 'ok' ? '✓ Connected'
                      : testResults[site.siteId] === 'fail' ? '✗ Failed'
                      : 'Test'}
                  </button>
                  <button onClick={() => handleEdit(site)}
                    className="p-1.5 text-[#5a6878] hover:text-[#f5a623] transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(site.id)}
                    className="p-1.5 text-[#5a6878] hover:text-[#ff3d3d] transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
