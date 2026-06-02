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
  pm_project_id: string;
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
    return buildings.filter((b) => b.pm_project_id === selectedProj);
  }, [buildings, selectedProj]);

  // When selected project changes, reset selected building to first available
  const handleProjectChange = (projId: string) => {
    setSelectedProj(projId);
    const firstBld = buildings.find((b) => b.pm_project_id === projId);
    const newBldId = firstBld ? firstBld.id : '';
    setSelectedBldg(newBldId);
    
    router.visit(route('pm.dashboard', { pm_project_id: projId, pm_building_id: newBldId }), {
      preserveState: true,
      only: ['apartments', 'metrics', 'selectedProj', 'selectedBldg'],
    });
  };

  const handleBuildingChange = (bldgId: string) => {
    setSelectedBldg(bldgId);
    router.visit(route('pm.dashboard', { pm_project_id: selectedProj, pm_building_id: bldgId }), {
      preserveState: true,
      only: ['apartments', 'metrics', 'selectedProj', 'selectedBldg'],
    });
  };

  return (
    <AppShell>
      <Head title="Mulk boshqaruvi — 1Mahalla" />

      <div className="space-y-6">
        <header>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#10b981' }}>
            Mulk boshqaruvi
          </p>
          <h1 className="text-3xl font-bold text-slate-800 mt-1" style={{ fontFamily: 'var(--font-display)' }}>
            Umumiy ko'rinish
          </h1>
          <p className="text-sm mt-1 text-slate-500">
            Aholilar, arizalar, hisob-fakturalar va kommunal aktivlarni boshqarish
          </p>
        </header>

        {/* Selectors */}
        <div className="flex flex-wrap gap-4 p-4 rounded-2xl bg-white" style={{ border: '1px solid rgba(16,185,129,0.12)' }}>
          <label className="flex flex-col gap-1.5 min-w-[200px]">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
              Loyiha
            </span>
            <select
              value={selectedProj}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none transition-all cursor-pointer bg-white"
              style={{
                border:          '1px solid rgba(16,185,129,0.15)',
              }}
            >
              {projects.length === 0 && <option value="">Loyihalar mavjud emas</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: '#ffffff' }}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 min-w-[200px]">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">
              Bino
            </span>
            <select
              value={selectedBldg}
              onChange={(e) => handleBuildingChange(e.target.value)}
              disabled={filteredBuildings.length === 0}
              className="rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none transition-all cursor-pointer disabled:opacity-50 bg-white"
              style={{
                border:          '1px solid rgba(16,185,129,0.15)',
              }}
            >
              {filteredBuildings.length === 0 && <option value="">Binolar mavjud emas</option>}
              {filteredBuildings.map((b) => (
                <option key={b.id} value={b.id} style={{ backgroundColor: '#ffffff' }}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Home}        label="Jami kvartiralar"  value={metrics.total_apartments.toString()}       accent="#10b981" />
          <MetricCard icon={Users}       label="Faol aholi"  value={metrics.active_residents.toString()}       accent="#14b8a6" />
          <MetricCard icon={Wrench}      label="Faol arizalar"     value={metrics.open_requests.toString()}          accent="#fbbf24" />
          <MetricCard icon={AlertCircle} label="To'lov qarzdorligi"  value={`${metrics.overdue_amount.toLocaleString()} UZS`} accent="#ef4444" />
        </div>

        {/* Chessboard */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800" style={{ fontFamily: 'var(--font-display)' }}>
            Uylar shaxmatkasi
          </h2>
          <ResidentsChessboard apartments={apartments} onSelect={setOpenDrawerId} />
        </section>

        {/* AI Insights Card Placeholder */}
        <section
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(20,184,166,0.04) 100%)',
            border:     '1px solid rgba(16,185,129,0.20)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
            >
              <Sparkles className="w-4 h-4 text-slate-800" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">🤖 AI Kommunal tahlil</h3>
              <p className="text-[11px] text-slate-400">
                AI modellariga asoslangan aqlli og'ish tahlili
              </p>
            </div>
          </div>
          <p className="text-xs py-2 text-slate-600">
            Barcha kommunal xizmatlar iste'moli ayni vaqtda optimal darajada. Hech qanday og'ishlar aniqlanmadi.
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
        backgroundColor: 'var(--card)',
        border:          '1px solid rgba(16,185,129,0.12)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${accent}1F`, border: `1px solid ${accent}3A` }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
      <p className="text-2xl text-slate-800 mt-3 font-bold" style={{ fontFamily: 'var(--font-display)' }}>
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

