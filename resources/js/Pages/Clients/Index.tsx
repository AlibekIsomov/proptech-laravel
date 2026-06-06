import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Loader2, Search, Users, Mail, Phone, ChevronDown, Sparkles, Copy, Check, Home, Edit, Trash2 } from 'lucide-react';
import AppShell from '@/Components/AppShell';

interface Apartment {
  id:      string;
  number:  string;
  project: string;
}

interface Client {
  id:          string;
  full_name:   string;
  phone:       string | null;
  email:       string | null;
  status:      'new' | 'contacted' | 'viewing' | 'reserved' | 'bought';
  budget_usd:  number | string | null;
  source:      string | null;
  notes:       string | null;
  assigned_to: number | string | null;
  assignee:    string | null;
  apartment:   Apartment | null;
  created_at:  string;
}

interface Manager {
  id:        string | number;
  full_name: string;
}

interface ApartmentOption {
  id:    string;
  label: string;
}

interface Props {
  clients:    Client[];
  managers:   Manager[];
  apartments: ApartmentOption[];
}

const STATUS_CONFIG: Record<string, { labelKey: string; bg: string; text: string; dot: string }> = {
  new:       { labelKey: 'clients.statusNew',       bg: 'var(--border)', text: '#64748b', dot: '#475569' },
  contacted: { labelKey: 'clients.statusContacted', bg: '#1e1b4b',      text: '#a5b4fc', dot: '#6366f1' },
  viewing:   { labelKey: 'clients.statusViewing',   bg: '#1c1003',      text: '#fbbf24', dot: '#f59e0b' },
  reserved:  { labelKey: 'clients.statusReserved',  bg: '#052e16',      text: '#34d399', dot: '#10b981' },
  bought:    { labelKey: 'clients.statusBought',    bg: '#14532d',      text: '#86efac', dot: '#22c55e' },
};

const ALL_STATUSES = ['new', 'contacted', 'viewing', 'reserved', 'bought'];

