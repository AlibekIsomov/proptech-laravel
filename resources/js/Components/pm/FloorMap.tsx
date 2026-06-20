/**
 * FloorMap — Shahmatka (schema + list layouts)
 * Converts apartment data to the 1mahalla PM design's floor map.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Grid, List, Building2 } from 'lucide-react';
import { Seg, EmptyState } from '@/Components/pm/ui';

export interface FloorUnit {
  id:           string;
  no:           string | number;
  floor:        number;
  col:          number;
  rooms:        number;
  area:         number;
  sale:         'free' | 'sold' | 'reserved';
  ticketState:  'ok' | 'open' | 'progress';
  overdue:      boolean;
  appConnected: boolean;
  section:      number;
  resident:     { name: string; type: string; phone?: string } | null;
}

type Overlay = 'tickets' | 'debt' | 'app' | 'sales';

function unitStateClass(u: FloorUnit, overlay: Overlay): string {
  if (overlay === 'sales') {
    if (u.sale === 'sold')     return 's-sold';
    if (u.sale === 'reserved') return 's-reserved';
    return 's-free';
  }
  if (overlay === 'tickets') {
    if (u.ticketState === 'open')     return 's-emergency';
    if (u.ticketState === 'progress') return 's-open';
    return 's-free';
  }
  if (overlay === 'debt') {
    if (u.overdue)          return 's-overdue';
    if (u.sale === 'sold')  return 's-paid';
    return 's-free s-dim';
  }
  if (overlay === 'app') {
    if (u.appConnected) return 's-app';
    return 's-free s-dim';
  }
  return 's-free';
}

function unitPip(u: FloorUnit, overlay: Overlay): string | null {
  if (overlay === 'tickets') return null;
  if (overlay === 'debt')    return u.overdue ? 'p-overdue' : null;
  if (overlay === 'app')     return u.appConnected ? 'p-app' : null;
  return null;
}

// ── Schema (grid) view ────────────────────────────────────────────────────────
function SchemaMap({ units, overlay, onPick }: { units: FloorUnit[]; overlay: Overlay; onPick: (u: FloorUnit) => void }) {
  const { t } = useTranslation();
  const floors = [...new Set(units.map(u => u.floor))].sort((a, b) => b - a);
  const sections = [...new Set(units.map(u => u.section))].sort();

  if (floors.length === 0) {
    return <div className="map-stage map-stage-empty"><EmptyState icon={Building2} title={t('pmDash.noUnits')} /></div>;
  }

  return (
    <div className="map-stage">
      <div className="fm-schema">
        {floors.map(f => {
          const fu = units.filter(u => u.floor === f).sort((a, b) => a.col - b.col);
          return (
            <div key={f} className="fm-row">
              <span className="fm-floor-no">{f}</span>
              <div className="fm-sections">
                {sections.map(sec => (
                  <div key={sec} className="fm-section">
                    {fu.filter(u => u.section === sec).map(u => {
                      const pip = unitPip(u, overlay);
                      return (
                        <button key={u.id} className={`fm-cell ${unitStateClass(u, overlay)}`} onClick={() => onPick(u)}>
                          {pip && <span className={`pip ${pip}`} />}
                          <span>{u.no}</span>
                          <span className="sub">{u.rooms}k · {u.area}m²</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {sections.length > 1 && (
        <div className="fm-section-labels">
          {sections.map(sec => (
            <span key={sec} className="fm-section-label" style={{ width: 264 }}>
              {t('pmDash.section', { defaultValue: 'Seksiya' })} {sec}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────
function ListMap({ units, overlay, onPick }: { units: FloorUnit[]; overlay: Overlay; onPick: (u: FloorUnit) => void }) {
  const { t } = useTranslation();
  const floors = [...new Set(units.map(u => u.floor))].sort((a, b) => b - a);

  if (floors.length === 0) {
    return <div className="map-stage map-stage-empty"><EmptyState icon={Building2} title={t('pmDash.noUnits')} /></div>;
  }

  return (
    <div className="fm-list">
      {floors.map(f => {
        const fu = units.filter(u => u.floor === f).sort((a, b) => a.col - b.col);
        const sold = fu.filter(u => u.sale === 'sold').length;
        const reserved = fu.filter(u => u.sale === 'reserved').length;
        const total = fu.length;
        return (
          <div key={f} className="fm-floor">
            <div className="fm-floor-head">
              <span className="fno">{f}</span>
              <div>
                <div className="ftitle">{t('common.floor', { defaultValue: 'Qavat' })} {f}</div>
                <div className="fmeta">{sold}/{total} {t('common.sold', { defaultValue: 'band' })}</div>
              </div>
              <div className="fbar">
                <i style={{ width: `${(sold / total) * 100}%`, background: 'var(--ok)' }} />
                <i style={{ width: `${(reserved / total) * 100}%`, background: 'var(--warn)' }} />
              </div>
            </div>
            <div className="fm-units">
              {fu.map(u => {
                const pip = unitPip(u, overlay);
                return (
                  <button key={u.id} className={`fm-unit ${unitStateClass(u, overlay)}`} onClick={() => onPick(u)}>
                    <div className="u-no">
                      {u.no}
                      {pip && <span className="u-pip" style={{ background: `var(--${pip === 'p-overdue' || pip === 'p-emergency' ? 'danger' : pip === 'p-app' ? 'accent' : 'warn'})` }} />}
                    </div>
                    <div className="u-sub">{u.rooms} xona · {u.area} m²</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function MapLegend({ overlay }: { overlay: Overlay }) {
  const { t } = useTranslation();
  const sets: Record<Overlay, [string, string][]> = {
    sales:   [['var(--ok)', t('pmDash.sold', { defaultValue: 'Band' })], ['var(--warn)', t('pmDash.reserved', { defaultValue: 'Bron' })], ['var(--border-strong)', t('pmDash.free', { defaultValue: "Bo'sh" })]],
    tickets: [['var(--danger)', t('pmDash.openTicket', { defaultValue: 'Ariza tushgan' })], ['var(--warn)', t('pmDash.inProgress', { defaultValue: 'Jarayonda' })], ['var(--border-strong)', t('pmDash.ok', { defaultValue: 'Muammosiz' })]],
    debt:    [['var(--danger)', t('pmDash.overdue', { defaultValue: "Muddati o'tgan" })], ['var(--ok)', t('pmDash.paid', { defaultValue: "To'langan" })], ['var(--border-strong)', t('common.no', { defaultValue: "Yo'q" })]],
    app:     [['var(--accent)', t('pmDash.inApp', { defaultValue: 'Ilovada' })], ['var(--border-strong)', t('common.no', { defaultValue: "Yo'q" })]],
  };
  return (
    <div className="legend">
      {sets[overlay].map(([c, label]) => (
        <span key={label} className="lg">
          <span className="sw" style={{ background: c }} />
          {label}
        </span>
      ))}
    </div>
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────
function FilterChips({ overlay, setOverlay, openCount, overdueCount, appCount }: {
  overlay: Overlay; setOverlay: (o: Overlay) => void;
  openCount: number; overdueCount: number; appCount: number;
}) {
  const { t } = useTranslation();
  const chips: { key: Overlay; label: string; cnt: number; cls: string }[] = [
    { key: 'tickets', label: t('pmDash.tickets', { defaultValue: 'Arizalar' }), cnt: openCount, cls: 'tickets' },
    { key: 'debt', label: t('pmDash.debt', { defaultValue: 'Qarzdorlik' }), cnt: overdueCount, cls: 'debt' },
    { key: 'app', label: t('pmDash.inApp', { defaultValue: 'Ilovada' }), cnt: appCount, cls: 'app' },
  ];
  return (
    <div className="chip-row">
      {chips.map(c => (
        <button key={c.key} className={`chip ${c.cls}${overlay === c.key ? ' on' : ''}`} onClick={() => setOverlay(c.key)}>
          {c.label}
          <span className="cnt">{c.cnt}</span>
        </button>
      ))}
    </div>
  );
}

// ── Main FloorMap component ───────────────────────────────────────────────────
interface FloorMapProps {
  units: FloorUnit[];
  onPick: (u: FloorUnit) => void;
  defaultLayout?: 'schema' | 'list';
}

export function FloorMap({ units, onPick, defaultLayout = 'schema' }: FloorMapProps) {
  const { t } = useTranslation();
  const [layout, setLayout] = useState<'schema' | 'list'>(defaultLayout);
  const [overlay, setOverlay] = useState<Overlay>('tickets');

  const openCount    = units.filter(u => u.ticketState === 'open' || u.ticketState === 'progress').length;
  const overdueCount = units.filter(u => u.overdue).length;
  const appCount     = units.filter(u => u.appConnected).length;

  return (
    <div>
      <div className="map-toolbar">
        <FilterChips overlay={overlay} setOverlay={setOverlay} openCount={openCount} overdueCount={overdueCount} appCount={appCount} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
          <Seg
            value={layout}
            onChange={v => setLayout(v as 'schema' | 'list')}
            options={[
              { value: 'schema', label: t('pmDash.schema', { defaultValue: 'Sxema' }), icon: Grid },
              { value: 'list',   label: t('pmDash.list',   { defaultValue: "Ro'yxat" }), icon: List },
            ]}
          />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <MapLegend overlay={overlay} />
      </div>
      {layout === 'schema'
        ? <SchemaMap units={units} overlay={overlay} onPick={onPick} />
        : <ListMap   units={units} overlay={overlay} onPick={onPick} />
      }
    </div>
  );
}
