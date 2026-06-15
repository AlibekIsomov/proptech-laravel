import { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { apiFetch, ApiError } from './api';
import type { MeResponse } from './types';
import NotRegistered from './components/NotRegistered';
import ResidentApp from './components/ResidentApp';
import VendorApp from './components/VendorApp';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initData: string;
      };
    };
  }
}

type Tab = 'resident' | 'vendor';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [tab, setTab] = useState<Tab>('resident');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();

    apiFetch<MeResponse>('/me')
      .then((data) => {
        setMe(data);
        setTab(data.resident ? 'resident' : data.vendor ? 'vendor' : 'resident');
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Ulanishda xatolik'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-1">Xatolik</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{error || "Ma'lumot olinmadi"}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head title="1Mahalla" />
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        {!me.linked ? (
          <NotRegistered />
        ) : (
          <>
            {me.resident && me.vendor && (
              <div
                className="flex p-2 gap-2 sticky top-0 z-10"
                style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => setTab('resident')}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={
                    tab === 'resident'
                      ? { background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', color: '#fff' }
                      : { backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: '#1e293b' }
                  }
                >
                  🏠 Aholi
                </button>
                <button
                  onClick={() => setTab('vendor')}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={
                    tab === 'vendor'
                      ? { background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)', color: '#fff' }
                      : { backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: '#1e293b' }
                  }
                >
                  🛠 Pudratchi
                </button>
              </div>
            )}

            {tab === 'resident' && me.resident && <ResidentApp me={me} />}
            {tab === 'vendor' && me.vendor && <VendorApp me={me} />}
          </>
        )}
      </div>
    </>
  );
}
