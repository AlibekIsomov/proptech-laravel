import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Plus, Search, Star, Phone, Mail, MessageCircle, Loader2, HardHat,
    Edit2, ToggleRight, X, Eye, CheckCircle2, Clock, AlertCircle,
    DollarSign, Wrench, ChevronRight,
} from 'lucide-react';
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

interface VendorRequest {
  id:              string;
  title:           string;
  category:        string | null;
  priority:        string;
  status:          string;
  apartment:       string | null;
  building:        string | null;
  cost_amount:     number | null;
  resident_rating: number | null;
  created_at:      string;
  completed_at:    string | null;
}

interface VendorDetail {
  vendor:   Vendor;
  requests: VendorRequest[];
  stats: {
    total:        number;
    completed:    number;
    in_progress:  number;
    open:         number;
    total_earned: number;
    avg_rating:   number | null;
  };
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

  // Detail modal
  const [detailData,    setDetailData]    = useState<VendorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (v: Vendor) => {
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res  = await fetch(`/pm/vendors/${v.id}`, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      setDetailData(data);
    } catch {
      /* silent */
    } finally {
      setDetailLoading(false);
    }
  };

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
      if (specFilter !== 'all' && !(v.specializations ?? []).includes(specFilter)) return false;
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
      <Head title="Vendors - PM 1Mahalla" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#34d399' }}>
            Property Management
          </p>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Vendors</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
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
          <SummaryCard label="Archived"       value={String(stats.archived)}  accent="var(--muted)" />
          <SummaryCard label="Avg Rating"     value={stats.avgRating.toFixed(1)} accent="#fbbf24" />
          <SummaryCard label="Total Jobs Done" value={String(stats.totalJobs)} accent="#60a5fa" />
        </div>

