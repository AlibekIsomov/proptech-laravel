import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppShell from '@/Components/AppShell';
import { PageHead, Badge, Btn, priorityTone } from '@/Components/pm/ui';
import { ArrowLeft, MapPin, User } from 'lucide-react';
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
  reporter_username: string | null;
  ai_summary: string | null;
  ai_category: string | null;
  ai_priority: string | null;
  description: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  photo_url: string | null;
  created_at: string;
}

interface Props {
  report: Report;
  categoryLabels: Record<string, string>;
  priorityLabels: Record<string, string>;
  statusLabels: Record<string, string>;
}

const STATUS_TONE: Record<string, 'warn' | 'info' | 'ok' | 'neutral'> = {
  submitted: 'info',
  in_progress: 'warn',
  resolved: 'ok',
  rejected: 'neutral',
};

export default function Show({ report, categoryLabels, priorityLabels, statusLabels }: Props) {
  const [status, setStatus] = useState(report.status);
  const [notes, setNotes] = useState(report.resolution_notes ?? '');
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    router.patch(`/pm/city-reports/${report.id}/status`, { status, resolution_notes: notes }, {
      preserveScroll: true,
      onFinish: () => setSaving(false),
    });
  };

  const mapUrl = `https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=18/${report.latitude}/${report.longitude}`;

  return (
    <AppShell>
      <Head title={`${report.ticket_code} — Mahalla Fix`} />

      <Link href="/pm/city-reports" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13, marginBottom: 8, textDecoration: 'none' }}>
        <ArrowLeft className="ic" style={{ width: 16, height: 16 }} /> Murojaatlar ro'yxati
      </Link>

      <PageHead
        eyebrow={report.ticket_code}
        title={report.title}
        sub={new Date(report.created_at).toLocaleString()}
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            <Badge tone={STATUS_TONE[report.status] ?? 'neutral'}>{statusLabels[report.status] ?? report.status}</Badge>
            <Badge tone={priorityTone(report.priority)}>{priorityLabels[report.priority] ?? report.priority}</Badge>
          </div>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {/* Chap: foto + AI + izoh */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {report.photo_url && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <img src={report.photo_url} alt="" style={{ width: '100%', display: 'block' }} />
            </div>
          )}

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}>
              🤖 AI tavsifi
            </div>
            <div style={{ fontSize: 13 }}>{report.ai_summary ?? '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              Kategoriya: {categoryLabels[report.category] ?? report.category}
            </div>
          </div>

          {report.description && (
            <div className="card" style={{ padding: 14 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted)', fontWeight: 700, marginBottom: 4 }}>
                Fuqaro izohi
              </div>
              <div style={{ fontSize: 13 }}>{report.description}</div>
            </div>
          )}

          <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User className="ic" style={{ width: 18, height: 18, opacity: 0.6 }} />
            <div style={{ fontSize: 13 }}>
              {report.reporter_name ?? 'Anonim'}
              {report.reporter_username ? ` · @${report.reporter_username}` : ''}
            </div>
          </div>
        </div>

        {/* O'ng: xarita + status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card" style={{ padding: 12 }}>
            <CityReportMap points={[{ id: report.id, lat: report.latitude, lng: report.longitude }]} height={260} />
            <a href={mapUrl} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 8, color: 'var(--accent)' }}>
              <MapPin className="ic" style={{ width: 14, height: 14 }} />
              {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
              {report.address ? ` · ${report.address}` : ''}
            </a>
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Holatni boshqarish</div>

            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Holat</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', margin: '4px 0 12px' }}>
              {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>

            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Idora izohi</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Bajarilgan ish yoki izoh..."
              style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card)', margin: '4px 0 12px', resize: 'vertical' }} />

            <Btn variant="primary" block onClick={save} disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </Btn>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
