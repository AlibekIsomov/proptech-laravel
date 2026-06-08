import { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, RefreshCw, X, Loader2, Download } from 'lucide-react';
import AppShell from '@/Components/AppShell';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

interface Invoice {
  id: string;
  invoice_number: string;
  apartment: string | null;
  building: string | null;
  resident: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  pm_fee: number;
  utilities_amount: number;
  maintenance_amount: number;
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
}

interface ApartmentOption {
  id: string;
  label: string;
  area?: number;
  monthly_fee_per_sqm?: number;
  residents: { id: string; name: string }[];
}

interface Props {
  invoices: Invoice[];
  apartments: ApartmentOption[];
}

const STATUS_META: Record<InvoiceStatus, { labelKey: string; bg: string; fg: string; border: string }> = {
  draft:     { labelKey: 'pmInvoices.statusDraft',     bg: 'var(--border)',              fg: 'var(--muted)', border: 'var(--border)'              },
  sent:      { labelKey: 'pmInvoices.statusSent',      bg: 'rgba(59,130,246,0.12)',      fg: '#60a5fa',      border: 'rgba(59,130,246,0.35)'      },
  paid:      { labelKey: 'pmInvoices.statusPaid',      bg: 'rgba(16,185,129,0.12)',      fg: '#34d399',      border: 'rgba(16,185,129,0.35)'      },
  overdue:   { labelKey: 'pmInvoices.statusOverdue',   bg: 'rgba(239,68,68,0.12)',       fg: '#f87171',      border: 'rgba(239,68,68,0.35)'       },
  cancelled: { labelKey: 'pmInvoices.statusCancelled', bg: 'var(--border)',              fg: 'var(--muted)', border: 'var(--border)'              },
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
    let t = 0, paid = 0, overdue = 0;
    for (const inv of invoices) {
      t       += Number(inv.total_amount) || 0;
      if (inv.status === 'paid')    paid    += Number(inv.total_amount) || 0;
      if (inv.status === 'overdue') overdue += Number(inv.total_amount) || 0;
    }
    return { t, paid, overdue };
  }, [invoices]);

  const filtered = useMemo(() =>
    invoices.filter((i) => filterStatus === 'all' || i.status === filterStatus),
    [invoices, filterStatus]
  );

  function updateStatus(id: string, status: InvoiceStatus) {
    router.put(`/pm/invoices/${id}`, { status }, { preserveScroll: true });
  }

  return (
    <AppShell>
      <Head title="Счета — 1Mahalla" />
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#34d399' }}>Property Management</p>
            <h1 className="text-3xl font-bold text-slate-800 mt-1" style={{ fontFamily: 'var(--font-display)' }}>{t('pmInvoices.title')}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t('pmInvoices.subtitle')}</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}>
            <Plus className="w-4 h-4" />{t('pmInvoices.createInvoice')}
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label={t('pmInvoices.totalPeriod')} value={totals.t}       accent="#10b981" />
          <SummaryCard label={t('pmInvoices.paid')}        value={totals.paid}    accent="#34d399" />
          <SummaryCard label={t('pmInvoices.overdue')}     value={totals.overdue} accent="#ef4444" />
        </div>

        <div className="flex flex-wrap gap-3">
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={{
                backgroundColor: filterStatus === s ? (s === 'all' ? 'rgba(16,185,129,0.15)' : STATUS_META[s as InvoiceStatus]?.bg ?? 'rgba(16,185,129,0.15)') : 'var(--border)',
                color: filterStatus === s ? (s === 'all' ? '#34d399' : STATUS_META[s as InvoiceStatus]?.fg ?? '#34d399') : 'var(--muted)',
                border: filterStatus === s ? '1px solid rgba(16,185,129,0.35)' : '1px solid var(--border)',
              }}>
              {s === 'all' ? t('pmInvoices.filterAll') : t(STATUS_META[s as InvoiceStatus].labelKey)}
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          {filtered.length === 0 ? (
            <div className="p-12 text-center" style={{ color: 'var(--muted)' }}>
              <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border)' }} />
              <p className="text-sm">{t('pmInvoices.noInvoices')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {[t('pmInvoices.colNum'), t('pmInvoices.colApt'), t('pmInvoices.colResident'), t('pmInvoices.colPeriod'), t('pmInvoices.colAmount'), t('pmInvoices.colDue'), t('pmInvoices.colStatus'), ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const meta = STATUS_META[inv.status];
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-3"><span className="text-slate-800/80 text-xs font-mono">{inv.invoice_number}</span></td>
                        <td className="px-4 py-3">
                          <span className="text-slate-800">№{inv.apartment ?? '—'}</span>
                          {inv.building && <div className="text-[11px]" style={{ color: 'var(--muted)' }}>{inv.building}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{inv.resident ?? '—'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{fmtPeriod(inv.billing_period_start, inv.billing_period_end)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-slate-800 font-medium">{Number(inv.total_amount).toLocaleString('ru-RU')}</span>
                          <span className="text-[11px] ml-1" style={{ color: 'var(--muted)' }}>{inv.currency}</span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('ru-RU') : '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] px-2 py-0.5 rounded-md inline-block"
                            style={{ backgroundColor: meta.bg, color: meta.fg, border: `1px solid ${meta.border}` }}>{t(meta.labelKey)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {inv.status === 'draft' && (
                              <button onClick={() => updateStatus(inv.id, 'sent')}
                                className="text-[11px] px-2.5 py-1 rounded-md hover:bg-white/[0.05]"
                                style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>{t('pmInvoices.send')}</button>
                            )}
                            {(inv.status === 'sent' || inv.status === 'overdue') && (
                              <button onClick={() => updateStatus(inv.id, 'paid')}
                                className="text-[11px] px-2.5 py-1 rounded-md hover:bg-white/[0.05]"
                                style={{ color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>{t('pmInvoices.markPaid')}</button>
                            )}
                            <a href={`/pm/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                              className="p-1 rounded-lg hover:bg-white/[0.05]" style={{ color: 'var(--muted)' }}>
                              <Download className="w-3.5 h-3.5" />
                            </a>
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

      {showCreate && <CreateInvoiceModal apartments={apartments} onClose={() => setShowCreate(false)} />}
    </AppShell>
  );
}

function CreateInvoiceModal({ apartments, onClose }: { apartments: ApartmentOption[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
    apartment_id: '',
    resident_id: '',
    billing_period_start: firstOfMonth(),
    billing_period_end: lastOfMonth(),
    pm_fee: '0',
    utilities_amount: '0',
    maintenance_amount: '0',
    currency: 'UZS',
    due_date: '',
  });

  const selectedApt = apartments.find((a) => a.id === data.apartment_id);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post('/pm/invoices', { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{t('pmInvoices.createTitle')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" style={{ color: 'var(--muted)' }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label={t('pmInvoices.colApt')} error={errors.apartment_id}>
            <select value={data.apartment_id} onChange={(e) => {
                const aptId = e.target.value;
                const apt = apartments.find(a => a.id === aptId);
                let pmFee = '0';
                if (apt && apt.area && apt.monthly_fee_per_sqm) {
                  pmFee = (apt.area * apt.monthly_fee_per_sqm).toFixed(2);
                }
                setData({ ...data, apartment_id: aptId, pm_fee: pmFee });
              }}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }}>
              <option value="">{t('pmInvoices.selectApt')}</option>
              {apartments.map((a) => <option key={a.id} value={a.id} style={{ backgroundColor: 'var(--card)' }}>{a.label}</option>)}
            </select>
          </Field>
          {selectedApt && selectedApt.residents.length > 0 && (
            <Field label={t('pmInvoices.colResident')} error={errors.resident_id}>
              <select value={data.resident_id} onChange={(e) => setData('resident_id', e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
                style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }}>
                <option value="">{t('pmInvoices.selectResident')}</option>
                {selectedApt.residents.map((r) => <option key={r.id} value={r.id} style={{ backgroundColor: 'var(--card)' }}>{r.name}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('pmInvoices.periodFrom')} error={errors.billing_period_start}>
              <input type="date" value={data.billing_period_start} onChange={(e) => setData('billing_period_start', e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
                style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
            </Field>
            <Field label={t('pmInvoices.periodTo')} error={errors.billing_period_end}>
              <input type="date" value={data.billing_period_end} onChange={(e) => setData('billing_period_end', e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
                style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('pmInvoices.management')} error={errors.pm_fee}>
              <input type="number" value={data.pm_fee} onChange={(e) => setData('pm_fee', e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm text-slate-800 outline-none"
                style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
            </Field>
            <Field label={t('pmInvoices.utilities')} error={errors.utilities_amount}>
              <input type="number" value={data.utilities_amount} onChange={(e) => setData('utilities_amount', e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm text-slate-800 outline-none"
                style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
            </Field>
            <Field label={t('pmInvoices.maintenance')} error={errors.maintenance_amount}>
              <input type="number" value={data.maintenance_amount} onChange={(e) => setData('maintenance_amount', e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm text-slate-800 outline-none"
                style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
            </Field>
          </div>
          <Field label={t('pmInvoices.dueDate')} error={errors.due_date}>
            <input type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>{t('pmInvoices.cancelBtn')}</button>
            <button type="submit" disabled={processing}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}>
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}{t('pmInvoices.createBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="text-[10px] uppercase tracking-widest" style={{ color: accent }}>{label}</p>
      <p className="text-2xl text-slate-800 mt-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
        {value.toLocaleString('ru-RU')} <span className="text-sm" style={{ color: 'var(--muted)' }}>UZS</span>
      </p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>{label}</p>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{error}</p>}
    </div>
  );
}

