import { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppShell from '@/Components/AppShell';
import { PageHead, Badge, Stat, priorityTone } from '@/Components/pm/ui';
import { MapPin, Search, ChevronRight, Inbox } from 'lucide-react';
import CityReportMap from '@/Components/pm/CityReportMap';

interface Report {
  id: string;
  ticket_code: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  latitude: number;
  longitude: number;
  address: string | null;
  reporter_name: string | null;
  ai_summary: string | null;
  created_at: string;
}

interface Props {
  reports: Report[];
  categoryLabels: Record<string, string>;
  priorityLabels: Record<string, string>;
  statusLabels: Record<string, string>;
  filters: { status?: string; category?: string; search?: string };
}

const STATUS_TONE: Record<string, 'warn' | 'info' | 'ok' | 'neutral'> = {
  submitted: 'info',
  in_progress: 'warn',
  resolved: 'ok',
  rejected: 'neutral',
};

export default function Index({ reports, categoryLabels, priorityLabels, statusLabels, filters }: Props) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [status, setStatus] = useState(filters.status ?? '');
  const [category, setCategory] = useState(filters.category ?? '');

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (status && r.status !== status) return false;
      if (category && r.category !== category) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.title?.toLowerCase().includes(q) ||
          r.ticket_code?.toLowerCase().includes(q) ||
          (r.address ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [reports, status, category, search]);

  const points = useMemo(
    () => filtered.map((r) => ({ id: r.id, lat: r.latitude, lng: r.longitude, label: `${r.ticket_code} — ${r.title}` })),
    [filtered],
  );

  const counts = useMemo(() => ({
    submitted: reports.filter((r) => r.status === 'submitted').length,
    in_progress: reports.filter((r) => r.status === 'in_progress').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }), [reports]);

  return (
    <AppShell>
      <Head title="Mahalla Fix — Murojaatlar" />

      <PageHead
        eyebrow="Mahalla Fix"
        title="Fuqaro murojaatlari"
        sub="Shahar infratuzilma muammolari — xaritada, statusi bilan"
      />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Yuborildi" value={counts.submitted} icon={Inbox} tone="brand" />
        <Stat label="Jarayonda" value={counts.in_progress} icon={MapPin} tone="brand" />
        <Stat label="Hal etildi" value={counts.resolved} icon={MapPin} tone="brand" />
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 16 }}>
        <CityReportMap points={points} height={300} />
      </div>

      {/* Filtrlar */}
      <div className="card" style={{ padding: 12, marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search className="ic" style={{ position: 'absolute', left: 10, top: 10, width: 16, height: 16, opacity: 0.5 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ticket, sarlavha yoki manzil..."
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}>
          <option value="">Barcha holatlar</option>
          {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)' }}>
          <option value="">Barcha turlar</option>
          {Object.entries(categoryLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Ro'yxat */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            Murojaatlar topilmadi
          </div>
        ) : (
          filtered.map((r) => (
            <Link
              key={r.id}
              href={`/pm/city-reports/${r.id}`}
              className="card"
              style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)' }}>{r.ticket_code}</span>
                  <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>{statusLabels[r.status] ?? r.status}</Badge>
                  <Badge tone={priorityTone(r.priority)}>{priorityLabels[r.priority] ?? r.priority}</Badge>
                </div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {categoryLabels[r.category] ?? r.category}
                  {r.address ? ` · ${r.address}` : ''} · {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <ChevronRight className="ic" style={{ opacity: 0.4 }} />
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
