import { useState, useMemo } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
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
  residents: { id: string; name: string }[];
}

interface Props {
  invoices: Invoice[];
  apartments: ApartmentOption[];
}

const STATUS_META: Record<InvoiceStatus, { label: string; bg: string; fg: string; border: string }> = {
  draft:     { label: 'Черновик',  bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.10)' },
  sent:      { label: 'Отправлен', bg: 'rgba(59,130,246,0.12)',  fg: '#60a5fa',                border: 'rgba(59,130,246,0.35)' },
  paid:      { label: 'Оплачен',   bg: 'rgba(16,185,129,0.12)', fg: '#34d399',                border: 'rgba(16,185,129,0.35)' },
  overdue:   { label: 'Просрочен', bg: 'rgba(239,68,68,0.12)',  fg: '#f87171',                border: 'rgba(239,68,68,0.35)' },
  cancelled: { label: 'Отменён',   bg: 'rgba(255,255,255,0.04)', fg: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.08)' },
};

function firstOfMonth() { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
function lastOfMonth()  { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); return d.toISOString().slice(0, 10); }
function fmtPeriod(s: string | null, e: string | null) {
  if (!s || !e) return '—';
  const fmt = (d: Date) => d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
  return `${fmt(new Date(s))} — ${fmt(new Date(e))}`;
}

export default function InvoicesIndex({ invoices, apartments }: Props) {
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
      <Head title="Счета — PropTech UZ" />
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#34d399' }}>Property Management</p>
            <h1 className="text-3xl font-bold text-white mt-1" style={{ fontFamily: 'var(--font-display)' }}>Счета</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Генерация и контроль ежемесячных счетов жильцам</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}>
            <Plus className="w-4 h-4" />Создать счёт
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="Всего за период" value={totals.t}       accent="#10b981" />
          <SummaryCard label="Оплачено"        value={totals.paid}    accent="#34d399" />
          <SummaryCard label="Просрочено"      value={totals.overdue} accent="#ef4444" />
        </div>

        <div className="flex flex-wrap gap-3">
          {(['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              style={{
                backgroundColor: filterStatus === s ? (s === 'all' ? 'rgba(16,185,129,0.15)' : STATUS_META[s as InvoiceStatus]?.bg ?? 'rgba(16,185,129,0.15)') : 'rgba(255,255,255,0.04)',
                color: filterStatus === s ? (s === 'all' ? '#34d399' : STATUS_META[s as InvoiceStatus]?.fg ?? '#34d399') : 'rgba(255,255,255,0.55)',
                border: filterStatus === s ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              {s === 'all' ? 'Все' : STATUS_META[s as InvoiceStatus].label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.06)' }}>
          {filtered.length === 0 ? (
            <div className="p-12 text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <FileText className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
              <p className="text-sm">Счетов нет.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['№', 'Кв.', 'Жилец', 'Период', 'Сумма', 'Срок', 'Статус', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const meta = STATUS_META[inv.status];
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td className="px-4 py-3"><span className="text-white/80 text-xs font-mono">{inv.invoice_number}</span></td>
                        <td className="px-4 py-3">
                          <span className="text-white">№{inv.apartment ?? '—'}</span>
                          {inv.building && <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{inv.building}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>{inv.resident ?? '—'}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{fmtPeriod(inv.billing_period_start, inv.billing_period_end)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-white font-medium">{Number(inv.total_amount).toLocaleString('ru-RU')}</span>
                          <span className="text-[11px] ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{inv.currency}</span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('ru-RU') : '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] px-2 py-0.5 rounded-md inline-block"
                            style={{ backgroundColor: meta.bg, color: meta.fg, border: `1px solid ${meta.border}` }}>{meta.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {inv.status === 'draft' && (
                              <button onClick={() => updateStatus(inv.id, 'sent')}
                                className="text-[11px] px-2.5 py-1 rounded-md hover:bg-white/[0.05]"
                                style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.10)' }}>Отправить</button>
                            )}
                            {(inv.status === 'sent' || inv.status === 'overdue') && (
                              <button onClick={() => updateStatus(inv.id, 'paid')}
                                className="text-[11px] px-2.5 py-1 rounded-md hover:bg-white/[0.05]"
                                style={{ color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>Оплачен</button>
                            )}
                            <a href={`/pm/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
                              className="p-1 rounded-lg hover:bg-white/[0.05]" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
      <div className="rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.10)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Создать счёт</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: 'rgba(255,255,255,0.5)' }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Квартира" error={errors.apartment_id}>
            <select value={data.apartment_id} onChange={(e) => setData('apartment_id', e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <option value="">— Выбрать —</option>
              {apartments.map((a) => <option key={a.id} value={a.id} style={{ backgroundColor: '#0d1117' }}>{a.label}</option>)}
            </select>
          </Field>
          {selectedApt && selectedApt.residents.length > 0 && (
            <Field label="Жилец" error={errors.resident_id}>
              <select value={data.resident_id} onChange={(e) => setData('resident_id', e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <option value="">— Не указан —</option>
                {selectedApt.residents.map((r) => <option key={r.id} value={r.id} style={{ backgroundColor: '#0d1117' }}>{r.name}</option>)}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Период с" error={errors.billing_period_start}>
              <input type="date" value={data.billing_period_start} onChange={(e) => setData('billing_period_start', e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }} />
            </Field>
            <Field label="Период по" error={errors.billing_period_end}>
              <input type="date" value={data.billing_period_end} onChange={(e) => setData('billing_period_end', e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Управление" error={errors.pm_fee}>
              <input type="number" value={data.pm_fee} onChange={(e) => setData('pm_fee', e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </Field>
            <Field label="Коммунальные" error={errors.utilities_amount}>
              <input type="number" value={data.utilities_amount} onChange={(e) => setData('utilities_amount', e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </Field>
            <Field label="Ремонт" error={errors.maintenance_amount}>
              <input type="number" value={data.maintenance_amount} onChange={(e) => setData('maintenance_amount', e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </Field>
          </div>
          <Field label="Срок оплаты" error={errors.due_date}>
            <input type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', colorScheme: 'dark' }} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.08)' }}>Отмена</button>
            <button type="submit" disabled={processing}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}>
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-[10px] uppercase tracking-widest" style={{ color: accent }}>{label}</p>
      <p className="text-2xl text-white mt-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
        {value.toLocaleString('ru-RU')} <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>UZS</span>
      </p>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</p>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{error}</p>}
    </div>
  );
}
