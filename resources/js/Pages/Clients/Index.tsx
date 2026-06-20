import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Copy, Check, Users } from 'lucide-react';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Btn, Badge, Field, TextInput, PmSelect, EmptyState, Avatar,
  Plus, Search, Home, Sparkles, Loader2, Edit2, Trash2, X,
} from '@/Components/pm/ui';
import type { BadgeTone } from '@/Components/pm/ui';

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

const STATUS_TONE: Record<string, BadgeTone> = { new: 'neutral', contacted: 'info', viewing: 'warn', reserved: 'brand', bought: 'ok' };
const STATUS_LABEL_KEY: Record<string, string> = {
  new:       'clients.statusNew',
  contacted: 'clients.statusContacted',
  viewing:   'clients.statusViewing',
  reserved:  'clients.statusReserved',
  bought:    'clients.statusBought',
};

const ALL_STATUSES = ['new', 'contacted', 'viewing', 'reserved', 'bought'] as const;

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

  function openCreateModal() {
    setEditingClient(null);
    setFullName(''); setPhone(''); setEmail(''); setBudgetUsd(''); setSource(''); setNotes('');
    setAssignedTo(''); setApartmentId(''); setStatus('new'); setDownPayment(''); setDurationMonths('12');
    setShowModal(true);
  }

  function openEditModal(client: Client) {
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
  }

  function handleSubmit(e: React.FormEvent) {
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
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    } else {
      router.post('/clients', payload, {
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    }
  }

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this client?')) {
      router.delete(`/clients/${id}`);
    }
  }

  function handleStatusChange(id: string, newStatus: any) {
    router.put(`/clients/${id}`, { status: newStatus }, { preserveScroll: true });
  }

  // AI Email Generator
  function handleGenerateEmail(client: Client) {
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
  }

  function closeEmailModal() {
    setEmailClientId(null);
    setGeneratedEmail(null);
    setEmailError(null);
    setCopied(false);
  }

  function handleCopy() {
    if (!generatedEmail) return;
    navigator.clipboard.writeText(generatedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
      <Head title={t('clients.title') + ' — 1Mahalla'} />
      <div className="page">
        <PageHead
          title={t('clients.title')}
          sub={`${filtered.length} ${t('clients.of')} ${clients.length} ${t('clients.totalLeads')}`}
          actions={<Btn variant="primary" icon={Plus} onClick={openCreateModal}>{t('clients.newLead')}</Btn>}
        />

        <div className="card card-pad" style={{ marginBottom: 18, maxWidth: 360 }}>
          <Field><TextInput icon={Search} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('clients.searchPlaceholder')} /></Field>
        </div>

        <div className="chip-row" style={{ marginBottom: 18 }}>
          {(['all', ...ALL_STATUSES] as const).map(s => {
            const count = s === 'all' ? clients.length : (counts[s] ?? 0);
            const label = s === 'all' ? t('clients.allStatuses', { defaultValue: 'Hammasi' }) : t(STATUS_LABEL_KEY[s]);
            return (
              <button key={s} className={`chip ${statusFilter === s ? 'on' : ''}`} onClick={() => setStatusFilter(s)}>
                {label}<span className="cnt">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="table-card">
          {filtered.length === 0 ? (
            <EmptyState icon={Users} title={t('clients.noClientsFound')} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('clients.colName')}</th>
                    <th>{t('clients.colContact')}</th>
                    <th>{t('clients.colBudget')}</th>
                    <th>{t('clients.colApartment')}</th>
                    <th>{t('clients.colStatus')}</th>
                    <th>{t('clients.colAssignee')}</th>
                    <th>{t('clients.colAiActions')}</th>
                    <th>{t('clients.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(client => (
                    <tr key={client.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={client.full_name} color="c3" size={32} />
                          <span className="cell-strong">{client.full_name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone className="ic" style={{ width: 12, height: 12, color: 'var(--text-faint)' }} />{client.phone}</div>}
                        {client.email && <div className="cell-sub" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Mail className="ic" style={{ width: 12, height: 12 }} />{client.email}</div>}
                      </td>
                      <td className="cell-strong">{client.budget_usd ? `$${Number(client.budget_usd).toLocaleString()}` : '—'}</td>
                      <td>
                        {client.apartment ? (
                          <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand)', fontSize: 12 }}>
                            <Home className="ic" style={{ width: 12, height: 12 }} />
                            №{client.apartment.number}
                            <span className="cell-sub" style={{ fontFamily: 'var(--font)' }}>({client.apartment.project})</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge tone={STATUS_TONE[client.status] ?? 'neutral'}>{t(STATUS_LABEL_KEY[client.status])}</Badge>
                          <select className="select" style={{ fontSize: 10.5, padding: '2px 6px' }}
                            value={client.status} onChange={e => handleStatusChange(client.id, e.target.value)}>
                            {ALL_STATUSES.map(s => <option key={s} value={s}>{t(STATUS_LABEL_KEY[s])}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="cell-sub">{client.assignee || '—'}</td>
                      <td>
                        <Btn variant="soft" size="sm" icon={Sparkles} onClick={() => handleGenerateEmail(client)}>AI Email</Btn>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-act" onClick={() => openEditModal(client)}><Edit2 className="ic" /></button>
                          <button className="icon-act danger" onClick={() => handleDelete(client.id)}><Trash2 className="ic" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="scrim show" onClick={() => setShowModal(false)}>
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => e.stopPropagation()}>
            <div className="card card-pad" style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>{editingClient ? t('clients.editLeadTitle') : t('clients.newLeadTitle')}</h2>
                <button className="drawer-close" onClick={() => setShowModal(false)}><X className="ic" /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={`${t('clients.fullName')} *`}>
                  <TextInput type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Dilshod Karimov" />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label={t('clients.phone')}>
                    <TextInput type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90..." />
                  </Field>
                  <Field label={t('clients.emailLabel')}>
                    <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label={t('clients.budget')}>
                    <TextInput type="number" value={budgetUsd} onChange={e => setBudgetUsd(e.target.value)} placeholder="e.g. 50000" />
                  </Field>
                  <Field label={t('clients.statusLabel')}>
                    <PmSelect value={status} onChange={e => setStatus(e.target.value as any)}>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{t(STATUS_LABEL_KEY[s])}</option>)}
                    </PmSelect>
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label={t('clients.leadSource')}>
                    <TextInput type="text" value={source} onChange={e => setSource(e.target.value)} placeholder="e.g. Telegram, Site" />
                  </Field>
                  <Field label={t('clients.apartment')}>
                    <PmSelect value={apartmentId} onChange={e => setApartmentId(e.target.value)}>
                      <option value="">{t('clients.noApartment')}</option>
                      {apartments.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </PmSelect>
                  </Field>
                </div>

                {status === 'bought' && apartmentId && (
                  <div className="card card-pad" style={{ borderColor: 'var(--brand)' }}>
                    <div className="field-label" style={{ marginBottom: 10 }}>Bo'lib to'lash (Installment Plan)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <Field label="Boshlang'ich to'lov (USD)">
                        <TextInput type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)} placeholder="e.g. 20000" />
                      </Field>
                      <Field label="Muddat (oy)">
                        <TextInput type="number" value={durationMonths} onChange={e => setDurationMonths(e.target.value)} placeholder="e.g. 24" />
                      </Field>
                    </div>
                  </div>
                )}

                <Field label={t('clients.assignedManager')}>
                  <PmSelect value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                    <option value="">{t('clients.selectManager')}</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </PmSelect>
                </Field>

                <Field label={t('clients.notes')}>
                  <textarea
                    className="input" rows={3} style={{ resize: 'none' }}
                    value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Pre-approved bank mortgage, looking for custom payment plans..."
                  />
                </Field>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <Btn variant="ghost" block type="button" onClick={() => setShowModal(false)}>{t('clients.cancel')}</Btn>
                  <Btn variant="primary" block type="submit" disabled={submitting} icon={submitting ? Loader2 : undefined}>
                    {editingClient ? t('clients.save') : t('clients.createLead')}
                  </Btn>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Email Modal */}
      {emailClientId && (
        <div className="scrim show" onClick={closeEmailModal}>
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => e.stopPropagation()}>
            <div className="card" style={{ width: '100%', maxWidth: 520, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles className="ic" style={{ color: 'var(--brand)' }} />
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>{t('clients.aiEmailTitle')}</h3>
                    {emailClient && <p className="cell-sub" style={{ marginTop: 2 }}>{t('clients.aiEmailFor')} {emailClient.full_name}</p>}
                  </div>
                </div>
                <button className="drawer-close" onClick={closeEmailModal}><X className="ic" /></button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {emailLoading && (
                  <div className="empty" style={{ padding: '40px 0' }}>
                    <Loader2 className="ic" style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
                    <p style={{ marginTop: 10 }}>Claude is composing the email draft...</p>
                  </div>
                )}

                {emailError && <div className="hint warn">{emailError}</div>}

                {generatedEmail && !emailLoading && (
                  <Field label={t('clients.generatedMessage')}>
                    <div className="card" style={{ padding: 14, fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-soft)' }}>
                      {generatedEmail}
                    </div>
                  </Field>
                )}
              </div>

              {generatedEmail && !emailLoading && (
                <div style={{ display: 'flex', gap: 10, padding: 16, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                  <Btn variant="ghost" block onClick={closeEmailModal}>{t('clients.close')}</Btn>
                  <Btn variant={copied ? 'soft' : 'primary'} block icon={copied ? Check : Copy} onClick={handleCopy}>
                    {copied ? t('clients.copied') : t('clients.copy')}
                  </Btn>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
