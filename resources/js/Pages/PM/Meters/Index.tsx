import { useState, useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Stat, Btn, Field, TextInput, PmSelect, EmptyState,
  Gauge, Plus, X, Loader2, Search, Badge,
} from '@/Components/pm/ui';
import type { BadgeTone } from '@/Components/pm/ui';

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

const METER_META: Record<MeterType, { labelKey: string; tone: BadgeTone; unit: string }> = {
  electricity: { labelKey: 'pmMeters.electricity', tone: 'warn',    unit: 'кВт·ч' },
  gas:         { labelKey: 'pmMeters.gas',         tone: 'warn',    unit: 'м³'    },
  water_cold:  { labelKey: 'pmMeters.waterCold',   tone: 'info',    unit: 'м³'    },
  water_hot:   { labelKey: 'pmMeters.waterHot',    tone: 'danger',  unit: 'м³'    },
  heating:     { labelKey: 'pmMeters.heating',     tone: 'violet',  unit: 'Гкал'  },
};

const STALE_DAYS = 45;

export default function MetersIndex({ meters, apartments }: Props) {
  const { t } = useTranslation();
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState<MeterType | 'all'>('all');
  const [showAdd,    setShowAdd]    = useState(false);
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
      <div className="page">
        <PageHead
          eyebrow="Property Management"
          title={t('pmMeters.title')}
          sub={t('pmMeters.subtitle')}
          actions={<Btn variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>{t('pmMeters.addMeter')}</Btn>}
        />

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <Stat label={t('pmMeters.freshReadings')}                    value={stats.fresh}   icon={Gauge}                    tone="ok"     />
          <Stat label={`${t('pmMeters.staleReadings')} (>${STALE_DAYS}d)`} value={stats.stale}   icon={AlertTriangle as any} tone="warn"   />
          <Stat label={t('pmMeters.missingReadings')}                  value={stats.missing} icon={Gauge}                    tone="danger" />
        </div>

        {/* Filters */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
            <Field label={t('pmMeters.search')}>
              <TextInput icon={Search} value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={t('pmMeters.searchPlaceholder')} />
            </Field>
            <Field label={t('pmMeters.type')}>
              <PmSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as MeterType | 'all')}>
                <option value="all">{t('pmMeters.allTypes')}</option>
                {Object.entries(METER_META).map(([k, v]) => (
                  <option key={k} value={k}>{t(v.labelKey)}</option>
                ))}
              </PmSelect>
            </Field>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          {filtered.length === 0 ? (
            <EmptyState icon={Gauge} title={t('pmMeters.noData')} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('pmMeters.colApt')}</th>
                    <th>{t('pmMeters.colBuilding')}</th>
                    <th>{t('pmMeters.colType')}</th>
                    <th>{t('pmMeters.colSerial')}</th>
                    <th className="t-right">{t('pmMeters.colLastReading')}</th>
                    <th>{t('pmMeters.colLastDate')}</th>
                    <th>{t('pmMeters.colUnit')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const meta    = METER_META[m.meter_type];
                    const cutoff  = Date.now() - STALE_DAYS * 24 * 3600 * 1000;
                    const isStale = m.last_date ? new Date(m.last_date).getTime() < cutoff : true;
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>№{m.apartment}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{m.building ?? '—'}</td>
                        <td><Badge tone={meta.tone}>{t(meta.labelKey)}</Badge></td>
                        <td className="tnum" style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.serial_number ?? '—'}</td>
                        <td className="t-right">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                            <span className="tnum" style={{ fontWeight: 600 }}>
                              {m.last_reading != null ? m.last_reading.toLocaleString('ru-RU') : '—'}
                            </span>
                            {isStale && m.last_date && <AlertTriangle className="ic" style={{ color: 'var(--warn)', width: 14, height: 14 }} />}
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: isStale ? 'var(--warn)' : 'var(--text-3)' }}>
                          {m.last_date ? new Date(m.last_date).toLocaleDateString('ru-RU') : '—'}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.unit ?? meta.unit}</td>
                        <td>
                          <Btn variant="soft" size="sm" onClick={() => setReadingFor(m)}>
                            {t('pmMeters.enterReading')}
                          </Btn>
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

      {showAdd    && <AddMeterModal   apartments={apartments} onClose={() => setShowAdd(false)} />}
      {readingFor && <AddReadingModal meter={readingFor}      onClose={() => setReadingFor(null)} />}
    </AppShell>
  );
}