export default function Index({ clients, managers, apartments }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'viewing' | 'reserved' | 'bought'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [budgetUsd, setBudgetUsd] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [apartmentId, setApartmentId] = useState('');
  const [status, setStatus] = useState<'new' | 'contacted' | 'viewing' | 'reserved' | 'bought'>('new');
  
  const [downPayment, setDownPayment] = useState('');
  const [durationMonths, setDurationMonths] = useState('12');

  const [submitting, setSubmitting] = useState(false);

  // AI Email Modal State
  const [emailClientId, setEmailClientId] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const openCreateModal = () => {
    setEditingClient(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setBudgetUsd('');
    setSource('');
    setNotes('');
    setAssignedTo('');
    setApartmentId('');
    setStatus('new');
    setDownPayment('');
    setDurationMonths('12');
    setShowModal(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFullName(client.full_name);
    setPhone(client.phone || '');
    setEmail(client.email || '');
    setBudgetUsd(client.budget_usd ? String(client.budget_usd) : '');
    setSource(client.source || '');
    setNotes(client.notes || '');
    setAssignedTo(client.assigned_to ? String(client.assigned_to) : '');
    setApartmentId(client.apartment ? client.apartment.id : '');
    setStatus(client.status);
    setDownPayment('');
    setDurationMonths('12');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      full_name:    fullName.trim(),
      phone:        phone.trim() || null,
      email:        email.trim() || null,
      budget_usd:   budgetUsd ? Number(budgetUsd) : null,
      source:       source.trim() || null,
      notes:        notes.trim() || null,
      assigned_to:  assignedTo ? Number(assignedTo) : null,
      apartment_id: apartmentId || null,
      status:       status,
      installment:  status === 'bought' && apartmentId ? {
        down_payment: downPayment ? Number(downPayment) : 0,
        duration_months: durationMonths ? Number(durationMonths) : 12,
      } : undefined,
    };

    if (editingClient) {
      router.put(`/clients/${editingClient.id}`, payload, {
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    } else {
      router.post('/clients', payload, {
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      router.delete(`/clients/${id}`);
    }
  };

  const handleStatusChange = (id: string, newStatus: any) => {
    router.put(`/clients/${id}`, {
      status: newStatus,
      // Pass other fields required
    }, {
      preserveScroll: true,
    });
  };

  // AI Email Generator
  const handleGenerateEmail = (client: Client) => {
    setEmailClientId(client.id);
    setEmailError(null);
    setGeneratedEmail(null);
    setEmailLoading(true);
    setCopied(false);

    const aptInfo = client.apartment
      ? `Apartment #${client.apartment.number} in project ${client.apartment.project}`
      : 'No apartment linked yet';

    const contextInfo = `Budget: ${client.budget_usd ? '$' + client.budget_usd : 'Not specified'}. Notes: ${client.notes || 'No extra notes'}. Client status is ${client.status}.`;

    fetch('/api/ai-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
      },
      body: JSON.stringify({
        client_name:    client.full_name,
        apartment_info: aptInfo,
        context:        contextInfo,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('AI server returned error');
        return res.json();
      })
      .then((data) => {
        setGeneratedEmail(data.email);
        setEmailLoading(false);
      })
      .catch((err) => {
        setEmailError(err.message || 'Failed to generate email');
        setEmailLoading(false);
      });
  };

  const closeEmailModal = () => {
    setEmailClientId(null);
    setGeneratedEmail(null);
    setEmailError(null);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!generatedEmail) return;
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter clients
  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        !search ||
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
        (c.phone && c.phone.includes(search));

      const matchStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [clients, search, statusFilter]);

  const counts = useMemo(() => {
    return clients.reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {});
  }, [clients]);

  const emailClient = emailClientId ? clients.find((c) => c.id === emailClientId) : null;

  return (
    <AppShell>
      <Head title="Clients - 1Mahalla" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('clients.title')}</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            {filtered.length} {t('clients.of')} {clients.length} {t('clients.totalLeads')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <Search className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder={t('clients.searchPlaceholder')}
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
            {t('clients.newLead')}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {(['all', 'new', 'contacted', 'viewing', 'reserved', 'bought'] as const).map((s) => {
            const active = statusFilter === s;
            const count = s === 'all' ? clients.length : (counts[s] ?? 0);
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="flex items-center gap-2 text-xs px-4 py-2 rounded-full border transition-all"
                style={{
                  backgroundColor: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  borderColor:     active ? '#6366f1' : 'var(--border)',
                  color:           active ? '#a5b4fc' : 'var(--muted)',
                }}
              >
                <span className="capitalize">{s}</span>
                <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: active ? '#6366f1' : 'var(--border)', color: 'white' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table representation */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Users className="w-10 h-10" style={{ color: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('clients.noClientsFound')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {[t('clients.colName'), t('clients.colContact'), t('clients.colBudget'), t('clients.colApartment'), t('clients.colStatus'), t('clients.colAssignee'), t('clients.colAiActions'), t('clients.colActions')].map((h) => (
                      <th key={h} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((client) => {
                    const cfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.new;
                    return (
                      <tr key={client.id} className="transition-all hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
                              style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}>
                              {client.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{client.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {client.phone && <p className="text-slate-800 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{client.phone}</p>}
                          {client.email && <p className="text-slate-400 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3 text-slate-400" />{client.email}</p>}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                          {client.budget_usd ? `$${Number(client.budget_usd).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-800">
                          {client.apartment ? (
                            <div className="flex items-center gap-1 text-indigo-400 font-mono">
                              <Home className="w-3 h-3 shrink-0" />
                              <span>№{client.apartment.number}</span>
                              <span className="text-[10px] text-slate-500">({client.apartment.project})</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                              style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                              {t(cfg.labelKey)}
                            </span>
                            <div className="relative inline-flex items-center">
                              <select value={client.status}
                                onChange={(e) => handleStatusChange(client.id, e.target.value)}
                                className="appearance-none text-[10px] pr-5 pl-1 py-0.5 rounded-md outline-none cursor-pointer"
                                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                                {ALL_STATUSES.map((s) => (
                                  <option key={s} value={s}>{t(STATUS_CONFIG[s].labelKey)}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-1 pointer-events-none w-2.5 h-2.5" style={{ color: 'var(--muted)' }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-800">{client.assignee || '—'}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleGenerateEmail(client)}
                            className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl border border-indigo-500/25 text-indigo-400 hover:text-white transition-all bg-slate-50 hover:bg-indigo-600/10"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            AI Email
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEditModal(client)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-white transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
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
          <div className="w-full max-w-md rounded-2xl border p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">
                {editingClient ? t('clients.editLeadTitle') : t('clients.newLeadTitle')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.fullName')} *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dilshod Karimov"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.phone')}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90..."
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.emailLabel')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Budget */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.budget')}</label>
                  <input
                    type="number"
                    value={budgetUsd}
                    onChange={(e) => setBudgetUsd(e.target.value)}
                    placeholder="e.g. 50000"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.statusLabel')}</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{t(STATUS_CONFIG[s].labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Source */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.leadSource')}</label>
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. Telegram, Site"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* Apartment selector */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.apartment')}</label>
                  <select
                    value={apartmentId}
                    onChange={(e) => setApartmentId(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    <option value="">{t('clients.noApartment')}</option>
                    {apartments.map((a) => (
                      <option key={a.id} value={a.id}>{a.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Installment Plan section if bought */}
              {status === 'bought' && apartmentId && (
                <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-50/50 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Bo'lib to'lash (Installment Plan)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-slate-600">Boshlang'ich to'lov (USD)</label>
                      <input
                        type="number"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                        placeholder="e.g. 20000"
                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 text-slate-600">Muddat (oy)</label>
                      <input
                        type="number"
                        value={durationMonths}
                        onChange={(e) => setDurationMonths(e.target.value)}
                        placeholder="e.g. 24"
                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                        style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Assignee */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.assignedManager')}</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                >
                  <option value="">{t('clients.selectManager')}</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.notes')}</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pre-approved bank mortgage, looking for custom payment plans..."
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
                  {t('clients.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingClient ? t('clients.save') : t('clients.createLead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Email Modal */}
      {emailClientId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-lg rounded-2xl border flex flex-col max-h-[85vh]"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
              style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{t('clients.aiEmailTitle')}</h3>
                  {emailClient && <p className="text-[10px] text-slate-400">{t('clients.aiEmailFor')} {emailClient.full_name}</p>}
                </div>
              </div>
              <button onClick={closeEmailModal}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {emailLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs text-slate-400">Claude is composing the email draft...</p>
                </div>
              )}

              {emailError && (
                <div className="rounded-xl px-4 py-3 text-xs border"
                  style={{ backgroundColor: '#1f0a0a', borderColor: '#7f1d1d', color: '#fca5a5' }}>
                  {emailError}
                </div>
              )}

              {generatedEmail && !emailLoading && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">{t('clients.generatedMessage')}</label>
                  <div className="rounded-xl p-4 text-xs leading-relaxed whitespace-pre-wrap"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)', color: '#cbd5e1' }}>
                    {generatedEmail}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {generatedEmail && !emailLoading && (
              <div className="px-6 py-4 border-t shrink-0 flex gap-3"
                style={{ borderColor: 'var(--border)' }}>
                <button onClick={closeEmailModal}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 text-slate-400"
                  style={{ border: '1px solid var(--border)' }}>
                  {t('clients.close')}
                </button>
                <button onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                  style={{ backgroundColor: copied ? '#052e16' : '#6366f1',
                           color: copied ? '#34d399' : 'white' }}>
                  {copied ? <><Check className="w-4 h-4" />{t('clients.copied')}</> : <><Copy className="w-4 h-4" />{t('clients.copy')}</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
