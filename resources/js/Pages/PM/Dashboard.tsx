import { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { Home, Users, Wrench, AlertCircle, Sparkles } from 'lucide-react';
import AppShell from '@/Components/AppShell';
import ResidentsChessboard, { ChessboardApartment } from '@/Components/pm/ResidentsChessboard';
import ApartmentDetailDrawer from '@/Components/pm/ApartmentDetailDrawer';

interface Project {
  id: string;
  name: string;
}

interface Building {
  id: string;
  name: string;
  project_id: string;
}

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

export default function PMDashboard({
  projects,
  buildings,
  selectedProj: initialProj,
  selectedBldg: initialBldg,
  apartments,
  metrics,
}: Props) {
  const [selectedProj, setSelectedProj] = useState(initialProj || '');
  const [selectedBldg, setSelectedBldg] = useState(initialBldg || '');
  const [openDrawerId, setOpenDrawerId] = useState<string | null>(null);

  // Cascade buildings based on selected project
  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => b.project_id === selectedProj);
  }, [buildings, selectedProj]);

  // When selected project changes, reset selected building to first available
  const handleProjectChange = (projId: string) => {
    setSelectedProj(projId);
    const firstBld = buildings.find((b) => b.project_id === projId);
    const newBldId = firstBld ? firstBld.id : '';
    setSelectedBldg(newBldId);
    
    router.visit(route('pm.dashboard', { project_id: projId, building_id: newBldId }), {
      preserveState: true,
      only: ['apartments', 'metrics', 'selectedProj', 'selectedBldg'],
    });
  };

  const handleBuildingChange = (bldgId: string) => {
    setSelectedBldg(bldgId);
    router.visit(route('pm.dashboard', { project_id: selectedProj, building_id: bldgId }), {
      preserveState: true,
      only: ['apartments', 'metrics', 'selectedProj', 'selectedBldg'],
    });
  };

  return (
    <AppShell>
      <Head title="PM Dashboard - PropTech UZ" />

      <div className="space-y-6">
        <header>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#34d399' }}>
            Property Management
          </p>
          <h1 className="text-3xl font-bold text-white mt-1" style={{ fontFamily: 'var(--font-display)' }}>
            Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Manage residents, maintenance requests, invoices, and communal assets
          </p>
        </header>

        {/* Selectors */}
        <div className="flex flex-wrap gap-4 p-4 rounded-2xl" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.04)' }}>
          <label className="flex flex-col gap-1.5 min-w-[200px]">
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Project
            </span>
            <select
              value={selectedProj}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all cursor-pointer"
              style={{
                backgroundColor: '#161b22',
                border:          '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {projects.length === 0 && <option value="">No Projects</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: '#0d1117' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 min-w-[200px]">
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Building
            </span>
            <select
              value={selectedBldg}
              onChange={(e) => handleBuildingChange(e.target.value)}
              disabled={filteredBuildings.length === 0}
              className="rounded-xl px-3 py-2.5 text-sm text-white outline-none transition-all cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: '#161b22',
                border:          '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {filteredBuildings.length === 0 && <option value="">No Buildings</option>}
              {filteredBuildings.map((b) => (
                <option key={b.id} value={b.id} style={{ backgroundColor: '#0d1117' }}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Home}        label="Total Apartments"  value={metrics.total_apartments.toString()}       accent="#10b981" />
          <MetricCard icon={Users}       label="Active Residents"  value={metrics.active_residents.toString()}       accent="#14b8a6" />
          <MetricCard icon={Wrench}      label="Open Requests"     value={metrics.open_requests.toString()}          accent="#fbbf24" />
          <MetricCard icon={AlertCircle} label="Overdue Invoices"  value={`${metrics.overdue_amount.toLocaleString()} UZS`} accent="#ef4444" />
        </div>

        {/* Chessboard */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Residents Chessboard
          </h2>
          <ResidentsChessboard apartments={apartments} onSelect={setOpenDrawerId} />
        </section>

        {/* AI Insights Card Placeholder */}
        <section
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(59,130,246,0.04) 100%)',
            border:     '1px solid rgba(168,85,247,0.20)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)' }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">🤖 AI Consumption Insights</h3>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Smart deviation analysis powered by AI models
              </p>
            </div>
          </div>
          <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            All utility consumptions are currently within optimal parameters. No anomalies detected.
          </p>
        </section>

        <ApartmentDetailDrawer
          apartmentId={openDrawerId}
          onClose={() => setOpenDrawerId(null)}
        />
      </div>
    </AppShell>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MetricProps {
  icon:   React.ElementType;
  label:  string;
  value:  string;
  accent: string;
}
function MetricCard({ icon: Icon, label, value, accent }: MetricProps) {
  return (
    <div
      className="rounded-2xl p-5 transition-all"
      style={{
        backgroundColor: '#0d1117',
        border:          '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}1F`, border: `1px solid ${accent}3A` }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</p>
      </div>
      <p className="text-2xl text-white mt-3 font-bold" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
    </div>
  );
}

// Mock route helper if ziggy route is not globally injected
function route(name: string, params?: any) {
  if (name === 'pm.dashboard') {
    let url = '/pm/dashboard';
    if (params) {
      const q = new URLSearchParams(params).toString();
      if (q) url += '?' + q;
    }
    return url;
  }
  return '';
}
