import { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Stat, Badge, Btn, EmptyState, Tabs,
  invoiceStatusTone,
  FileText, Plus, Loader2, Download, X, Receipt, CreditCard, Wallet,
} from '@/Components/pm/ui';
import type { InvoiceTone } from '@/Components/pm/ui';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface Invoice {
  id:                    string;
  invoice_number:        string;
  apartment:             string | null;
  building:              string | null;
  resident:              string | null;
  billing_period_start:  string | null;
  billing_period_end:    string | null;
  pm_fee:                number;
  utilities_amount:      number;
  maintenance_amount:    number;
  total_amount:          number;
  currency:              string;
  status:                InvoiceStatus;
  due_date:              string | null;
  sent_at:               string | null;
  paid_at:               string | null;
}

interface ApartmentOption {
  id:                    string;
  label:                 string;
  area?:                 number;
  monthly_fee_per_sqm?:  number;
  residents:             { id: string; name: string }[];
}

interface Props {
  invoices:   Invoice[];
  apartments: ApartmentOption[];
}

const STATUS_LABEL_KEYS: Record<InvoiceStatus, string> = {
  draft:     'pmInvoices.statusDraft',
  sent:      'pmInvoices.statusSent',
  paid:      'pmInvoices.statusPaid',
  overdue:   'pmInvoices.statusOverdue',
  cancelled: 'pmInvoices.statusCancelled',
};

function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
function lastOfMonth()  { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().slice(0, 10); }
function fmtPeriod(s: string | null, e: string | null) {
  if (!s || !e) return '—';
  const fmt = (d: Date) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  return `${fmt(new Date(s))} — ${fmt(new Date(e))}`;
}

