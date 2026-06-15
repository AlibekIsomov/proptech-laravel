import { useCallback, useEffect, useState } from 'react';
import { Home, ListChecks, Loader2, PlusCircle, Star, X } from 'lucide-react';
import { apiFetch, ApiError } from '../api';
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  type MeResponse,
  type RequestCategory,
  type RequestPriority,
  type ResidentRequest,
} from '../types';
import { PriorityBadge, StatusBadge } from './Badges';

type Tab = 'apartment' | 'new' | 'list';

export default function ResidentApp({ me }: { me: MeResponse }) {
  const [tab, setTab] = useState<Tab>('apartment');

  return (
    <div className="pb-20">
      <div className="p-4">
        {tab === 'apartment' && <ApartmentTab me={me} />}
        {tab === 'new' && <NewRequestTab onCreated={() => setTab('list')} />}
        {tab === 'list' && <RequestsTab />}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 flex border-t"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <TabButton icon={Home} label="Kvartiram" active={tab === 'apartment'} onClick={() => setTab('apartment')} />
        <TabButton icon={PlusCircle} label="Yangi murojaat" active={tab === 'new'} onClick={() => setTab('new')} />
        <TabButton icon={ListChecks} label="Murojaatlarim" active={tab === 'list'} onClick={() => setTab('list')} />
      </nav>
    </div>
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

function ApartmentTab({ me }: { me: MeResponse }) {
  const resident = me.resident;
  const apartment = resident?.apartment;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#10b981' }}>
          Mening kvartiram
        </p>
        <h2 className="text-2xl font-bold text-slate-800 mt-1 font-mono">№{apartment?.number ?? '—'}</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{apartment?.building ?? ''}</p>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <InfoBox label="Qavat" value={apartment?.floor ?? '—'} />
          <InfoBox label="Xonalar" value={apartment?.rooms ?? '—'} />
          <InfoBox label="Maydon" value={apartment?.area ? `${apartment.area} m²` : '—'} />
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--muted)' }}>
          Aholi
        </p>
        <p className="text-sm font-semibold text-slate-800">{resident?.full_name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{residentTypeLabel(resident?.resident_type)}</p>
      </div>

      {me.apartments && me.apartments.length > 1 && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: 'var(--muted)' }}>
            Sizning kvartiralaringiz
          </p>
          <div className="space-y-1.5">
            {me.apartments.map((a) => (
              <div
                key={a.resident_id}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-xl"
                style={{ backgroundColor: a.is_active ? 'rgba(16,185,129,0.08)' : 'var(--bg)' }}
              >
                <span className="font-mono text-slate-800">№{a.apartment_number ?? '—'}</span>
                {a.is_active && <span className="text-[10px] font-semibold" style={{ color: '#10b981' }}>Faol</span>}
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
            Kvartirani almashtirish uchun botda "🔁 Kvartirani almashtirish" tugmasidan foydalaning.
          </p>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl p-2.5 text-center" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
      <p className="text-sm font-bold text-slate-800 font-mono">{value}</p>
      <p className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
    </div>
  );
}

function residentTypeLabel(type?: string): string {
  switch (type) {
    case 'owner':
      return 'Mulkdor';
    case 'tenant':
      return 'Ijarachi';
    case 'family':
      return "Oila a'zosi";
    default:
      return type ?? '—';
  }
}

function NewRequestTab({ onCreated }: { onCreated: () => void }) {
  const [category, setCategory] = useState<RequestCategory | ''>('');
  const [priority, setPriority] = useState<RequestPriority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !title.trim()) {
      setError("Kategoriya va sarlavhani to'ldiring.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const form = new FormData();
    form.append('category', category);
    form.append('priority', priority);
    form.append('title', title.trim());
    form.append('description', description.trim());
    if (photo) {
      form.append('photo', photo);
    }

    try {
      await apiFetch('/resident/requests', { method: 'POST', body: form });
      setSuccess(true);
      setCategory('');
      setPriority('medium');
      setTitle('');
      setDescription('');
      setPhoto(null);
      setTimeout(() => {
        setSuccess(false);
        onCreated();
      }, 900);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-sm font-bold text-slate-800">📝 Yangi murojaat</h2>

      <div>
        <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--muted)' }}>
          Kategoriya
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value as RequestCategory)}
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

      <div>
        <label className="block text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--muted)' }}>
          Ustuvorlik
        </label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPriority(value as RequestPriority)}
              className="text-xs font-semibold py-2.5 rounded-xl transition-all px-3"
              style={
                priority === value
                  ? { background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', color: '#fff' }
                  : { backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: '#1e293b' }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
          Sarlavha
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
          placeholder="Masalan: Oshxonada kran oqayapti"
          className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
          Tavsif (ixtiyoriy)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Muammoni batafsil yozing..."
          className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none resize-none"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
        />
      </div>

      <div>
        <label className="block text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>
          Rasm (ixtiyoriy)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="w-full text-xs text-slate-600"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {success && <p className="text-xs font-semibold" style={{ color: '#10b981' }}>✅ Murojaat yuborildi!</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Yuborish
      </button>
    </form>
  );
}

function RequestsTab() {
  const [requests, setRequests] = useState<ResidentRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResidentRequest | null>(null);

  const load = useCallback(() => {
    apiFetch<{ data: ResidentRequest[] }>('/resident/requests')
      .then((res) => setRequests(res.data))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Xatolik'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <p className="text-xs text-red-500">{error}</p>;
  }

  if (!requests) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-slate-800">📋 Murojaatlarim</h2>

      {requests.length === 0 ? (
        <p className="text-xs text-center py-10" style={{ color: 'var(--muted)' }}>Hozircha murojaatlar yo'q</p>
      ) : (
        requests.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r)}
            className="w-full text-left rounded-2xl p-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <PriorityBadge priority={r.priority} label={r.priority_label} />
              <StatusBadge status={r.status} label={r.status_label} />
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-2">{r.title}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
              {r.category_label} · {new Date(r.created_at).toLocaleDateString()}
            </p>
          </button>
        ))
      )}

      {selected && (
        <RequestDetail
          request={selected}
          onClose={() => setSelected(null)}
          onRated={(updated) => {
            setRequests((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? null);
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

function RequestDetail({
  request,
  onClose,
  onRated,
}: {
  request: ResidentRequest;
  onClose: () => void;
  onRated: (r: ResidentRequest) => void;
}) {
  const [rating, setRating] = useState(request.resident_rating ?? 0);
  const [feedback, setFeedback] = useState(request.resident_feedback ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitRating = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch<{ data: ResidentRequest }>(`/resident/requests/${request.id}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating, feedback: feedback || null }),
      });
      onRated(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800">{request.title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <PriorityBadge priority={request.priority} label={request.priority_label} />
          <StatusBadge status={request.status} label={request.status_label} />
        </div>

        {request.description && (
          <p className="text-xs text-slate-600 leading-relaxed mb-3">{request.description}</p>
        )}

        {request.photos && request.photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {request.photos.map((p) => (
              <img key={p.id} src={p.url} className="w-full aspect-square object-cover rounded-xl" />
            ))}
          </div>
        )}

        {request.resolution_notes && (
          <div className="rounded-xl p-3 mb-3" style={{ backgroundColor: 'var(--bg)' }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: 'var(--muted)' }}>
              Bajaruvchi izohi
            </p>
            <p className="text-xs text-slate-700">{request.resolution_notes}</p>
          </div>
        )}

        {request.status === 'completed' && (
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--muted)' }}>
              {request.resident_rating ? 'Sizning bahoyingiz' : 'Xizmatni baholang'}
            </p>
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={!!request.resident_rating}
                  onClick={() => setRating(star)}
                  className="disabled:cursor-default"
                >
                  <Star
                    className="w-6 h-6"
                    fill={star <= rating ? '#fbbf24' : 'none'}
                    stroke={star <= rating ? '#fbbf24' : '#94a3b8'}
                  />
                </button>
              ))}
            </div>

            {!request.resident_rating && (
              <>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Fikr-mulohaza (ixtiyoriy)"
                  rows={2}
                  className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none resize-none mb-2"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                />
                {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                <button
                  onClick={submitRating}
                  disabled={submitting || rating === 0}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
                >
                  Yuborish
                </button>
              </>
            )}

            {request.resident_feedback && <p className="text-xs text-slate-600 mt-2">{request.resident_feedback}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
