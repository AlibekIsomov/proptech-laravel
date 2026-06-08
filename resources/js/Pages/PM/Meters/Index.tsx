import { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Gauge, AlertTriangle, Plus, X, Loader2 } from 'lucide-react';
import AppShell from '@/Components/AppShell';

type MeterType = 'electricity' | 'gas' | 'water_cold' | 'water_hot' | 'heating';

interface Meter {
  id: string;
  apartment_id: string;
  apartment: string | null;
  building: string | null;
  meter_type: MeterType;
  serial_number: string | null;
  unit: string | null;
  installed_date: string | null;
  initial_reading: number;
  last_reading: number | null;
  last_date: string | null;
}

interface ApartmentOption { id: string; label: string; }

interface Props {
  meters: Meter[];
  apartments: ApartmentOption[];
}

const METER_META: Record<MeterType, { labelKey: string; accent: string; unit: string }> = {
  electricity: { labelKey: 'pmMeters.electricity', accent: '#fbbf24', unit: 'кВт·ч' },
  gas:         { labelKey: 'pmMeters.gas',         accent: '#f97316', unit: 'м³'    },
  water_cold:  { labelKey: 'pmMeters.waterCold',   accent: '#3b82f6', unit: 'м³'    },
  water_hot:   { labelKey: 'pmMeters.waterHot',    accent: '#ef4444', unit: 'м³'    },
  heating:     { labelKey: 'pmMeters.heating',     accent: '#a855f7', unit: 'Гкал'  },
};

const STALE_DAYS = 45;