export default function InvoicesIndex({ invoices, apartments }: Props) {
  const { t } = useTranslation();
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [showCreate, setShowCreate]     = useState(false);

  const totals = useMemo(() => {
    let total = 0, paid = 0, overdue = 0;
    for (const inv of invoices) {
      total   += Number(inv.total_amount) || 0;
      if (inv.status === 'paid')    paid    += Number(inv.total_amount) || 0;
      if (inv.status === 'overdue') overdue += Number(inv.total_amount) || 0;
    }
    return { total, paid, overdue };
  }, [invoices]);

  const filtered = useMemo(() =>
    invoices.filter(i => filterStatus === 'all' || i.status === filterStatus),
    [invoices, filterStatus]);

  function updateStatus(id: string, status: InvoiceStatus) {
    router.put(`/pm/invoices/${id}`, { status }, { preserveScroll: true });
  }

  return (
    <AppShell>
      <Head title={t('pmInvoices.title') + ' — PM'} />
      <div className="page">
        <PageHead
          eyebrow={t('common.propertyMgmt')}
          title={t('pmInvoices.title')}
          sub={t('pmInvoices.subtitle')}
          actions={<Btn variant="primary" icon={Plus} onClick={() => setShowCreate(true)}>{t('pmInvoices.createInvoice')}</Btn>}
        />

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <Stat label={t('pmInvoices.totalPeriod')} value={totals.total.toLocaleString('ru-RU')} suffix=" UZS" icon={Receipt}    tone="brand"  />
          <Stat label={t('pmInvoices.paid')}        value={totals.paid.toLocaleString('ru-RU')}  suffix=" UZS" icon={CreditCard}  tone="ok"     />
          <Stat label={t('pmInvoices.overdue')}     value={totals.overdue.toLocaleString('ru-RU')} suffix=" UZS" icon={Wallet}   tone="danger" />
        </div>

        {/* Status filter tabs */}
        <div style={{ marginBottom: 16 }}>
          <Tabs
            value={filterStatus}
            onChange={v => setFilterStatus(v as InvoiceStatus | 'all')}
            tabs={[
              { value: 'all',       label: t('pmInvoices.filterAll')                  },
              { value: 'draft',     label: t('pmInvoices.statusDraft')                },
              { value: 'sent',      label: t('pmInvoices.statusSent')                 },
              { value: 'paid',      label: t('pmInvoices.statusPaid')                 },
              { value: 'overdue',   label: t('pmInvoices.statusOverdue')              },
              { value: 'cancelled', label: t('pmInvoices.statusCancelled')            },
            ]}
          />
        </div>

        {/* Table */}
        <div className="table-card">
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title={t('pmInvoices.noInvoices')} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('pmInvoices.colNum')}</th>
                    <th>{t('pmInvoices.colApt')}</th>
                    <th>{t('pmInvoices.colResident')}</th>
                    <th>{t('pmInvoices.colPeriod')}</th>
                    <th className="t-right">{t('pmInvoices.colAmount')}</th>
                    <th>{t('pmInvoices.colDue')}</th>
                    <th>{t('pmInvoices.colStatus')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id}>
                      <td><span className="tnum" style={{ fontSize: 12 }}>{inv.invoice_number}</span></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>№{inv.apartment ?? '—'}</div>
                        {inv.building && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{inv.building}</div>}
                      </td>
                      <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{inv.resident ?? '—'}</td>
                      <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{fmtPeriod(inv.billing_period_start, inv.billing_period_end)}</td>
                      <td className="t-right">
                        <span className="tnum" style={{ fontWeight: 700 }}>{Number(inv.total_amount).toLocaleString('ru-RU')}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>{inv.currency}</span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('ru-RU') : '—'}</td>
                      <td><Badge tone={invoiceStatusTone(inv.status) as InvoiceTone}>{t(STATUS_LABEL_KEYS[inv.status])}</Badge></td>
                      <td>
                        <div className="row-actions">
                          {inv.status === 'draft' && (
                            <Btn variant="ghost" size="sm" onClick={() => updateStatus(inv.id, 'sent')}>{t('pmInvoices.send')}</Btn>
                          )}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <Btn variant="soft" size="sm" onClick={() => updateStatus(inv.id, 'paid')}>{t('pmInvoices.markPaid')}</Btn>
                          )}
                          <a href={`/pm/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <button className="icon-act"><Download className="ic" /></button>
                          </a>
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

      {showCreate && <CreateInvoiceModal apartments={apartments} onClose={() => setShowCreate(false)} />}
    </AppShell>
  );
}

// ── Create Invoice Modal ──────────────────────────────────────────────────────

function FmField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {children}
      {error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function CreateInvoiceModal({ apartments, onClose }: { apartments: ApartmentOption[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
    apartment_id:         '',
    resident_id:          '',
    billing_period_start: firstOfMonth(),
    billing_period_end:   lastOfMonth(),
    pm_fee:               '0',
    utilities_amount:     '0',
    maintenance_amount:   '0',
    currency:             'UZS',
    due_date:             '',
  });

  const selectedApt = apartments.find(a => a.id === data.apartment_id);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post('/pm/invoices', { onSuccess: onClose });
  }

  return (
    <div className="scrim show" onClick={onClose}>
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={e => e.stopPropagation()}>
        <div className="card card-pad" style={{ width: '100%', maxWidth: 440, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16 }}>{t('pmInvoices.createTitle')}</h2>
            <button className="drawer-close" onClick={onClose}><X className="ic" /></button>
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FmField label={t('pmInvoices.colApt')} error={errors.apartment_id}>
              <select
                className="select"
                value={data.apartment_id}
                onChange={e => {
                  const aptId = e.target.value;
                  const apt = apartments.find(a => a.id === aptId);
                  let pmFee = '0';
                  if (apt?.area && apt?.monthly_fee_per_sqm) pmFee = (apt.area * apt.monthly_fee_per_sqm).toFixed(2);
                  setData({ ...data, apartment_id: aptId, pm_fee: pmFee });
                }}
              >
                <option value="">{t('pmInvoices.selectApt')}</option>
                {apartments.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </FmField>

            {selectedApt && selectedApt.residents.length > 0 && (
              <FmField label={t('pmInvoices.colResident')} error={errors.resident_id}>
                <select className="select" value={data.resident_id} onChange={e => setData('resident_id', e.target.value)}>
                  <option value="">{t('pmInvoices.selectResident')}</option>
                  {selectedApt.residents.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </FmField>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FmField label={t('pmInvoices.periodFrom')} error={errors.billing_period_start}>
                <input type="date" className="input" value={data.billing_period_start} onChange={e => setData('billing_period_start', e.target.value)} />
              </FmField>
              <FmField label={t('pmInvoices.periodTo')} error={errors.billing_period_end}>
                <input type="date" className="input" value={data.billing_period_end} onChange={e => setData('billing_period_end', e.target.value)} />
              </FmField>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <FmField label={t('pmInvoices.management')} error={errors.pm_fee}>
                <input type="number" className="input" value={data.pm_fee} onChange={e => setData('pm_fee', e.target.value)} />
              </FmField>
              <FmField label={t('pmInvoices.utilities')} error={errors.utilities_amount}>
                <input type="number" className="input" value={data.utilities_amount} onChange={e => setData('utilities_amount', e.target.value)} />
              </FmField>
              <FmField label={t('pmInvoices.maintenance')} error={errors.maintenance_amount}>
                <input type="number" className="input" value={data.maintenance_amount} onChange={e => setData('maintenance_amount', e.target.value)} />
              </FmField>
            </div>

            <FmField label={t('pmInvoices.dueDate')} error={errors.due_date}>
              <input type="date" className="input" value={data.due_date} onChange={e => setData('due_date', e.target.value)} />
            </FmField>

            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <Btn variant="ghost" block type="button" onClick={onClose}>{t('pmInvoices.cancelBtn')}</Btn>
              <Btn variant="primary" block type="submit" disabled={processing} icon={processing ? Loader2 : undefined}>
                {t('pmInvoices.createBtn')}
              </Btn>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
