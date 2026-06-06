import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Search, Building, Plus, X, Loader2, Edit, Trash2, ShieldAlert } from 'lucide-react';
import AppShell from '@/Components/AppShell';

interface Company {
  id:             number;
  name:           string;
  slug:           string;
  is_active:      boolean;
  users_count:    number;
  projects_count: number;
  created_at:     string;
}

interface Props {
  companies: Company[];
}

export default function Index({ companies }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingCompany(null);
    setName('');
    setSlug('');
    setIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (c: Company) => {
    setEditingCompany(c);
    setName(c.name);
    setSlug(c.slug);
    setIsActive(c.is_active);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name:      name.trim(),
      slug:      slug.trim() || null,
      is_active: isActive,
    };

    if (editingCompany) {
      router.put(`/companies/${editingCompany.id}`, payload, {
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    } else {
      router.post('/companies', payload, {
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    }
  };

  const handleDelete = (c: Company) => {
    if (confirm(`Are you sure you want to deactivate/delete company "${c.name}"?`)) {
      router.delete(`/companies/${c.id}`);
    }
  };

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      return (
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [companies, search]);

  return (
    <AppShell>
      <Head title="Companies - 1Mahalla" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building className="w-6 h-6 text-indigo-400" />
            {t('companies.title')}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            {filtered.length} {t('companies.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <Search className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder={t('companies.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 w-44 md:w-56"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-3 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            <Plus className="w-4 h-4" />
            {t('companies.newTenant')}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Table representation */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Building className="w-10 h-10" style={{ color: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('companies.noCompanies')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {[t('companies.colName'), t('companies.colSlug'), t('companies.colUsers'), t('companies.colProjects'), t('companies.colStatus'), t('companies.colRegistered'), t('companies.colActions')].map((h) => (
                      <th key={h} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((c) => {
                    return (
                      <tr key={c.id} className="transition-all hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-xl font-bold text-slate-800 shrink-0"
                              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">{c.slug}</td>
                        <td className="px-6 py-4 text-xs text-slate-800">{c.users_count} {t('companies.users')}</td>
                        <td className="px-6 py-4 text-xs text-slate-800">{c.projects_count} {t('companies.projectsCount')}</td>
                        <td className="px-6 py-4 text-xs">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                            style={{
                              backgroundColor: c.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                              color:           c.is_active ? '#34d399' : '#fca5a5',
                            }}>
                            {c.is_active ? t('companies.statusActive') : t('companies.statusInactive')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">{c.created_at}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEditModal(c)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-white transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">
                {editingCompany ? t('companies.editCompany') : t('companies.newCompany')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('companies.companyName')} *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. UzBuilders Corp"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                />
              </div>

              {/* Company Slug */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('companies.slugLabel')}</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. uzbuilders (auto-generated if empty)"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none font-mono"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('companies.statusLabel')}</label>
                <select
                  value={isActive ? '1' : '0'}
                  onChange={(e) => setIsActive(e.target.value === '1')}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  <option value="1">{t('companies.statusActive')}</option>
                  <option value="0">{t('companies.statusInactive')}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all text-slate-400"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {t('companies.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingCompany ? t('companies.save') : t('companies.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
