import { useCallback, useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { apiFetch, ApiError } from '../api';
import type { MeResponse, VendorRequest } from '../types';
import { PriorityBadge, StatusBadge } from './Badges';

type Filter = 'active' | 'completed';

export default function VendorApp({ me }: { me: MeResponse }) {
  const [filter, setFilter] = useState<Filter>('active');
  const [requests, setRequests] = useState<VendorRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<VendorRequest | null>(null);

  const load = useCallback((f: Filter) => {
    setRequests(null);
    const query = f === 'completed' ? '?status=completed' : '';
    apiFetch<{ data: VendorRequest[] }>(`/vendor/requests${query}`)
      .then((res) => {
        const data = f === 'active' ? res.data.filter((r) => r.status !== 'completed') : res.data;
        setRequests(data);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Xatolik'));
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#10b981' }}>
          Pudratchi
        </p>
        <h2 className="text-lg font-bold text-slate-800 mt-1">{me.vendor?.name}</h2>
        {me.vendor?.rating != null && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>⭐ {me.vendor.rating}</p>
        )}
      </div>

      <div className="flex gap-2">
        <FilterButton label="Faol topshiriqlar" active={filter === 'active'} onClick={() => setFilter('active')} />
        <FilterButton label="Bajarilgan" active={filter === 'completed'} onClick={() => setFilter('completed')} />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {!requests ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-xs text-center py-10" style={{ color: 'var(--muted)' }}>Topshiriqlar yo'q</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
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
                {r.category_label} · 🏠 №{r.apartment_number ?? '—'}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <RequestDetail
          request={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setRequests((prev) => {
              if (!prev) return prev;
              if (filter === 'active' && updated.status === 'completed') {
                return prev.filter((r) => r.id !== updated.id);
              }
              return prev.map((r) => (r.id === updated.id ? updated : r));
            });
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
      style={
        active
          ? { background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', color: '#fff' }
          : { backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: '#1e293b' }
      }
    >
      {label}
    </button>
  );
}

function RequestDetail({
  request,
  onClose,
  onUpdated,
}: {
  request: VendorRequest;
  onClose: () => void;
  onUpdated: (r: VendorRequest) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advance = async (status: 'in_progress' | 'completed') => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch<{ data: VendorRequest }>(`/vendor/requests/${request.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      onUpdated(res.data);
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

        <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
          {request.category_label} · 🏠 №{request.apartment_number ?? '—'}
        </p>

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

        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

        {request.status === 'assigned' && (
          <button
            onClick={() => advance('in_progress')}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            ▶️ Boshlash
          </button>
        )}

        {request.status === 'in_progress' && (
          <button
            onClick={() => advance('completed')}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            ✅ Bajarildi
          </button>
        )}
      </div>
    </div>
  );
}