        {/* Tab Filters and Search */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowActive(true)}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={{
                backgroundColor: showActive ? 'rgba(16,185,129,0.10)' : 'transparent',
                color:           showActive ? '#6ee7b7' : 'var(--muted)',
              }}
            >
              Active
            </button>
            <button
              onClick={() => setShowActive(false)}
              className="px-4 py-2 text-xs font-semibold transition-all"
              style={{
                backgroundColor: !showActive ? 'rgba(16,185,129,0.10)' : 'transparent',
                color:           !showActive ? '#6ee7b7' : 'var(--muted)',
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
              className="w-full rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            />
          </div>

          <select
            value={specFilter}
            onChange={(e) => setSpecFilter(e.target.value)}
            className="rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <option value="all">All Specializations</option>
            {ALL_SPECS.map((s) => (
              <option key={s} value={s}>{SPEC_RU[s]}</option>
            ))}
          </select>
        </div>

        {/* Vendors Grid */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ border: '1px dashed var(--border)', color: 'var(--muted)' }}>
            <HardHat className="w-8 h-8 mx-auto mb-3 text-slate-500" />
            <p className="text-xs">No contractors found matching filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
                style={{
                  backgroundColor: 'var(--card)',
                  border:          '1px solid var(--border)',
                  opacity:         v.is_active ? 1 : 0.55,
                }}
                onClick={() => openDetail(v)}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base text-slate-800 font-semibold truncate">{v.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                      <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{v.phone}</span>
                      {v.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{v.email}</span>}
                      {v.telegram_username && (
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />@{v.telegram_username}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => openDetail(v)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                      title="Ko'rish"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(v)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                      title="Tahrirlash"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(v)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                      title={v.is_active ? 'Arxivlash' : 'Faollashtirish'}
                    >
                      <ToggleRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {(v.specializations?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(v.specializations ?? []).map((s) => (
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
                  style={{ borderTop: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <Star
                        key={r}
                        className="w-3.5 h-3.5"
                        style={{
                          color: r <= Math.round(Number(v.rating)) ? '#fbbf24' : 'var(--border)',
                          fill:  r <= Math.round(Number(v.rating)) ? '#fbbf24' : 'transparent',
                        }}
                      />
                    ))}
                    <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>
                      {Number(v.rating).toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {v.completed_jobs} / {v.total_jobs || v.completed_jobs} jobs done
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Vendor Detail Modal ── */}
      {(detailLoading || detailData) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setDetailData(null); setDetailLoading(false); }}>
          <div className="w-full max-w-2xl rounded-2xl border max-h-[90vh] flex flex-col"
            style={{ backgroundColor: 'var(--card)', borderColor: 'rgba(16,185,129,0.15)' }}
            onClick={e => e.stopPropagation()}>

            {detailLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#10b981' }} />
              </div>
            ) : detailData && (
              <>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b"
                  style={{ borderColor: 'rgba(16,185,129,0.10)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg"
                      style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                      {detailData.vendor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">{detailData.vendor.name}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-0.5 text-[11px]" style={{ color: 'var(--muted)' }}>
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{detailData.vendor.phone}</span>
                        {detailData.vendor.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{detailData.vendor.email}</span>}
                        {detailData.vendor.telegram_username && <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />@{detailData.vendor.telegram_username}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setDetailData(null); setDetailLoading(false); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 px-6 py-4 border-b"
                    style={{ borderColor: 'rgba(16,185,129,0.08)' }}>
                    {[
                      { label: "Jami ish",      value: detailData.stats.total,        color: '#6366f1', icon: Wrench         },
                      { label: "Bajarilgan",    value: detailData.stats.completed,    color: '#10b981', icon: CheckCircle2   },
                      { label: "Jarayonda",     value: detailData.stats.in_progress,  color: '#f59e0b', icon: Clock          },
                      { label: "Kutilmoqda",    value: detailData.stats.open,         color: '#94a3b8', icon: AlertCircle    },
                    ].map(({ label, value, color, icon: Icon }) => (
                      <div key={label} className="rounded-xl p-3 text-center"
                        style={{ backgroundColor: `${color}0F`, border: `1px solid ${color}25` }}>
                        <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                        <p className="text-xl font-bold text-slate-800">{value}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Earnings + Rating + Specializations */}
                  <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b"
                    style={{ borderColor: 'rgba(16,185,129,0.08)' }}>
                    {detailData.stats.total_earned > 0 && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#10b981' }}>
                        <DollarSign className="w-3.5 h-3.5" />
                        Umumiy: {detailData.stats.total_earned.toLocaleString()} UZS
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(r => (
                        <Star key={r} className="w-3.5 h-3.5"
                          style={{ color: r <= Math.round(detailData.vendor.rating) ? '#fbbf24' : 'var(--border)', fill: r <= Math.round(detailData.vendor.rating) ? '#fbbf24' : 'transparent' }} />
                      ))}
                      <span className="text-xs ml-1 text-slate-500">{Number(detailData.vendor.rating).toFixed(1)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {(detailData.vendor.specializations ?? []).map(s => (
                        <span key={s} className="text-[9px] px-2 py-0.5 rounded font-semibold"
                          style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.2)' }}>
                          {SPEC_RU[s] ?? s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {detailData.vendor.notes && (
                    <div className="px-6 py-3 border-b text-xs text-slate-500"
                      style={{ borderColor: 'rgba(16,185,129,0.08)' }}>
                      {detailData.vendor.notes}
                    </div>
                  )}

                  {/* Request history */}
                  <div className="px-6 py-4">
                    <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#94a3b8' }}>
                      Ishlar tarixi ({detailData.requests.length} ta)
                    </p>
                    {detailData.requests.length === 0 ? (
                      <div className="text-center py-8 text-sm text-slate-400">
                        Hali birorta ish tayinlanmagan
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {detailData.requests.map(req => {
                          const statusCfg = {
                            open:        { label: 'Kutilmoqda',  color: '#f59e0b' },
                            assigned:    { label: 'Tayinlangan', color: '#a78bfa' },
                            in_progress: { label: 'Jarayonda',   color: '#60a5fa' },
                            completed:   { label: 'Bajarildi',   color: '#10b981' },
                            cancelled:   { label: 'Bekor',       color: '#94a3b8' },
                          }[req.status] ?? { label: req.status, color: '#94a3b8' };

                          const priorityCfg = {
                            emergency: { label: 'Emergency', color: '#ef4444' },
                            high:      { label: 'Yuqori',    color: '#f97316' },
                            medium:    { label: "O'rta",     color: '#3b82f6' },
                            low:       { label: 'Past',      color: '#94a3b8' },
                          }[req.priority] ?? { label: req.priority, color: '#94a3b8' };

                          return (
                            <div key={req.id} className="rounded-xl px-4 py-3 flex items-start gap-3"
                              style={{ backgroundColor: 'var(--bg)', border: '1px solid rgba(16,185,129,0.08)' }}>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{req.title}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {req.building && (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                      <ChevronRight className="w-3 h-3" />
                                      {req.building} {req.apartment && `№${req.apartment}`}
                                    </span>
                                  )}
                                  {req.category && (
                                    <span className="text-[10px] text-slate-400">{SPEC_RU[req.category] ?? req.category}</span>
                                  )}
                                  <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{req.created_at}</span>
                                  {req.completed_at && (
                                    <span className="text-[10px]" style={{ color: '#10b981' }}>✓ {req.completed_at}</span>
                                  )}
                                </div>
                                {req.cost_amount && req.cost_amount > 0 && (
                                  <p className="text-[10px] mt-1 font-semibold" style={{ color: '#10b981' }}>
                                    {Number(req.cost_amount).toLocaleString()} UZS
                                  </p>
                                )}
                              </div>
                              <div className="shrink-0 flex flex-col items-end gap-1.5">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: `${statusCfg.color}18`, color: statusCfg.color }}>
                                  {statusCfg.label}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: `${priorityCfg.color}18`, color: priorityCfg.color }}>
                                  {priorityCfg.label}
                                </span>
                                {req.resident_rating && req.resident_rating > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    {[1,2,3,4,5].map(r => (
                                      <Star key={r} className="w-2.5 h-2.5"
                                        style={{ color: r <= req.resident_rating! ? '#fbbf24' : '#e2e8f0', fill: r <= req.resident_rating! ? '#fbbf24' : 'transparent' }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t" style={{ borderColor: 'rgba(16,185,129,0.08)' }}>
                  <button
                    onClick={() => { openEditModal(detailData.vendor); setDetailData(null); }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ backgroundColor: 'rgba(16,185,129,0.10)', color: '#10b981', border: '1px solid rgba(16,185,129,0.20)' }}>
                    Tahrirlash
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">
                {editingVendor ? 'Edit Vendor' : 'New Vendor'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-white"
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
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
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
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
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
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
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
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              {/* Specializations checkboxes */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-slate-400">Specializations</label>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
                  {ALL_SPECS.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={specializations.includes(s)}
                        onChange={(e) => handleSpecCheckboxChange(s, e.target.checked)}
                        className="rounded bg-white border-slate-200 text-emerald-500 focus:ring-emerald-500"
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
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none resize-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all text-slate-400"
                  style={{ border: '1px solid var(--border)' }}
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
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: accent }}>{label}</p>
      <p className="text-2xl text-slate-800 mt-1.5 font-bold" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
    </div>
  );
}

