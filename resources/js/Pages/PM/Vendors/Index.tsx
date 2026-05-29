import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { Plus, Search, Star, Phone, Mail, MessageCircle, Loader2, HardHat, Edit2, ToggleRight, X } from 'lucide-react';
import AppShell from '@/Components/AppShell';

interface Vendor {
  id:                string;
  name:              string;
  phone:             string;
  email:             string | null;
  telegram_username: string | null;
  specializations:   string[];
  rating:            number | string;
  total_jobs:        number;
  completed_jobs:    number;
  is_active:         boolean;
  notes:             string | null;
}

interface Props {
  vendors: Vendor[];
}

const SPEC_RU: Record<string, string> = {
  plumbing:   'Plumbing',
  electrical: 'Electrical',
  heating:    'Heating',
  cleaning:   'Cleaning',
  elevator:   'Elevator',
  appliance:  'Appliances',
  structural: 'Structural',
  other:      'Other',
};

const ALL_SPECS = Object.keys(SPEC_RU);

export default function Index({ vendors }: Props) {
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('all');
  const [showActive, setShowActive] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingVendor(null);
    setName('');
    setPhone('');
    setEmail('');
    setTelegramUsername('');
    setSpecializations([]);
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (v: Vendor) => {
    setEditingVendor(v);
    setName(v.name);
    setPhone(v.phone);
    setEmail(v.email || '');
    setTelegramUsername(v.telegram_username || '');
    setSpecializations(v.specializations || []);
    setNotes(v.notes || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      name:              name.trim(),
      phone:             phone.trim(),
      email:             email.trim() || null,
      telegram_username: telegramUsername.trim() || null,
      specializations:   specializations,
      notes:             notes.trim() || null,
    };

    if (editingVendor) {
      router.put(`/pm/vendors/${editingVendor.id}`, { ...payload, is_active: editingVendor.is_active }, {
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    } else {
      router.post('/pm/vendors', payload, {
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    }
  };

  const handleToggleActive = (v: Vendor) => {
    router.put(`/pm/vendors/${v.id}`, {
      name:              v.name,
      phone:             v.phone,
      email:             v.email,
      telegram_username: v.telegram_username,
      specializations:   v.specializations,
      is_active:         !v.is_active,
      notes:             v.notes,
    }, {
      preserveScroll: true,
    });
  };

  // Filter vendors list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter((v) => {
      if (showActive ? !v.is_active : v.is_active) return false;
      if (specFilter !== 'all' && !v.specializations.includes(specFilter)) return false;
      if (q && !v.name.toLowerCase().includes(q) && !v.phone.includes(q)) return false;
      return true;
    });
  }, [vendors, search, specFilter, showActive]);

  const stats = useMemo(() => {
    const active = vendors.filter((v) => v.is_active).length;
    const archived = vendors.length - active;
    let avgRating = 0;
    if (active > 0) {
      avgRating = vendors.filter((v) => v.is_active).reduce((s, v) => s + (Number(v.rating) || 0), 0) / active;
    }
    const totalJobs = vendors.reduce((s, v) => s + (v.completed_jobs || 0), 0);
    return { active, archived, avgRating, totalJobs };
  }, [vendors]);

  const handleSpecCheckboxChange = (spec: string, checked: boolean) => {
    if (checked) {
      setSpecializations((prev) => [...prev, spec]);
    } else {
      setSpecializations((prev) => prev.filter((s) => s !== spec));
    }
  };

  return (
    <AppShell>
      <Head title="Vendors - PM PropTech UZ" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#34d399' }}>
            Property Management
          </p>
          <h1 className="text-2xl font-bold text-white mt-1">Vendors</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Service contractors, plumbers, and technicians
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-3 rounded-xl transition-all"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
        >
          <Plus className="w-4 h-4" />
          Add Vendor
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="Active"         value={String(stats.active)}    accent="#34d399" />
          <SummaryCard label="Archived"       value={String(stats.archived)}  accent="rgba(255,255,255,0.4)" />
          <SummaryCard label="Avg Rating"     value={stats.avgRating.toFixed(1)} accent="#fbbf24" />
          <SummaryCard label="Total Jobs Done" value={String(stats.totalJobs)} accent="#60a5fa" />
        </div>

        {/* Tab Filters and Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setShowActive(true)}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={{
                backgroundColor: showActive ? 'rgba(16,185,129,0.10)' : 'transparent',
                color:           showActive ? '#6ee7b7' : 'rgba(255,255,255,0.55)',
              }}
            >
              Active
            </button>
            <button
              onClick={() => setShowActive(false)}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={{
                backgroundColor: !showActive ? 'rgba(16,185,129,0.10)' : 'transparent',
                color:           !showActive ? '#6ee7b7' : 'rgba(255,255,255,0.55)',
              }}
            >
              Archive
            </button>
          </div>

          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor name or phone..."
              className="w-full rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-500"
              style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          <select
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
            style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="all">All Specializations</option>
            {ALL_SPECS.map((s) => (
              <option key={s} value={s}>{SPEC_RU[s]}</option>
            ))}
          </select>
        </div>

        {/* Vendors Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }}>
            <HardHat className="w-8 h-8 mx-auto mb-3 text-slate-500" />
            <p className="text-xs">No contractors found matching filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: '#0d1117',
                  border:          '1px solid rgba(255,255,255,0.06)',
                  opacity:         v.is_active ? 1 : 0.55,
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base text-white font-semibold truncate">{v.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{v.phone}</span>
                      {v.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{v.email}</span>}
                      {v.telegram_username && (
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />@{v.telegram_username}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(v)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                      title="Edit Vendor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(v)}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                      title={v.is_active ? 'Archive Vendor' : 'Restore Vendor'}
                    >
                      <ToggleRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {v.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {v.specializations.map((s) => (
                      <span
                        key={s}
                        className="text-[9px] px-2 py-0.5 rounded font-semibold"
                        style={{
                          backgroundColor: 'rgba(16,185,129,0.08)',
                          color:           '#6ee7b7',
                          border:          '1px solid rgba(16,185,129,0.2)',
                        }}
                      >
                        {SPEC_RU[s] ?? s}
                      </span>
                    ))}
                  </div>
                )}

                <div
                  className="flex items-center justify-between pt-3"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <Star
                        key={r}
                        className="w-3.5 h-3.5"
                        style={{
                          color: r <= Math.round(Number(v.rating)) ? '#fbbf24' : 'rgba(255,255,255,0.15)',
                          fill:  r <= Math.round(Number(v.rating)) ? '#fbbf24' : 'transparent',
                        }}
                      />
                    ))}
                    <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                      {Number(v.rating).toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {v.completed_jobs} / {v.total_jobs || v.completed_jobs} jobs done
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingVendor ? 'Edit Vendor' : 'New Vendor'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Vendor Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alisher Plumbing Service"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">Phone *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90..."
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>

                {/* Telegram Username */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Telegram Username</label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="e.g. user_tg"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>

              {/* Specializations checkboxes */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-slate-400">Specializations</label>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl" style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {ALL_SPECS.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={specializations.includes(s)}
                        onChange={(e) => handleSpecCheckboxChange(s, e.target.checked)}
                        className="rounded bg-[#0d1117] border-slate-600 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>{SPEC_RU[s]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reliable team of 3 plumbers, available for night emergencies..."
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-none"
                  style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold hover:bg-white/5 transition-all text-slate-400"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingVendor ? 'Save Changes' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: accent }}>{label}</p>
      <p className="text-2xl text-white mt-1.5 font-bold" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
    </div>
  );
}
