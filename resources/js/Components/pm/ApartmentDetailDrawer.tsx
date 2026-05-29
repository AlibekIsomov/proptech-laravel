import { useEffect, useState } from 'react';
import { X, User, Wrench, Gauge, Receipt, Phone, Mail, Send, Loader2 } from 'lucide-react';

interface ApartmentSummary {
  id:          string;
  number:      string;
  floor:       number;
  size_m2:     number | string | null;
  rooms_count: number | null;
  building:    string | null;
}

interface ResidentSummary {
  full_name:         string;
  resident_type:     string;
  phone:             string | null;
  email:             string | null;
  telegram_username: string | null;
  move_in_date:      string | null;
}

interface MaintenanceRequestSummary {
  id:          string;
  title:       string;
  description: string;
  priority:    'low' | 'medium' | 'high' | 'emergency';
  status:      'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  created_at:  string;
}

interface MeterReadingSummary {
  reading_value: number | string;
  reading_date:  string;
}

interface UtilityMeterSummary {
  id:              string;
  meter_type:      string;
  serial_number:   string | null;
  unit:            string;
  initial_reading: number | string;
  latest_reading:  MeterReadingSummary | null;
}

interface PMInvoiceSummary {
  id:                   string;
  invoice_number:       string;
  billing_period_start: string;
  billing_period_end:   string;
  total_amount:         number;
  currency:             string;
  status:               'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

interface Props {
  apartmentId: string | null;
  onClose:     () => void;
}

type Tab = 'resident' | 'requests' | 'meters' | 'invoices';

const STATUS_RU: Record<string, string> = {
  open:        'Open',
  assigned:    'Assigned',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
};

const PRIORITY_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  low:       { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', label: 'Low' },
  medium:    { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd', label: 'Medium' },
  high:      { bg: 'rgba(251,146,60,0.15)',  text: '#fdba74', label: 'High' },
  emergency: { bg: 'rgba(239,68,68,0.18)',   text: '#fca5a5', label: 'Emergency' },
};

const METER_RU: Record<string, string> = {
  electricity: 'Electricity',
  gas:         'Gas',
  water_cold:  'Cold Water',
  water_hot:   'Hot Water',
  heating:     'Heating',
};

const INVOICE_STATUS_RU: Record<string, string> = {
  draft:     'Draft',
  sent:      'Sent',
  paid:      'Paid',
  overdue:   'Overdue',
  cancelled: 'Cancelled',
};

const INVOICE_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  draft:     { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8' },
  sent:      { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd' },
  paid:      { bg: 'rgba(16,185,129,0.15)',  text: '#6ee7b7' },
  overdue:   { bg: 'rgba(239,68,68,0.18)',   text: '#fca5a5' },
  cancelled: { bg: 'rgba(100,116,139,0.10)', text: '#64748b' },
};

export default function ApartmentDetailDrawer({ apartmentId, onClose }: Props) {
  const [tab,        setTab]        = useState<Tab>('resident');
  const [loading,    setLoading]    = useState(false);
  const [apartment,  setApartment]  = useState<ApartmentSummary | null>(null);
  const [resident,   setResident]   = useState<ResidentSummary | null>(null);
  const [requests,   setRequests]   = useState<MaintenanceRequestSummary[]>([]);
  const [meters,     setMeters]     = useState<UtilityMeterSummary[]>([]);
  const [invoices,   setInvoices]   = useState<PMInvoiceSummary[]>([]);

  useEffect(() => {
    if (!apartmentId) return;
    setTab('resident');
    setLoading(true);

    fetch(`/pm/apartments/${apartmentId}/detail`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch details');
        return res.json();
      })
      .then((data) => {
        setApartment(data.apartment);
        setResident(data.resident);
        setRequests(data.requests);
        setMeters(data.meters);
        setInvoices(data.invoices);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [apartmentId]);

  if (!apartmentId) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="fixed top-0 right-0 z-50 h-screen overflow-y-auto"
        style={{
          width:           'min(480px, 95vw)',
          backgroundColor: '#0d1117',
          borderLeft:      '1px solid rgba(255,255,255,0.08)',
          boxShadow:       '-12px 0 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 sticky top-0 z-10"
          style={{
            backgroundColor: '#0d1117',
            borderBottom:    '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Apartment
              </p>
              <h2 className="text-2xl text-white font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                №{apartment?.number ?? '—'}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Floor {apartment?.floor ?? '—'}
                {apartment?.rooms_count ? ` · ${apartment.rooms_count} rooms` : ''}
                {apartment?.size_m2 ? ` · ${apartment.size_m2} m²` : ''}
                {apartment?.building ? ` · ${apartment.building}` : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {([
              { id: 'resident', label: 'Resident', icon: User    },
              { id: 'requests', label: 'Requests', icon: Wrench  },
              { id: 'meters',   label: 'Meters',   icon: Gauge   },
              { id: 'invoices', label: 'Invoices', icon: Receipt },
            ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: active ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color:           active ? '#6ee7b7' : 'rgba(255,255,255,0.45)',
                    border:          `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <>
              {tab === 'resident'  && <ResidentTab resident={resident} />}
              {tab === 'requests'  && <RequestsTab requests={requests} />}
              {tab === 'meters'    && <MetersTab meters={meters} />}
              {tab === 'invoices'  && <InvoicesTab invoices={invoices} />}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// ── Tab: Resident ──
function ResidentTab({ resident }: { resident: ResidentSummary | null }) {
  if (!resident) {
    return (
      <div
        className="rounded-xl p-6 text-sm text-center"
        style={{
          backgroundColor: 'rgba(100,116,139,0.06)',
          border:          '1px dashed rgba(100,116,139,0.25)',
          color:           'rgba(255,255,255,0.4)',
        }}
      >
        No active resident in this apartment.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Field label="Full Name" value={resident.full_name} />
      <Field label="Type" value={resident.resident_type === 'owner' ? 'Owner' : resident.resident_type === 'tenant' ? 'Tenant' : 'Family Member'} />
      {resident.phone && <FieldIcon icon={Phone} label="Phone" value={resident.phone} />}
      {resident.email && <FieldIcon icon={Mail}  label="Email"   value={resident.email} />}
      {resident.telegram_username && (
        <FieldIcon icon={Send} label="Telegram" value={`@${resident.telegram_username}`} />
      )}
      {resident.move_in_date && (
        <Field label="Moved In" value={new Date(resident.move_in_date).toLocaleDateString()} />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-xl px-4 py-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border:          '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </p>
      <p className="text-sm text-white">{value}</p>
    </div>
  );
}

function FieldIcon({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.03)',
        border:          '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {label}
        </p>
        <p className="text-sm text-white truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Tab: Requests ──
function RequestsTab({ requests }: { requests: MaintenanceRequestSummary[] }) {
  if (requests.length === 0) {
    return <EmptyHint text="No maintenance requests yet" />;
  }
  return (
    <div className="space-y-2">
      {requests.map((r) => {
        const p = PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.medium;
        return (
          <div
            key={r.id}
            className="w-full text-left rounded-xl p-4"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border:          '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{r.title}</p>
                <p className="text-xs mt-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {r.description}
                </p>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: p.bg, color: p.text }}
              >
                {p.label}
              </span>
            </div>
            <div className="flex items-center justify-between mt-3 text-[11px]">
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                {new Date(r.created_at).toLocaleDateString()}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.55)' }}>{STATUS_RU[r.status] || r.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Meters ──
function MetersTab({ meters }: { meters: UtilityMeterSummary[] }) {
  if (meters.length === 0) {
    return <EmptyHint text="No meters installed" />;
  }
  return (
    <div className="space-y-2">
      {meters.map((m) => (
        <div
          key={m.id}
          className="rounded-xl p-4"
          style={{
            backgroundColor: 'rgba(255,255,255,0.03)',
            border:          '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{METER_RU[m.meter_type] ?? m.meter_type}</p>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{m.serial_number}</span>
          </div>
          <p className="text-2xl mt-2 text-white font-bold">
            {m.latest_reading?.reading_value ?? m.initial_reading} <span className="text-xs font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>{m.unit}</span>
          </p>
          {m.latest_reading?.reading_date && (
            <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Reading from {new Date(m.latest_reading.reading_date).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tab: Invoices ──
function InvoicesTab({ invoices }: { invoices: PMInvoiceSummary[] }) {
  if (invoices.length === 0) {
    return <EmptyHint text="No invoices issued yet" />;
  }
  return (
    <div className="space-y-2">
      {invoices.map((inv) => {
        const c = INVOICE_STATUS_COLOR[inv.status] || INVOICE_STATUS_COLOR.draft;
        return (
          <div
            key={inv.id}
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border:          '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-white">№{inv.invoice_number}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {new Date(inv.billing_period_start).toLocaleDateString()} —{' '}
                  {new Date(inv.billing_period_end).toLocaleDateString()}
                </p>
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: c.bg, color: c.text }}
              >
                {INVOICE_STATUS_RU[inv.status] || inv.status}
              </span>
            </div>
            <p className="text-lg mt-2 text-white font-bold">
              {inv.total_amount.toLocaleString()} {inv.currency}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div
      className="rounded-xl p-6 text-sm text-center"
      style={{
        backgroundColor: 'rgba(100,116,139,0.06)',
        border:          '1px dashed rgba(100,116,139,0.25)',
        color:           'rgba(255,255,255,0.4)',
      }}
    >
      {text}
    </div>
  );
}
