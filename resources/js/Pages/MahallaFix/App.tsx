import { useCallback, useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Camera, ListChecks, Loader2, MapPin, PlusCircle, RefreshCw, X } from 'lucide-react';
import { apiFetch, ApiError } from './api';
import {
  CATEGORY_LABELS,
  type CityReport,
  type LatLng,
  type ReportCategory,
  type ReportStatus,
} from './types';
import LocationMap from './components/LocationMap';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initData: string;
        initDataUnsafe?: Record<string, unknown>;
        platform?: string;
        version?: string;
        colorScheme?: string;
      };
    };
  }
}

type Tab = 'new' | 'list';

export default function App() {
  const [tab, setTab] = useState<Tab>('new');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
  }, []);

  return (
    <>
      <Head title="Mahalla Fix" />
      <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg)' }}>
        <header className="px-4 pt-4 pb-2">
          <h1 className="text-lg font-bold text-slate-800">🏙 Mahalla Fix</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Shahar muammosini rasmga oling — biz idoraga yetkazamiz
          </p>
        </header>

        <div className="px-4">
          {tab === 'new' && <NewReportTab onCreated={() => setTab('list')} />}
          {tab === 'list' && <ReportsTab />}
        </div>

        <nav
          className="fixed bottom-0 left-0 right-0 flex border-t"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <TabButton icon={PlusCircle} label="Yangi murojaat" active={tab === 'new'} onClick={() => setTab('new')} />
          <TabButton icon={ListChecks} label="Murojaatlarim" active={tab === 'list'} onClick={() => setTab('list')} />
        </nav>
      </div>
    </>
  );
}

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: any;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors"
      style={{ color: active ? '#10b981' : 'var(--muted)' }}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

