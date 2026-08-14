import { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Stat, Badge, Btn, Drawer, Field, TextInput, PmSelect, Avatar, EmptyState,
  priorityTone, ticketStatusTone,
  Inbox, Loader2, CheckCircle2, Search, ChevronRight, UserPlus, X, Sparkles,
  Plus, AlertCircle, Wrench, Clock, AlarmClock,
} from '@/Components/pm/ui';

interface MaintenanceRequest {
  id:                    string;
  title:                 string;
  description:           string;
  category:              string | null;
  priority:              'low' | 'medium' | 'high' | 'emergency';
  status:                'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  ai_category_suggested: string | null;
  ai_priority_suggested: string | null;
  ai_summary:            string | null;
  is_repeat:             boolean;
  apartment:             string | null;
  building:              string | null;
  resident:              string | null;
  assigned_vendor_id:    string | null;
  vendor:                string | null;
  dispatcher:            string | null;
  cost_amount:           number | null;
  resident_rating:       number | null;
  sla_deadline:          string | null;
  created_at:            string;
  assigned_at:           string | null;
  completed_at:          string | null;
}

interface Vendor {
  id:              string;
  name:            string;
  specializations: string[];
  rating:          number;
  completed_jobs:  number;
}

interface BuildingOption {
  id:   string;
  name: string;
}

interface ProjectOption {
  id:        string;
  name:      string;
  buildings: BuildingOption[];
}

interface ApartmentOption {
  id:             string;
  number:         string;
  pm_building_id: string;
  floor:          number;
}

interface ResidentOption {
  id:           string;
  full_name:    string;
  apartment_id: string;
}

interface Props {
  requests:   MaintenanceRequest[];
  vendors:    Vendor[];
  projects:   ProjectOption[];
  apartments: ApartmentOption[];
  residents:  ResidentOption[];
}

const PRIORITY_RANK: Record<string, number> = { emergency: 0, high: 1, medium: 2, low: 3 };

const CATEGORY_LABELS: Record<string, string> = {
  plumbing:   'Plumbing',
  electrical: 'Electrical',
  heating:    'Heating',
  cleaning:   'Cleaning',
  elevator:   'Elevator',
  appliance:  'Appliances',
  structural: 'Structural',
  other:      'Other',
};

