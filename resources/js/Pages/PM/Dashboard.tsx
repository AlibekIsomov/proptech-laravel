import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/Components/AppShell';
import {
  Stat, PageHead, Field, PmSelect, Badge,
  Home, UserCheck, Wrench, AlertCircle,
} from '@/Components/pm/ui';
import { FloorMap } from '@/Components/pm/FloorMap';
import ApartmentDetailDrawer from '@/Components/pm/ApartmentDetailDrawer';
import type { ChessboardApartment } from '@/Components/pm/ResidentsChessboard';

interface Project { id: string; name: string; }
interface Building { id: string; name: string; pm_project_id: string; }
interface Metrics {
  total_apartments: number;
  active_residents: number;
  open_requests:    number;
  overdue_amount:   number;
}
interface Props {
  projects:     Project[];
  buildings:    Building[];
  selectedProj: string | null;
  selectedBldg: string | null;
  apartments:   ChessboardApartment[];
  metrics:      Metrics;
}

function fmtUZS(n: number) { return n.toLocaleString('ru-RU').replace(/,/g, ' '); }

function pmRoute(name: string, params?: Record<string, string>) {
  if (name === 'pm.dashboard') {
    let url = '/pm/dashboard';
    if (params) { const q = new URLSearchParams(params).toString(); if (q) url += '?' + q; }
    return url;
  }
  return '/pm/dashboard';
}

export default function PMDashboard({ projects, buildings, selectedProj: initProj, selectedBldg: initBldg, apartments, metrics }: Props) {
  const { t } = useTranslation();
  const [selectedProj, setSelectedProj] = useState(initProj || '');
  const [selectedBldg, setSelectedBldg] = useState(initBldg || '');
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

  const filteredBuildings = useMemo(() => buildings.filter(b => b.pm_project_id === selectedProj), [buildings, selectedProj]);

  function handleProjectChange(projId: string) {
    setSelectedProj(projId);
    const firstBld = buildings.find(b => b.pm_project_id === projId);
    const bldId = firstBld ? firstBld.id : '';
    setSelectedBldg(bldId);
    router.visit(pmRoute('pm.dashboard', { pm_project_id: projId, pm_building_id: bldId }), {
      preserveState: true, only: ['apartments', 'metrics', 'selectedProj', 'selectedBldg'],
    });
  }

  function handleBuildingChange(bldgId: string) {
    setSelectedBldg(bldgId);
    router.visit(pmRoute('pm.dashboard', { pm_project_id: selectedProj, pm_building_id: bldgId }), {
      preserveState: true, only: ['apartments', 'metrics', 'selectedProj', 'selectedBldg'],
    });
  }

  // Map ChessboardApartment → FloorMap unit shape
  const units = apartments.map(a => ({
    id:      a.id,
    no:      a.number,
    floor:   a.floor,
    col:     0,
    rooms:   a.rooms_count ?? 1,
    area:    Number(a.size_m2) || 0,
    sale:    (a.status === 'empty' ? 'free' : 'sold') as 'free' | 'sold' | 'reserved',
    ticketState: (
      a.status === 'emergency'    ? 'open' :
      a.status === 'open_request' ? 'progress' : 'ok'
    ) as 'open' | 'progress' | 'ok',
    overdue:      a.status === 'overdue',
    appConnected: false,
    section: 1,
    resident: null,
  }));

  return (
    <AppShell openRequestCount={metrics.open_requests > 0 ? metrics.open_requests : undefined}>
      <Head title="1mahalla PM" />

      <div className="page">
        <PageHead
          eyebrow={t('common.propertyMgmt')}
          title={t('pmDash.title')}
          sub={t('pmDash.subtitle')}
        />

        {/* Selectors */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, maxWidth: 680 }}>
            <Field label={t('common.project')}>
              <PmSelect value={selectedProj} onChange={e => handleProjectChange(e.target.value)}>
                {projects.length === 0 && <option value="">{t('pmDash.noProjects')}</option>}
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </PmSelect>
            </Field>
            <Field label={t('common.building')}>
              <PmSelect value={selectedBldg} onChange={e => handleBuildingChange(e.target.value)} disabled={filteredBuildings.length === 0}>
                {filteredBuildings.length === 0 && <option value="">{t('pmDash.noBuildings')}</option>}
                {filteredBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </PmSelect>
            </Field>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 30 }}>
          <Stat label={t('pmDash.totalApts')}       value={metrics.total_apartments} icon={Home}         tone="brand" />
          <Stat label={t('pmDash.activeResidents')} value={metrics.active_residents} icon={UserCheck}    tone="info"  />
          <Stat label={t('pmDash.openRequests')}    value={metrics.open_requests}    icon={Wrench}       tone="warn"  />
          <Stat label={t('pmDash.overdueAmount')}   value={fmtUZS(metrics.overdue_amount)} suffix="UZS" icon={AlertCircle} tone="danger" />
        </div>

        {/* Shahmatka / Floor Map */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 20 }}>{t('pmDash.chessboard')}</h2>
        </div>
        <FloorMap units={units} onPick={u => setOpenDrawerId(u.id)} />
      </div>

      <ApartmentDetailDrawer
        apartmentId={openDrawerId}
        onClose={() => setOpenDrawerId(null)}
      />
    </AppShell>
  );
}