export default function MetersIndex({ meters, apartments }: Props) {
  const { t } = useTranslation();
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState<MeterType | 'all'>('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [readingFor, setReadingFor] = useState<Meter | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return meters.filter((m) => {
      if (typeFilter !== 'all' && m.meter_type !== typeFilter) return false;
      if (q && !m.apartment?.includes(q) && !m.building?.toLowerCase().includes(q) && !m.serial_number?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [meters, search, typeFilter]);

  const stats = useMemo(() => {
    const cutoff = Date.now() - STALE_DAYS * 24 * 3600 * 1000;
    let fresh = 0, stale = 0, missing = 0;
    for (const m of meters) {
      if (!m.last_date) { missing++; continue; }
      if (new Date(m.last_date).getTime() < cutoff) stale++;
      else fresh++;
    }
    return { fresh, stale, missing };
  }, [meters]);

  return (
    <AppShell>
      <Head title="Счётчики — 1Mahalla" />
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#34d399' }}>Property Management</p>
            <h1 className="text-3xl font-bold text-slate-800 mt-1" style={{ fontFamily: 'var(--font-display)' }}>{t('pmMeters.title')}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{t('pmMeters.subtitle')}</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}>
            <Plus className="w-4 h-4" />{t('pmMeters.addMeter')}
          </button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Свежие показания"     value={stats.fresh}   accent="#34d399" />
          <StatCard label={`Просрочены (>${STALE_DAYS}д)`} value={stats.stale}   accent="#fbbf24" />
          <StatCard label="Без показаний"         value={stats.missing} accent="#ef4444" />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Поиск</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Квартира, здание, серийный №"
              className="rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }} />
          </div>
          <label className="flex flex-col gap-1.5 min-w-[180px]">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Тип</span>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as MeterType | 'all')}
              className="rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
              <option value="all">{t('pmMeters.allTypes')}</option>
              {Object.entries(METER_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
            </select>
          </label>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          {filtered.length === 0 ? (
            <div className="p-12 text-center" style={{ color: 'var(--muted)' }}>
              <Gauge className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--border)' }} />
              <p className="text-sm">{t('pmMeters.noData')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {[t('pmMeters.colApt'), t('pmMeters.colBuilding'), t('pmMeters.colType'), t('pmMeters.colSerial'), t('pmMeters.colLastReading'), t('pmMeters.colLastDate'), t('pmMeters.colUnit'), ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const meta = METER_META[m.meter_type];
                    const cutoff = Date.now() - STALE_DAYS * 24 * 3600 * 1000;
                    const isStale = m.last_date ? new Date(m.last_date).getTime() < cutoff : true;
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="px-4 py-3 text-slate-800 font-medium">№{m.apartment}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{m.building ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${meta.accent}1A`, color: meta.accent }}>{t(meta.labelKey)}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono" style={{ color: 'var(--muted)' }}>{m.serial_number ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-800 font-medium">
                              {m.last_reading != null ? m.last_reading.toLocaleString('ru-RU') : '—'}
                            </span>
                            {isStale && m.last_date && <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#fbbf24' }} />}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: isStale ? '#fbbf24' : 'var(--muted)' }}>
                          {m.last_date ? new Date(m.last_date).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>{m.unit ?? meta.unit}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setReadingFor(m)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: 'rgba(16,185,129,0.10)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
                            Внести
                          </button>
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

      {showAdd && <AddMeterModal apartments={apartments} onClose={() => setShowAdd(false)} />}
      {readingFor && <AddReadingModal meter={readingFor} onClose={() => setReadingFor(null)} />}
    </AppShell>
  );
}

function AddMeterModal({ apartments, onClose }: { apartments: ApartmentOption[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
    apartment_id: '',
    meter_type: 'electricity' as MeterType,
    serial_number: '',
    unit: 'кВт·ч',
    installed_date: '',
    initial_reading: '0',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post('/pm/meters', { onSuccess: onClose });
  }

  const meterUnits: Record<MeterType, string> = {
    electricity: 'кВт·ч', gas: 'м³', water_cold: 'м³', water_hot: 'м³', heating: 'Гкал',
  };

  function onTypeChange(t: MeterType) {
    setData({ ...data, meter_type: t, unit: meterUnits[t] });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-md space-y-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{t('pmMeters.addMeterTitle')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" style={{ color: 'var(--muted)' }}><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Квартира" error={errors.apartment_id}>
            <select value={data.apartment_id} onChange={(e) => setData('apartment_id', e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }}>
              <option value="">— Выбрать —</option>
              {apartments.map((a) => <option key={a.id} value={a.id} style={{ backgroundColor: 'var(--card)' }}>{a.label}</option>)}
            </select>
          </Field>
          <Field label="Тип счётчика" error={errors.meter_type}>
            <select value={data.meter_type} onChange={(e) => onTypeChange(e.target.value as MeterType)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }}>
              {Object.entries(METER_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
            </select>
          </Field>
          <Field label="Серийный номер" error={errors.serial_number}>
            <input value={data.serial_number} onChange={(e) => setData('serial_number', e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
          </Field>
          <Field label="Начальное показание" error={errors.initial_reading}>
            <input type="number" value={data.initial_reading} onChange={(e) => setData('initial_reading', e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>{t('pmMeters.cancel')}</button>
            <button type="submit" disabled={processing}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}>
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}{t('pmMeters.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddReadingModal({ meter, onClose }: { meter: Meter; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
    reading_value: '',
    reading_date: new Date().toISOString().slice(0, 10),
    source: 'manual' as 'manual' | 'photo_ai' | 'smart_meter',
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post(`/pm/meters/${meter.id}/readings`, { onSuccess: onClose });
  }

  const meta = METER_META[meter.meter_type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm space-y-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">{t('pmMeters.addReadingTitle')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100" style={{ color: 'var(--muted)' }}><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Кв. №{meter.apartment} · <span style={{ color: meta.accent }}>{t(meta.labelKey)}</span>
          {meter.last_reading != null && <> · Последнее: {meter.last_reading.toLocaleString('ru-RU')} {meta.unit}</>}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <Field label={`Показание (${meta.unit})`} error={errors.reading_value}>
            <input type="number" step="0.01" value={data.reading_value} onChange={(e) => setData('reading_value', e.target.value)}
              placeholder="12345.67"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
          </Field>
          <Field label="Дата" error={errors.reading_date}>
            <input type="date" value={data.reading_date} onChange={(e) => setData('reading_date', e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none"
              style={{ backgroundColor: 'var(--border)', border: '1px solid var(--border)' }} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>{t('pmMeters.cancel')}</button>
            <button type="submit" disabled={processing}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}>
              {processing && <Loader2 className="w-4 h-4 animate-spin" />}{t('pmMeters.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
      <p className="text-[10px] uppercase tracking-widest" style={{ color: accent }}>{label}</p>
      <p className="text-2xl text-slate-800 mt-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{value}</p>
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