export default function Index({ requests, vendors, projects, apartments, residents }: Props) {
  const { t } = useTranslation();

  // Filters
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState<'all' | MaintenanceRequest['status']>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | MaintenanceRequest['priority']>('all');

  // SLA timer
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // Ticket detail drawer
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null);
  const [aiRunning, setAiRunning]     = useState(false);

  // Assign vendor modal
  const [assignReq, setAssignReq]         = useState<MaintenanceRequest | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Tizim tavsiyasi: mos mutaxassislik birinchi, ichida reyting bo'yicha
  // (backend allaqachon rating desc yuboradi; takror-nosozlik jarimasi reytingda)
  const vendorsForCategory = (category: string | null) =>
    [...vendors].sort((a, b) =>
      Number(!!(category && b.specializations.includes(category))) -
      Number(!!(category && a.specializations.includes(category))));

  const vendorOption = (v: Vendor, recommended: boolean) =>
    `${recommended ? '★ ' : ''}${v.name} · ${Number(v.rating).toFixed(1)} (${v.specializations.join(', ') || 'General'})`;

  // Drawer ochilganda eng yaxshi usta oldindan tanlab qo'yiladi
  useEffect(() => {
    if (selectedReq && !selectedReq.assigned_vendor_id) {
      setSelectedVendorId(vendorsForCategory(selectedReq.category)[0]?.id || '');
    }
  }, [selectedReq]);

  // Create request modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle]         = useState('');
  const [createDesc, setCreateDesc]           = useState('');
  const [createCategory, setCreateCategory]   = useState('');
  const [createPriority, setCreatePriority]   = useState<MaintenanceRequest['priority']>('medium');
  const [createProjId, setCreateProjId]       = useState('');
  const [createBldgId, setCreateBldgId]       = useState('');
  const [createAptId, setCreateAptId]         = useState('');
  const [createResidentId, setCreateResidentId] = useState('');
  const [createVendorId, setCreateVendorId]   = useState('');
  const [creating, setCreating]               = useState(false);

  const buildingsForSelectedCreateProj = useMemo(() => {
    if (!createProjId) return [];
    return projects.find(p => p.id === createProjId)?.buildings ?? [];
  }, [createProjId, projects]);

  const apartmentsForSelectedCreateBldg = useMemo(() => {
    if (!createBldgId) return [];
    return apartments.filter(a => a.pm_building_id === createBldgId);
  }, [createBldgId, apartments]);

  const filteredResidentsForCreate = useMemo(() => {
    if (!createAptId) return [];
    return residents.filter(r => r.apartment_id === createAptId);
  }, [createAptId, residents]);

  const metrics = useMemo(() => {
    let open = 0, inProgress = 0, completed = 0, overdue = 0;
    for (const r of requests) {
      if (r.status === 'open' || r.status === 'assigned') open++;
      if (r.status === 'in_progress') inProgress++;
      if (r.status === 'completed') completed++;
      if (r.sla_deadline && r.status !== 'completed' && r.status !== 'cancelled') {
        if (new Date(r.sla_deadline).getTime() < now) overdue++;
      }
    }
    return { open, inProgress, completed, overdue };
  }, [requests, now]);

  const filtered = useMemo(() => {
    return requests
      .filter(r => statusFilter === 'all' || r.status === statusFilter)
      .filter(r => priorityFilter === 'all' || r.priority === priorityFilter)
      .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority] ?? 2;
        const pb = PRIORITY_RANK[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [requests, statusFilter, priorityFilter, search]);

  function triggerAiCategorize(r: MaintenanceRequest) {
    setAiRunning(true);
    fetch(`/pm/requests/${r.id}/ai-categorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
      },
    })
      .then(res => res.json())
      .then(() => { setAiRunning(false); router.reload({ only: ['requests'] }); setSelectedReq(null); })
      .catch(err => { console.error(err); setAiRunning(false); });
  }

  function handleAssignVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!assignReq) return;
    router.put(`/pm/requests/${assignReq.id}`, {
      status:             'assigned',
      assigned_vendor_id: selectedVendorId,
      priority:           assignReq.priority,
      category:           assignReq.category,
    }, { onSuccess: () => { setAssignReq(null); setSelectedVendorId(''); } });
  }

  function handleUpdateStatus(r: MaintenanceRequest, nextStatus: MaintenanceRequest['status']) {
    router.put(`/pm/requests/${r.id}`, {
      status:             nextStatus,
      assigned_vendor_id: r.assigned_vendor_id,
      priority:           r.priority,
      category:           r.category,
    }, { onSuccess: () => { if (selectedReq?.id === r.id) setSelectedReq(null); } });
  }

  function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    router.post('/pm/requests', {
      title:              createTitle,
      description:        createDesc,
      category:           createCategory || null,
      priority:           createPriority,
      apartment_id:       createAptId,
      resident_id:        createResidentId || null,
      assigned_vendor_id: createVendorId || null,
    }, {
      onSuccess: () => {
        setShowCreateModal(false);
        setCreateTitle(''); setCreateDesc(''); setCreateCategory('');
        setCreatePriority('medium'); setCreateProjId(''); setCreateBldgId('');
        setCreateAptId(''); setCreateResidentId(''); setCreateVendorId('');
        setCreating(false);
      },
      onError: () => setCreating(false),
    });
  }

  function fmtSla(deadline: string) {
    const diff = new Date(deadline).getTime() - now;
    const overdue = diff < 0;
    const absMin = Math.floor(Math.abs(diff) / 60000);
    const hrs = Math.floor(absMin / 60);
    const mins = absMin % 60;
    return { overdue, label: overdue ? `-${hrs}h ${mins}m` : `${hrs}h ${mins}m` };
  }

  return (
    <AppShell openRequestCount={metrics.open > 0 ? metrics.open : undefined}>
      <Head title={t('pmRequests.title') + ' — PM'} />

      <div className="page">
        <PageHead
          eyebrow={t('common.propertyMgmt')}
          title={t('pmRequests.title')}
          sub={t('pmRequests.subtitle')}
          actions={
            <Btn variant="primary" icon={Plus} onClick={() => setShowCreateModal(true)}>
              {t('nav.newRequest', { defaultValue: 'Yangi ariza' })}
            </Btn>
          }
        />

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <Stat label={t('pmRequests.openAssigned')} value={metrics.open}       icon={Inbox}        tone="warn"   />
          <Stat label={t('pmRequests.inProgress')}   value={metrics.inProgress} icon={Wrench}       tone="info"   />
          <Stat label={t('pmRequests.completed')}    value={metrics.completed}  icon={CheckCircle2} tone="ok"     />
          <Stat label={t('pmRequests.slaOverdue')}   value={metrics.overdue}    icon={AlarmClock}   tone="danger" />
        </div>

        {/* Filters */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px', maxWidth: 360 }}>
              <Field>
                <TextInput
                  icon={Search}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('pmRequests.searchPlaceholder')}
                />
              </Field>
            </div>
            <Field>
              <PmSelect value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                <option value="all">{t('pmRequests.allStatuses')}</option>
                <option value="open">{t('pmRequests.statusOpen')}</option>
                <option value="assigned">{t('pmRequests.statusAssigned')}</option>
                <option value="in_progress">{t('pmRequests.statusInProgress')}</option>
                <option value="completed">{t('pmRequests.statusCompleted')}</option>
                <option value="cancelled">{t('pmRequests.statusCancelled')}</option>
              </PmSelect>
            </Field>
            <Field>
              <PmSelect value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)}>
                <option value="all">{t('pmRequests.allPriorities')}</option>
                <option value="emergency">{t('pmRequests.priorityEmergency')}</option>
                <option value="high">{t('pmRequests.priorityHigh')}</option>
                <option value="medium">{t('pmRequests.priorityMedium')}</option>
                <option value="low">{t('pmRequests.priorityLow')}</option>
              </PmSelect>
            </Field>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          {filtered.length === 0 ? (
            <EmptyState icon={Inbox} title={t('pmRequests.noRequests')} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('pmRequests.colPriority')}</th>
                    <th>{t('pmRequests.colDetails')}</th>
                    <th>{t('pmRequests.colApartment')}</th>
                    <th>{t('pmRequests.colResident')}</th>
                    <th>{t('pmRequests.colCategory')}</th>
                    <th>{t('pmRequests.colStatus')}</th>
                    <th>{t('pmRequests.colContractor')}</th>
                    <th>{t('pmRequests.colSla')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    let slaNode: React.ReactNode = <span style={{ color: 'var(--text-3)' }}>—</span>;
                    if (r.sla_deadline && r.status !== 'completed' && r.status !== 'cancelled') {
                      const { overdue, label } = fmtSla(r.sla_deadline);
                      slaNode = (
                        <span className="tnum" style={{ fontSize: 11, fontWeight: 600, color: overdue ? 'var(--danger)' : 'var(--ok)' }}>
                          {label}
                        </span>
                      );
                    }
                    return (
                      <tr key={r.id} onClick={() => setSelectedReq(r)} style={{ cursor: 'pointer' }}>
                        <td><Badge tone={priorityTone(r.priority)}>{t(`pmRequests.priority${r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}`)}</Badge></td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {r.title}
                            {r.is_repeat && <Badge tone="danger">🔁 Takror</Badge>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>
                        </td>
                        <td>
                          <span className="tnum" style={{ fontWeight: 600 }}>№{r.apartment || '—'}</span>
                          {r.building && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.building}</div>}
                        </td>
                        <td>{r.resident ? <span style={{ fontSize: 13 }}>{r.resident}</span> : <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                        <td><span style={{ fontSize: 12, color: 'var(--text-2)', textTransform: 'capitalize' }}>{r.category ? (CATEGORY_LABELS[r.category] ?? r.category) : '—'}</span></td>
                        <td><Badge tone={ticketStatusTone(r.status)}>{t(`pmRequests.status${r.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`)}</Badge></td>
                        <td onClick={e => e.stopPropagation()}>
                          {r.vendor ? (
                            <span style={{ fontSize: 12 }}>{r.vendor}</span>
                          ) : r.status === 'completed' || r.status === 'cancelled' ? (
                            <span style={{ color: 'var(--text-3)' }}>—</span>
                          ) : (
                            <Btn
                              variant="soft"
                              size="sm"
                              icon={UserPlus}
                              onClick={() => { setAssignReq(r); setSelectedVendorId(r.assigned_vendor_id || vendorsForCategory(r.category)[0]?.id || ''); }}
                            >
                              {t('pmRequests.assign')}
                            </Btn>
                          )}
                        </td>
                        <td>{slaNode}</td>
                        <td><ChevronRight className="ic" style={{ color: 'var(--text-3)' }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Ticket Detail Drawer ─────────────────────────────────── */}
      <Drawer
        open={!!selectedReq}
        onClose={() => setSelectedReq(null)}
        title={selectedReq?.title ?? ''}
        sub={t('common.maintenanceTicket', { defaultValue: 'Maintenance Ticket' })}
        width={480}
        footer={
          selectedReq && selectedReq.status !== 'completed' && selectedReq.status !== 'cancelled' ? (
            <div style={{ display: 'flex', gap: 10 }}>
              {(selectedReq.status === 'open' || selectedReq.status === 'assigned') && (
                <Btn variant="primary" block onClick={() => handleUpdateStatus(selectedReq, 'in_progress')}>
                  {t('pmRequests.startProgress')}
                </Btn>
              )}
              {selectedReq.status === 'in_progress' && (
                <Btn variant="primary" block onClick={() => handleUpdateStatus(selectedReq, 'completed')}>
                  {t('pmRequests.completeJob')}
                </Btn>
              )}
              <Btn variant="danger-ghost" block onClick={() => handleUpdateStatus(selectedReq, 'cancelled')}>
                {t('pmRequests.cancelRequest')}
              </Btn>
            </div>
          ) : undefined
        }
      >
        {selectedReq && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selectedReq.is_repeat && (
              <div style={{ borderRadius: 10, padding: '10px 14px', fontSize: 12, background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)', color: 'var(--danger)' }}>
                🔁 Takroriy nosozlik — oldingi ta'mirdan keyin qaytadan buzilgan. Usta reytingiga jarima qo'llangan.
              </div>
            )}
            {/* Status + Priority row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="card card-pad" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>{t('pmRequests.currentStatus')}</div>
                <Badge tone={ticketStatusTone(selectedReq.status)}>
                  {t(`pmRequests.status${selectedReq.status.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`)}
                </Badge>
              </div>
              <div className="card card-pad" style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 6 }}>{t('pmRequests.priority')}</div>
                <Badge tone={priorityTone(selectedReq.priority)}>
                  {t(`pmRequests.priority${selectedReq.priority.charAt(0).toUpperCase() + selectedReq.priority.slice(1)}`)}
                </Badge>
              </div>
            </div>

            {/* AI assistant panel */}
            <div style={{ borderRadius: 12, padding: '14px 16px', background: 'linear-gradient(135deg, color-mix(in srgb, var(--violet) 12%, transparent), color-mix(in srgb, var(--accent) 6%, transparent))', border: '1px solid color-mix(in srgb, var(--violet) 20%, transparent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sparkles className="ic" style={{ color: 'var(--violet)' }} />
                <span style={{ fontWeight: 700, fontSize: 12 }}>{t('pmRequests.aiAssistant')}</span>
              </div>
              {selectedReq.ai_summary ? (
                <div>
                  <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>{selectedReq.ai_summary}</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedReq.ai_category_suggested && <Badge tone="violet">Category: {selectedReq.ai_category_suggested}</Badge>}
                    {selectedReq.ai_priority_suggested && <Badge tone="info">Priority: {selectedReq.ai_priority_suggested}</Badge>}
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>AI can automatically analyze, categorize, and summarize this request.</p>
                  <Btn
                    variant="accent"
                    block
                    icon={aiRunning ? Loader2 : Sparkles}
                    disabled={aiRunning}
                    onClick={() => triggerAiCategorize(selectedReq)}
                  >
                    Run AI Categorization
                  </Btn>
                </div>
              )}
            </div>

            {/* Details grid */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>
                Ticket Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <DetailRow label="Apartment" value={`№${selectedReq.apartment || '—'}`} />
                <DetailRow label="Resident"  value={selectedReq.resident || '—'} />
                <DetailRow label="Created"   value={new Date(selectedReq.created_at).toLocaleDateString()} />
                <DetailRow label="SLA"       value={selectedReq.sla_deadline ? new Date(selectedReq.sla_deadline).toLocaleString() : '—'} />
              </div>
              <div style={{ marginTop: 10 }}>
                <DetailRow label="Description" value={selectedReq.description} wide />
              </div>
            </div>

            {/* Assign vendor inline (if not yet assigned) */}
            {!selectedReq.vendor && selectedReq.status !== 'completed' && selectedReq.status !== 'cancelled' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>
                  {t('pmRequests.assignContractor')}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <PmSelect
                    value={selectedVendorId}
                    onChange={e => setSelectedVendorId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">{t('pmRequests.selectContractor')}</option>
                    {vendorsForCategory(selectedReq.category).map((v, i) => (
                      <option key={v.id} value={v.id}>{vendorOption(v, i === 0)}</option>
                    ))}
                  </PmSelect>
                  <Btn
                    variant="primary"
                    disabled={!selectedVendorId}
                    onClick={() => {
                      if (!selectedVendorId) return;
                      router.put(`/pm/requests/${selectedReq.id}`, {
                        status:             'assigned',
                        assigned_vendor_id: selectedVendorId,
                        priority:           selectedReq.priority,
                        category:           selectedReq.category,
                      }, { onSuccess: () => { setSelectedReq(null); setSelectedVendorId(''); } });
                    }}
                  >
                    {t('pmRequests.assignVendor')}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ── Assign Vendor Modal (from table row) ─────────────────── */}
      {assignReq && (
        <div className="scrim show" onClick={() => setAssignReq(null)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
          >
            <div className="card card-pad" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <h2 style={{ fontWeight: 700, fontSize: 15 }}>{t('pmRequests.assignContractor')}</h2>
                <button className="drawer-close" onClick={() => setAssignReq(null)}><X className="ic" /></button>
              </div>
              <form onSubmit={handleAssignVendor} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={t('pmRequests.selectContractor')}>
                  <PmSelect value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} required>
                    <option value="">{t('pmRequests.selectContractor')}</option>
                    {vendorsForCategory(assignReq.category).map((v, i) => (
                      <option key={v.id} value={v.id}>{vendorOption(v, i === 0)}</option>
                    ))}
                  </PmSelect>
                </Field>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <Btn variant="ghost" block type="button" onClick={() => setAssignReq(null)}>{t('pmRequests.cancel')}</Btn>
                  <Btn variant="primary" block type="submit">{t('pmRequests.assignVendor')}</Btn>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Ticket Modal ───────────────────────────────────── */}
      {showCreateModal && (
        <div className="scrim show" onClick={() => setShowCreateModal(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
          >
            <div className="card card-pad" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>{t('pmRequests.newTicket')}</h2>
                <button className="drawer-close" onClick={() => setShowCreateModal(false)}><X className="ic" /></button>
              </div>

              <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={`${t('pmRequests.ticketTitle')} *`}>
                  <TextInput
                    type="text"
                    required
                    value={createTitle}
                    onChange={e => setCreateTitle(e.target.value)}
                    placeholder="e.g. Faucet leaking in kitchen"
                  />
                </Field>

                <Field label={`${t('pmRequests.description')} *`}>
                  <textarea
                    required
                    value={createDesc}
                    onChange={e => setCreateDesc(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={3}
                    className="input"
                    style={{ resize: 'none' }}
                  />
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <Field label={`${t('pmRequests.projectLabel')} *`}>
                    <PmSelect
                      required
                      value={createProjId}
                      onChange={e => { setCreateProjId(e.target.value); setCreateBldgId(''); setCreateAptId(''); setCreateResidentId(''); }}
                    >
                      <option value="">Select…</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </PmSelect>
                  </Field>

                  <Field label={`${t('pmRequests.buildingLabel')} *`}>
                    <PmSelect
                      required
                      value={createBldgId}
                      disabled={!createProjId}
                      onChange={e => { setCreateBldgId(e.target.value); setCreateAptId(''); setCreateResidentId(''); }}
                    >
                      <option value="">Select…</option>
                      {buildingsForSelectedCreateProj.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </PmSelect>
                  </Field>

                  <Field label={`${t('pmRequests.apartmentLabel')} *`}>
                    <PmSelect
                      required
                      value={createAptId}
                      disabled={!createBldgId}
                      onChange={e => { setCreateAptId(e.target.value); setCreateResidentId(''); }}
                    >
                      <option value="">Select…</option>
                      {apartmentsForSelectedCreateBldg.map(a => <option key={a.id} value={a.id}>№{a.number}</option>)}
                    </PmSelect>
                  </Field>
                </div>

                <Field label={t('pmRequests.residentOptional')}>
                  <PmSelect
                    value={createResidentId}
                    disabled={!createAptId || filteredResidentsForCreate.length === 0}
                    onChange={e => setCreateResidentId(e.target.value)}
                  >
                    <option value="">
                      {!createAptId
                        ? t('pmRequests.selectAptFirst')
                        : filteredResidentsForCreate.length === 0
                          ? t('pmRequests.noActiveResidents')
                          : t('pmRequests.selectResident')}
                    </option>
                    {filteredResidentsForCreate.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                  </PmSelect>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label={t('pmRequests.category')}>
                    <PmSelect value={createCategory} onChange={e => setCreateCategory(e.target.value)}>
                      <option value="">Choose…</option>
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </PmSelect>
                  </Field>

                  <Field label={`${t('pmRequests.priority')} *`}>
                    <PmSelect required value={createPriority} onChange={e => setCreatePriority(e.target.value as any)}>
                      <option value="low">{t('pmRequests.priorityLow')}</option>
                      <option value="medium">{t('pmRequests.priorityMedium')}</option>
                      <option value="high">{t('pmRequests.priorityHigh')}</option>
                      <option value="emergency">{t('pmRequests.priorityEmergency')}</option>
                    </PmSelect>
                  </Field>
                </div>

                <Field label={t('pmRequests.assignContractorOpt')}>
                  <PmSelect value={createVendorId} onChange={e => setCreateVendorId(e.target.value)}>
                    <option value="">{t('pmRequests.assignLater')}</option>
                    {vendorsForCategory(createCategory || null).map((v, i) => (
                      <option key={v.id} value={v.id}>{vendorOption(v, i === 0 && !!createCategory)}</option>
                    ))}
                  </PmSelect>
                </Field>

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <Btn variant="ghost" block type="button" onClick={() => setShowCreateModal(false)}>{t('pmRequests.cancel')}</Btn>
                  <Btn variant="primary" block type="submit" disabled={creating} icon={creating ? Loader2 : undefined}>
                    {t('pmRequests.createTicket')}
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

// ── Small helpers ─────────────────────────────────────────────────────────────

function DetailRow({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 10, padding: '10px 12px',
        background: 'var(--bg)', border: '1px solid var(--border)',
        gridColumn: wide ? '1 / -1' : undefined,
      }}
    >
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-1)', whiteSpace: 'pre-wrap' }}>{value}</div>
    </div>
  );
}