// ── Yangi murojaat: foto → GPS → xarita → tasdiqlash → yuborish ────────────────
function NewReportTab({ onCreated }: { onCreated: () => void }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pos, setPos] = useState<LatLng | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'loading' | 'error' | 'done'>('idle');
  const [category, setCategory] = useState<ReportCategory | ''>('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CityReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoState('error');
      return;
    }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoState('done');
      },
      () => setGeoState('error'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setPhoto(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!photo) {
      setError('Iltimos, muammoni rasmga oling.');
      return;
    }
    if (!pos) {
      setError('Joylashuv aniqlanmadi. GPS-ni yoqib qayta urinib ko\'ring.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const form = new FormData();
    form.append('photo', photo);
    form.append('latitude', String(pos.lat));
    form.append('longitude', String(pos.lng));
    if (category) form.append('category', category);
    if (description.trim()) form.append('description', description.trim());

    try {
      const res = await apiFetch<{ data: CityReport }>('/reports', { method: 'POST', body: form });
      setCreated(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  // Muvaffaqiyatli yaratilgach — AI natijasi va ticket ko'rsatiladi
  if (created) {
    return <CreatedScreen report={created} onDone={onCreated} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 1. Foto */}
      <section>
        <StepLabel n={1} text="Muammoni rasmga oling" />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onPhotoChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--card)' }}
        >
          {photoPreview ? (
            <img src={photoPreview} alt="" className="w-full aspect-video object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
              <Camera className="w-8 h-8" />
              <span className="text-xs font-semibold">Kamerani ochish / rasm tanlash</span>
            </div>
          )}
        </button>
      </section>

      {/* 2. GPS + xarita */}
      <section>
        <StepLabel n={2} text="Joylashuvni tasdiqlang" />
        {geoState === 'loading' && (
          <div className="flex items-center gap-2 text-xs py-3" style={{ color: 'var(--muted)' }}>
            <Loader2 className="w-4 h-4 animate-spin" /> Joylashuv aniqlanmoqda...
          </div>
        )}
        {geoState === 'error' && (
          <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
            <div className="flex items-center justify-between gap-2">
              <span>Joylashuv aniqlanmadi. GPS-ga ruxsat bering.</span>
              <button type="button" onClick={detectLocation} className="flex items-center gap-1 font-semibold">
                <RefreshCw className="w-3.5 h-3.5" /> Qayta
              </button>
            </div>
          </div>
        )}
        {pos && (
          <div className="space-y-2">
            <LocationMap value={pos} onChange={setPos} />
            <p className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--muted)' }}>
              <MapPin className="w-3.5 h-3.5" />
              {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} · nuqtani surib to'g'rilashingiz mumkin
            </p>
          </div>
        )}
      </section>

      {/* 3. Ixtiyoriy: kategoriya + izoh */}
      <section className="space-y-3">
        <StepLabel n={3} text="Qo'shimcha (ixtiyoriy)" />
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--muted)' }}>
            Kategoriya — bo'sh qoldirsangiz AI aniqlaydi
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(CATEGORY_LABELS) as [ReportCategory, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(category === value ? '' : value)}
                className="text-xs font-semibold py-2.5 rounded-xl transition-all text-left px-3"
                style={
                  category === value
                    ? { background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', color: '#fff' }
                    : { backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: '#1e293b' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={1000}
          placeholder="Muammo haqida qo'shimcha izoh..."
          className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none resize-none"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        />
      </section>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {submitting ? 'AI tahlil qilmoqda...' : 'Murojaatni yuborish'}
      </button>
    </form>
  );
}

function CreatedScreen({ report, onDone }: { report: CityReport; onDone: () => void }) {
  return (
    <div className="space-y-4 py-4">
      <div className="text-center">
        <div className="text-4xl">✅</div>
        <h2 className="text-base font-bold text-slate-800 mt-2">Murojaat qabul qilindi</h2>
        <p className="font-mono text-sm mt-1" style={{ color: '#10b981' }}>{report.ticket_code}</p>
      </div>

      <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <StatusPill status={report.status} label={report.status_label} />
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{report.category_label}</span>
        </div>
        <p className="text-sm font-semibold text-slate-800">{report.title}</p>
        {report.ai_summary && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg)' }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: '#10b981' }}>
              🤖 AI tavsifi
            </p>
            <p className="text-xs text-slate-700">{report.ai_summary}</p>
          </div>
        )}
      </div>

      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl text-sm font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
      >
        Murojaatlarim ro'yxatiga o'tish
      </button>
    </div>
  );
}

// ── Murojaatlarim ─────────────────────────────────────────────────────────────
function ReportsTab() {
  const [reports, setReports] = useState<CityReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CityReport | null>(null);

  useEffect(() => {
    apiFetch<{ data: CityReport[] }>('/reports')
      .then((res) => setReports(res.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Xatolik'));
  }, []);

  if (error) return <p className="text-xs text-red-500 py-4">{error}</p>;

  if (!reports) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3 py-2">
      {reports.length === 0 ? (
        <p className="text-xs text-center py-10" style={{ color: 'var(--muted)' }}>Hozircha murojaatlar yo'q</p>
      ) : (
        reports.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className="w-full text-left rounded-2xl p-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>{r.ticket_code}</span>
              <StatusPill status={r.status} label={r.status_label} />
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-1.5">{r.title}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
              {r.category_label} · {new Date(r.created_at).toLocaleDateString()}
            </p>
          </button>
        ))
      )}

      {selected && <ReportDetail report={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ReportDetail({ report, onClose }: { report: CityReport; onClose: () => void }) {
  const [detail, setDetail] = useState<CityReport>(report);

  useEffect(() => {
    apiFetch<{ data: CityReport }>(`/reports/${report.id}`)
      .then((res) => setDetail(res.data))
      .catch(() => {});
  }, [report.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-xs" style={{ color: '#10b981' }}>{detail.ticket_code}</span>
          <button onClick={onClose} className="p-1 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <StatusPill status={detail.status} label={detail.status_label} />
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>{detail.category_label}</span>
        </div>

        <h3 className="text-sm font-bold text-slate-800 mb-2">{detail.title}</h3>

        {detail.photo_url && (
          <img src={detail.photo_url} alt="" className="w-full rounded-xl mb-3 object-cover" />
        )}

        {detail.ai_summary && <p className="text-xs text-slate-600 leading-relaxed mb-3">{detail.ai_summary}</p>}
        {detail.description && (
          <p className="text-xs text-slate-500 leading-relaxed mb-3">💬 {detail.description}</p>
        )}

        {detail.resolution_notes && (
          <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: 'var(--bg)' }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--muted)' }}>
              Idora izohi
            </p>
            <p className="text-xs text-slate-700">{detail.resolution_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kichik UI helperlar ───────────────────────────────────────────────────────
function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span
        className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
      >
        {n}
      </span>
      <span className="text-xs font-semibold text-slate-700">{text}</span>
    </div>
  );
}

const STATUS_COLORS: Record<ReportStatus, { bg: string; color: string }> = {
  submitted: { bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
  in_progress: { bg: 'rgba(234,179,8,0.15)', color: '#a16207' },
  resolved: { bg: 'rgba(16,185,129,0.15)', color: '#059669' },
  rejected: { bg: 'rgba(148,163,184,0.18)', color: '#475569' },
};

function StatusPill({ status, label }: { status: ReportStatus; label: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.submitted;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.bg, color: c.color }}>
      {label}
    </span>
  );
}