// ── Add Meter Modal ───────────────────────────────────────────────────────────

function AddMeterModal({ apartments, onClose }: { apartments: ApartmentOption[]; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
    apartment_id:    '',
    meter_type:      'electricity' as MeterType,
    serial_number:   '',
    unit:            'кВт·ч',
    installed_date:  '',
    initial_reading: '0',
  });

  const meterUnits: Record<MeterType, string> = {
    electricity: 'кВт·ч', gas: 'м³', water_cold: 'м³', water_hot: 'м³', heating: 'Гкал',
  };

  function onTypeChange(type: MeterType) {
    setData({ ...data, meter_type: type, unit: meterUnits[type] });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post('/pm/meters', { onSuccess: onClose });
  }

  return (
    <div className="scrim show" onClick={onClose}>
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={e => e.stopPropagation()}>
        <div className="card card-pad" style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>{t('pmMeters.addMeterTitle')}</h2>
            <button className="drawer-close" onClick={onClose}><X className="ic" /></button>
          </div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FmField label={t('pmMeters.colApt')} error={errors.apartment_id}>
              <PmSelect value={data.apartment_id} onChange={(e) => setData('apartment_id', e.target.value)}>
                <option value="">— {t('pmMeters.selectApt')} —</option>
                {apartments.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </PmSelect>
            </FmField>
            <FmField label={t('pmMeters.colType')} error={errors.meter_type}>
              <PmSelect value={data.meter_type} onChange={(e) => onTypeChange(e.target.value as MeterType)}>
                {Object.entries(METER_META).map(([k, v]) => <option key={k} value={k}>{t(v.labelKey)}</option>)}
              </PmSelect>
            </FmField>
            <FmField label={t('pmMeters.colSerial')} error={errors.serial_number}>
              <TextInput value={data.serial_number} onChange={(e) => setData('serial_number', e.target.value)} />
            </FmField>
            <FmField label={t('pmMeters.initialReading')} error={errors.initial_reading}>
              <TextInput type="number" value={data.initial_reading} onChange={(e) => setData('initial_reading', e.target.value)} />
            </FmField>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" block type="button" onClick={onClose}>{t('pmMeters.cancel')}</Btn>
              <Btn variant="primary" block type="submit" disabled={processing} icon={processing ? Loader2 : undefined}>
                {t('pmMeters.save')}
              </Btn>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Add Reading Modal ─────────────────────────────────────────────────────────

function AddReadingModal({ meter, onClose }: { meter: Meter; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, setData, post, processing, errors } = useForm({
    reading_value: '',
    reading_date:  new Date().toISOString().slice(0, 10),
    source:        'manual' as 'manual' | 'photo_ai' | 'smart_meter',
  });

  const meta = METER_META[meter.meter_type];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    post(`/pm/meters/${meter.id}/readings`, { onSuccess: onClose });
  }

  return (
    <div className="scrim show" onClick={onClose}>
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={e => e.stopPropagation()}>
        <div className="card card-pad" style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>{t('pmMeters.addReadingTitle')}</h2>
            <button className="drawer-close" onClick={onClose}><X className="ic" /></button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 18 }}>
            Kv. №{meter.apartment} ·&nbsp;
            <Badge tone={meta.tone}>{t(meta.labelKey)}</Badge>
            {meter.last_reading != null && <>&nbsp;· Oxirgi: {meter.last_reading.toLocaleString('ru-RU')} {meta.unit}</>}
          </p>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FmField label={`Ko'rsatma (${meta.unit})`} error={errors.reading_value}>
              <TextInput type="number" step="0.01" placeholder="12345.67"
                value={data.reading_value} onChange={(e) => setData('reading_value', e.target.value)} />
            </FmField>
            <FmField label="Sana" error={errors.reading_date}>
              <TextInput type="date" value={data.reading_date} onChange={(e) => setData('reading_date', e.target.value)} />
            </FmField>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <Btn variant="ghost" block type="button" onClick={onClose}>{t('pmMeters.cancel')}</Btn>
              <Btn variant="primary" block type="submit" disabled={processing} icon={processing ? Loader2 : undefined}>
                {t('pmMeters.save')}
              </Btn>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── FmField (field with error) ────────────────────────────────────────────────

function FmField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      {children}
      {error && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}
