import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { HardHat, ToggleRight } from 'lucide-react';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Stat, Badge, Btn, Drawer, Field, TextInput, PmSelect, Avatar, Seg, EmptyState,
  priorityTone, ticketStatusTone, CATEGORY_KEYS, categoryI18nKey,
  Plus, Search, Star, Phone, Mail, MessageCircle, Loader2,
  Edit2, X, CheckCircle2, Clock, AlertCircle, DollarSign, Wrench, ChevronRight,
} from '@/Components/pm/ui';

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

interface Props { vendors: Vendor[]; }

const ALL_SPECS = CATEGORY_KEYS;

export default function Index({ vendors }: Props) {
  const { t } = useTranslation();
  const [search, setSearch]       = useState('');
  const [specFilter, setSpecFilter] = useState('all');
  const [showActive, setShowActive] = useState(true);

  // Form modal
  const [showModal, setShowModal]       = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [name, setName]                   = useState('');
  const [phone, setPhone]                 = useState('');
  const [email, setEmail]                 = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [specializations, setSpecializations]   = useState<string[]>([]);
  const [notes, setNotes]                 = useState('');
  const [submitting, setSubmitting]       = useState(false);

  // Detail drawer
  const [detailData, setDetailData]       = useState<VendorDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (v: Vendor) => {
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res  = await fetch(`/pm/vendors/${v.id}`, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      setDetailData(data);
    } catch { /* silent */ }
    finally { setDetailLoading(false); }
  };

  function openCreateModal() {
    setEditingVendor(null);
    setName(''); setPhone(''); setEmail(''); setTelegramUsername(''); setSpecializations([]); setNotes('');
    setShowModal(true);
  }

  function openEditModal(v: Vendor) {
    setEditingVendor(v);
    setName(v.name); setPhone(v.phone); setEmail(v.email || '');
    setTelegramUsername(v.telegram_username || '');
    setSpecializations(v.specializations || []); setNotes(v.notes || '');
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = { name: name.trim(), phone: phone.trim(), email: email.trim() || null, telegram_username: telegramUsername.trim() || null, specializations, notes: notes.trim() || null };
    if (editingVendor) {
      router.put(`/pm/vendors/${editingVendor.id}`, { ...payload, is_active: editingVendor.is_active }, {
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    } else {
      router.post('/pm/vendors', payload, {
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    }
  }

  function handleToggleActive(v: Vendor) {
    router.put(`/pm/vendors/${v.id}`, { name: v.name, phone: v.phone, email: v.email, telegram_username: v.telegram_username, specializations: v.specializations, is_active: !v.is_active, notes: v.notes }, { preserveScroll: true });
  }

  function toggleSpec(spec: string, checked: boolean) {
    setSpecializations(prev => checked ? [...prev, spec] : prev.filter(s => s !== spec));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vendors.filter(v => {
      if (showActive ? !v.is_active : v.is_active) return false;
      if (specFilter !== 'all' && !(v.specializations ?? []).includes(specFilter)) return false;
      if (q && !v.name.toLowerCase().includes(q) && !v.phone.includes(q)) return false;
      return true;
    });
  }, [vendors, search, specFilter, showActive]);

  const stats = useMemo(() => {
    const active   = vendors.filter(v => v.is_active).length;
    const archived = vendors.length - active;
    let avgRating  = 0;
    if (active > 0) avgRating = vendors.filter(v => v.is_active).reduce((s, v) => s + (Number(v.rating) || 0), 0) / active;
    const totalJobs = vendors.reduce((s, v) => s + (v.completed_jobs || 0), 0);
    return { active, archived, avgRating, totalJobs };
  }, [vendors]);

  const isDrawerOpen = detailLoading || !!detailData;

  return (
    <AppShell>
      <Head title={t('pmVendors.title') + ' — PM'} />
      <div className="page">
        <PageHead
          eyebrow={t('common.propertyMgmt')}
          title={t('pmVendors.title')}
          sub={t('pmVendors.subtitle')}
          actions={<Btn variant="primary" icon={Plus} onClick={openCreateModal}>{t('pmVendors.addVendor')}</Btn>}
        />

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <Stat label={t('pmVendors.active')}    value={stats.active}                icon={HardHat}      tone="ok"      />
          <Stat label={t('pmVendors.archived')}  value={stats.archived}              icon={AlertCircle}  tone="neutral" />
          <Stat label={t('pmVendors.avgRating')} value={stats.avgRating.toFixed(1)}  icon={Star as any}  tone="warn"    />
          <Stat label={t('pmVendors.totalJobs')} value={stats.totalJobs}             icon={Wrench}       tone="info"    />
        </div>

        {/* Filters */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <Seg
              value={showActive ? 'active' : 'archived'}
              onChange={v => setShowActive(v === 'active')}
              options={[
                { value: 'active',   label: t('pmVendors.activeTab')  },
                { value: 'archived', label: t('pmVendors.archiveTab') },
              ]}
            />
            <div style={{ flex: '1 1 200px', maxWidth: 340 }}>
              <Field>
                <TextInput icon={Search} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('pmVendors.searchPlaceholder')} />
              </Field>
            </div>
            <Field>
              <PmSelect value={specFilter} onChange={e => setSpecFilter(e.target.value)}>
                <option value="all">{t('pmVendors.allSpecs')}</option>
                {ALL_SPECS.map(s => <option key={s} value={s}>{t(categoryI18nKey(s))}</option>)}
              </PmSelect>
            </Field>
          </div>
        </div>

        {/* Vendor cards */}
        {filtered.length === 0 ? (
          <EmptyState icon={HardHat} title={t('pmVendors.noVendors')} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {filtered.map(v => (
              <div
                key={v.id}
                className="card card-pad"
                style={{ cursor: 'pointer', opacity: v.is_active ? 1 : 0.55, display: 'flex', flexDirection: 'column', gap: 12 }}
                onClick={() => openDetail(v)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <Avatar name={v.name} color="c2" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 3, color: 'var(--text-3)', fontSize: 11 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone className="ic" />{v.phone}</span>
                        {v.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail className="ic" />{v.email}</span>}
                        {v.telegram_username && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MessageCircle className="ic" />@{v.telegram_username}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button className="icon-act" onClick={() => openEditModal(v)} title="Edit"><Edit2 className="ic" /></button>
                    <button className="icon-act" onClick={() => handleToggleActive(v)} title={v.is_active ? 'Archive' : 'Activate'}><ToggleRight className="ic" /></button>
                  </div>
                </div>

                {(v.specializations?.length ?? 0) > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {(v.specializations ?? []).map(s => <Badge key={s} tone="ok">{t(categoryI18nKey(s))}</Badge>)}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(r => (
                      <Star key={r} className="ic" style={{ color: r <= Math.round(Number(v.rating)) ? 'var(--warn)' : 'var(--border)', fill: r <= Math.round(Number(v.rating)) ? 'var(--warn)' : 'transparent', width: 14, height: 14 }} />
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>{Number(v.rating).toFixed(1)}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{v.completed_jobs}/{v.total_jobs || v.completed_jobs} {t('pmVendors.jobsDone')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Vendor Detail Drawer ── */}
      <Drawer
        open={isDrawerOpen}
        onClose={() => { setDetailData(null); setDetailLoading(false); }}
        title={detailData?.vendor.name ?? '…'}
        sub={t('pmVendors.title')}
        width={520}
        footer={detailData ? (
          <Btn variant="soft" block onClick={() => { openEditModal(detailData.vendor); setDetailData(null); }}>
            {t('pmVendors.edit')}
          </Btn>
        ) : undefined}
      >
        {detailLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 className="ic" style={{ width: 28, height: 28, animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
          </div>
        )}
        {detailData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Contact row */}
            <div style={{ display: 'flex', gap: 12, color: 'var(--text-3)', fontSize: 12, flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone className="ic" />{detailData.vendor.phone}</span>
              {detailData.vendor.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail className="ic" />{detailData.vendor.email}</span>}
              {detailData.vendor.telegram_username && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><MessageCircle className="ic" />@{detailData.vendor.telegram_username}</span>}
            </div>

            {/* Stats mini-grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[
                { label: t('pmVendors.totalWork'),   value: detailData.stats.total,        tone: 'violet' as const, Icon: Wrench       },
                { label: t('pmVendors.completed'),   value: detailData.stats.completed,    tone: 'ok'     as const, Icon: CheckCircle2 },
                { label: t('pmVendors.inProgress'),  value: detailData.stats.in_progress,  tone: 'warn'   as const, Icon: Clock        },
                { label: t('pmVendors.waiting'),     value: detailData.stats.open,         tone: 'neutral'as const, Icon: AlertCircle  },
              ].map(({ label, value, tone, Icon }) => (
                <div key={label} className="card" style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <Icon className="ic" style={{ margin: '0 auto 4px', color: `var(--${tone})` }} />
                  <div style={{ fontWeight: 700, fontSize: 20 }}>{value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Earnings + rating + specs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              {detailData.stats.total_earned > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--brand)' }}>
                  <DollarSign className="ic" />
                  {detailData.stats.total_earned.toLocaleString()} UZS
                </span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {[1,2,3,4,5].map(r => (
                  <Star key={r} className="ic" style={{ width: 14, height: 14, color: r <= Math.round(detailData.vendor.rating) ? 'var(--warn)' : 'var(--border)', fill: r <= Math.round(detailData.vendor.rating) ? 'var(--warn)' : 'transparent' }} />
                ))}
                <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>{Number(detailData.vendor.rating).toFixed(1)}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginLeft: 'auto' }}>
                {(detailData.vendor.specializations ?? []).map(s => <Badge key={s} tone="ok">{t(categoryI18nKey(s))}</Badge>)}
              </div>
            </div>

            {detailData.vendor.notes && (
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{detailData.vendor.notes}</div>
            )}

            {/* Job history */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>
                {t('pmVendors.history')} ({detailData.requests.length})
              </div>
              {detailData.requests.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '24px 0', fontSize: 13 }}>{t('pmVendors.noHistory')}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detailData.requests.map(req => (
                    <div key={req.id} className="card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.title}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, fontSize: 11, color: 'var(--text-3)' }}>
                          {req.building && <span>{req.building}{req.apartment && ` №${req.apartment}`}</span>}
                          {req.category && <span>{t(categoryI18nKey(req.category))}</span>}
                          <span>{req.created_at}</span>
                          {req.completed_at && <span style={{ color: 'var(--ok)' }}>✓ {req.completed_at}</span>}
                        </div>
                        {req.cost_amount && req.cost_amount > 0 && (
                          <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: 'var(--brand)' }}>{Number(req.cost_amount).toLocaleString()} UZS</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                        <Badge tone={ticketStatusTone(req.status)}>{req.status}</Badge>
                        <Badge tone={priorityTone(req.priority)}>{req.priority}</Badge>
                        {req.resident_rating && req.resident_rating > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {[1,2,3,4,5].map(r => (
                              <Star key={r} className="ic" style={{ width: 11, height: 11, color: r <= req.resident_rating! ? 'var(--warn)' : 'var(--border)', fill: r <= req.resident_rating! ? 'var(--warn)' : 'transparent' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="scrim show" onClick={() => setShowModal(false)}>
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => e.stopPropagation()}>
            <div className="card card-pad" style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>{editingVendor ? t('pmVendors.editVendor') : t('pmVendors.newVendor')}</h2>
                <button className="drawer-close" onClick={() => setShowModal(false)}><X className="ic" /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={`${t('pmVendors.vendorName')} *`}>
                  <TextInput type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alisher Plumbing Service" />
                </Field>
                <Field label={`${t('pmVendors.phone')} *`}>
                  <TextInput type="text" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90..." />
                </Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label={t('pmVendors.email')}>
                    <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                  </Field>
                  <Field label={t('pmVendors.telegram')}>
                    <TextInput type="text" value={telegramUsername} onChange={e => setTelegramUsername(e.target.value)} placeholder="user_tg" />
                  </Field>
                </div>

                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>{t('pmVendors.specializations')}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    {ALL_SPECS.map(s => (
                      <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                        <input type="checkbox" checked={specializations.includes(s)} onChange={e => toggleSpec(s, e.target.checked)} />
                        {t(categoryI18nKey(s))}
                      </label>
                    ))}
                  </div>
                </div>

                <Field label={t('pmVendors.notes')}>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className="input" style={{ resize: 'none' }} placeholder="Notes about this contractor…" />
                </Field>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <Btn variant="ghost" block type="button" onClick={() => setShowModal(false)}>{t('pmVendors.cancel')}</Btn>
                  <Btn variant="primary" block type="submit" disabled={submitting} icon={submitting ? Loader2 : undefined}>
                    {editingVendor ? t('pmVendors.save') : t('pmVendors.create')}
                  </Btn>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
