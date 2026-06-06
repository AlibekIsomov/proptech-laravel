import { useState, useRef, useEffect } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
    Building2, TrendingUp, DollarSign, Home, Bell,
    Search, ChevronUp, ChevronDown, Sparkles, Lightbulb,
    Loader2, Wrench, Users as UsersIcon, Receipt, Gauge,
} from 'lucide-react';
import AppShell from '@/Components/AppShell';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Metrics {
    totalApts: number;
    soldApts:  number;
    availApts: number;
    revenue:   number;
}

interface MonthlySalesItem {
    month: string;
    units: number;
    revenue: number;
}

interface ProjectDataItem {
    name: string;
    sold: number;
    available: number;
}

interface Transaction {
    id:        string;
    client:    string;
    apartment: string;
    amount:    string;
    date:      string;
    status:    'completed' | 'reserved';
}

interface Notification {
    id:         string | number;
    full_name:  string;
    status:     string;
    created_at: string;
}

interface PMStats {
    open_requests: number;
    vendors:       number;
}

interface Props {
    metrics:       Metrics;
    monthlySales:  MonthlySalesItem[];
    projectData:   ProjectDataItem[];
    transactions:  Transaction[];
    notifications: Notification[];
    pmStats:       PMStats | null;
}

interface AuthUser {
    full_name: string;
    role:      string;
    company_name: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function useTimeAgo() {
    const { t } = useTranslation();
    return (iso: string): string => {
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1)  return t('dashboard.justNow');
        if (m < 60) return `${m} ${t('dashboard.minutesAgo')}`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} ${t('dashboard.hoursAgo')}`;
        return `${Math.floor(h / 24)} ${t('dashboard.daysAgo')}`;
    };
}

const TX_STATUS_STYLES: Record<string, { bg: string; text: string; labelKey: string }> = {
    completed: { bg: 'rgba(34,197,94,0.12)', text: '#15803d', labelKey: 'dashboard.completed' },
    reserved:  { bg: 'rgba(39,162,71,0.12)', text: '#1a7a34', labelKey: 'dashboard.reserved'  },
};

const STATUS_NOTIF_KEYS: Record<string, { labelKey: string; color: string }> = {
    contacted: { labelKey: 'dashboard.contacted', color: '#27A247' },
    viewing:   { labelKey: 'dashboard.viewing',   color: '#f59e0b' },
    reserved:  { labelKey: 'dashboard.reserved',  color: '#4ade80' },
    bought:    { labelKey: 'dashboard.bought',     color: '#22c55e' },
};

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({
    title, value, icon, accent, loading = false, change, positive,
}: {
    title: string; value: string; icon: React.ReactNode; accent: string;
    loading?: boolean; change?: string; positive?: boolean;
}) {
    return (
        <div className="rounded-2xl p-5 flex flex-col gap-4"
            style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(39,162,71,0.12)' }}>
            <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
                <div className="flex items-center justify-center w-9 h-9 rounded-xl"
                    style={{ background: `linear-gradient(135deg,${accent}22,${accent}10)`, border: `1px solid ${accent}30` }}>
                    <span style={{ color: accent }}>{icon}</span>
                </div>
            </div>
            <div>
                {loading
                    ? <div className="h-8 w-28 rounded-lg animate-pulse" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }} />
                    : <p className="text-3xl text-slate-800 font-bold">{value}</p>
                }
                {change && !loading && (
                    <div className="flex items-center gap-1 mt-1.5">
                        {positive
                            ? <ChevronUp className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                            : <ChevronDown className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                        }
                        <span className="text-xs font-semibold" style={{ color: positive ? '#10b981' : '#ef4444' }}>{change}</span>
                        <span className="text-xs text-slate-400">o'tgan oyga nisbatan</span>
                    </div>
                )}
            </div>
        </div>
    );
}

function PMTile({ href, title, value, hint, accent, icon }: {
    href: string; title: string; value: string | number;
    hint: string; accent: string; icon: React.ReactNode;
}) {
    return (
        <Link href={href} className="rounded-xl p-4 flex flex-col gap-3 transition-colors hover:bg-slate-50"
            style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(39,162,71,0.12)' }}>
            <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ background: `linear-gradient(135deg,${accent}22,${accent}10)`, border: `1px solid ${accent}25` }}>
                    <span style={{ color: accent }}>{icon}</span>
                </div>
            </div>
            <div>
                <p className="text-2xl text-slate-800 font-bold">{value}</p>
                <p className="text-xs mt-0.5 text-slate-400">{hint}</p>
            </div>
        </Link>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardIndex({ metrics, monthlySales, projectData, transactions, notifications, pmStats }: Props) {
    const { t } = useTranslation();
    const timeAgo = useTimeAgo();
    const { auth } = usePage<{ auth: { user: AuthUser } }>().props;
    const user = auth.user;

    const [searchQuery, setSearchQuery] = useState('');
    const [showNotif,   setShowNotif]   = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    // AI Insights state
    const [insights,  setInsights]  = useState<string[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError,   setAiError]   = useState<string | null>(null);

    // Close notifications on outside click
    useEffect(() => {
        if (!showNotif) return;
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotif(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showNotif]);

    async function fetchInsights() {
        setAiLoading(true);
        setAiError(null);
        setInsights([]);
        try {
            const res = await fetch('/api/ai-insights', {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Request failed');
            setInsights(json.insights ?? []);
        } catch (err) {
            setAiError(err instanceof Error ? err.message : 'Failed');
        } finally {
            setAiLoading(false);
        }
    }

    const fmt = (n: number) =>
        n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
        : n >= 1_000   ? `$${(n / 1_000).toFixed(0)}K`
        : `$${n.toLocaleString()}`;

    const filteredTx = transactions.filter(t =>
        t.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.apartment.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hour = new Date().getHours();
    const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 17 ? t('dashboard.greetingDay') : t('dashboard.greetingEvening');

    return (
        <AppShell>
            {/* ── Top bar ── */}
            <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 border-b shrink-0 bg-white"
                style={{ borderColor: 'rgba(39,162,71,0.10)' }}>
                <div>
                    <h1 className="text-sm font-semibold text-slate-800">{greeting}</h1>
                    <p className="text-xs text-slate-400">
                        {user.company_name ?? t('dashboard.allProjects')} · {t('dashboard.overview')}
                    </p>
                </div>

                {/* Notifications bell */}
                <div className="relative" ref={notifRef}>
                    <button id="notif-btn" onClick={() => setShowNotif(v => !v)}
                        className="relative p-2 rounded-lg transition-colors hover:bg-slate-100"
                        style={{ color: showNotif ? '#27A247' : '#64748b' }}>
                        <Bell className="w-4 h-4" />
                        {notifications.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: '#27A247' }} />
                        )}
                    </button>

                    {showNotif && (
                        <div className="absolute right-0 top-10 w-72 rounded-xl border shadow-2xl z-50 overflow-hidden bg-white"
                            style={{ borderColor: 'rgba(39,162,71,0.15)' }}>
                            <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(39,162,71,0.10)' }}>
                                <p className="text-xs font-semibold text-slate-800">{t('dashboard.notifications')}</p>
                            </div>
                            {notifications.length === 0
                                ? <div className="px-4 py-6 text-center">
                                    <p className="text-xs text-slate-400">{t('dashboard.noNotifications')}</p>
                                   </div>
                                : <div className="divide-y divide-slate-100">
                                    {notifications.map(n => {
                                        const cfg = STATUS_NOTIF_KEYS[n.status];
                                        return (
                                            <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-medium text-slate-800 truncate">{n.full_name}</p>
                                                    <span className="text-[10px] shrink-0 text-slate-400">
                                                        {timeAgo(n.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] mt-0.5" style={{ color: cfg?.color ?? '#64748b' }}>
                                                    → {cfg ? t(cfg.labelKey) : n.status}
                                                </p>
                                            </div>
                                        );
                                    })}
                                  </div>
                            }
                        </div>
                    )}
                </div>
            </header>

            <main className="px-6 py-6 max-w-7xl mx-auto space-y-6 w-full">
                {/* ── Metrics ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard title={t('dashboard.totalApts')} value={metrics.totalApts.toLocaleString()}
                        accent="#27A247" icon={<Building2 className="w-4 h-4" />} />
                    <MetricCard title={t('dashboard.sold')} value={metrics.soldApts.toLocaleString()}
                        accent="#4ade80" icon={<TrendingUp className="w-4 h-4" />} />
                    <MetricCard title={t('dashboard.available')} value={metrics.availApts.toLocaleString()}
                        accent="#f59e0b" icon={<Home className="w-4 h-4" />} />
                    <MetricCard title={t('dashboard.revenue')} value={fmt(metrics.revenue)}
                        accent="#27A247" icon={<DollarSign className="w-4 h-4" />} />
                </div>

                {/* ── Charts ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-3 rounded-xl border p-5 bg-white"
                        style={{ borderColor: 'rgba(39,162,71,0.10)' }}>
                        <h2 className="text-sm font-semibold text-slate-800 mb-1">{t('dashboard.revenueTrend')}</h2>
                        <p className="text-xs mb-4 text-slate-400">{t('dashboard.monthlyRevenue')}</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={monthlySales} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#27A247" stopOpacity={0.30} />
                                        <stop offset="95%" stopColor="#27A247" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(39,162,71,0.12)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,162,71,0.15)', borderRadius: 8, fontSize: 12, color: '#1a2e22' }}
                                    formatter={(v) => [`$${v}K`, t('dashboard.revenue')]} />
                                <Area type="monotone" dataKey="revenue" stroke="#27A247" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="lg:col-span-2 rounded-xl border p-5 bg-white"
                        style={{ borderColor: 'rgba(39,162,71,0.10)' }}>
                        <h2 className="text-sm font-semibold text-slate-800 mb-1">{t('dashboard.unitsByProject')}</h2>
                        <p className="text-xs mb-4 text-slate-400">{t('dashboard.soldVsAvailable')}</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={projectData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barSize={8} barGap={3}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(39,162,71,0.12)" horizontal={false} />
                                <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,162,71,0.15)', borderRadius: 8, fontSize: 12, color: '#1a2e22' }} />
                                <Bar dataKey="sold" fill="#27A247" radius={[0, 4, 4, 0]} name={t('dashboard.sold')} />
                                <Bar dataKey="available" fill="#dcfce7" radius={[0, 4, 4, 0]} name={t('dashboard.available')} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Recent transactions ── */}
                <div className="rounded-xl border bg-white" style={{ borderColor: 'rgba(39,162,71,0.10)' }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(39,162,71,0.08)' }}>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-800">{t('dashboard.recentTx')}</h2>
                            <p className="text-xs mt-0.5 text-slate-400">{t('dashboard.txSubtitle')}</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-slate-50"
                            style={{ border: '1px solid rgba(39,162,71,0.12)' }}>
                            <Search className="w-3.5 h-3.5 text-slate-400" />
                            <input type="text" id="tx-search" placeholder={t('dashboard.search')} value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 w-32 border-none p-0 focus:ring-0 focus:outline-none" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(39,162,71,0.08)' }}>
                                    {[t('dashboard.id'), t('dashboard.client'), t('dashboard.apartment'), t('dashboard.amount'), t('dashboard.date'), t('dashboard.status')].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTx.map((t, i) => {
                                    const s = TX_STATUS_STYLES[t.status];
                                    return (
                                        <tr key={t.id} className="transition-colors hover:bg-slate-50"
                                            style={{ borderBottom: i < filteredTx.length - 1 ? '1px solid rgba(39,162,71,0.07)' : undefined }}>
                                            <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{t.id}</td>
                                            <td className="px-5 py-3.5 text-sm text-slate-800 font-medium">{t.client}</td>
                                            <td className="px-5 py-3.5 text-sm font-mono text-slate-500">{t.apartment}</td>
                                            <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{t.amount}</td>
                                            <td className="px-5 py-3.5 text-sm text-slate-500">{t.date}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                                                    style={{ backgroundColor: s.bg, color: s.text }}>{t(s.labelKey)}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── PM Quick Stats (admin/company_admin uchun) ── */}
                {pmStats && (
                    <div className="rounded-xl border bg-white" style={{ borderColor: 'rgba(39,162,71,0.10)' }}>
                        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(39,162,71,0.08)' }}>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-800">{t('dashboard.pmSection')}</h2>
                                <p className="text-xs mt-0.5 text-slate-400">{t('dashboard.pmSubtitle')}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
                            <PMTile href="/pm/requests" title={t('dashboard.activeRequests')} value={pmStats.open_requests}
                                hint={t('dashboard.requestsHint')} accent="#f59e0b" icon={<Wrench className="w-4 h-4" />} />
                            <PMTile href="/pm/vendors" title={t('dashboard.vendorBase')} value={pmStats.vendors}
                                hint={t('dashboard.vendorHint')} accent="#27A247" icon={<UsersIcon className="w-4 h-4" />} />
                            <PMTile href="/pm/invoices" title={t('dashboard.pmPayments')} value="—"
                                hint={t('dashboard.paymentsHint')} accent="#4ade80" icon={<Receipt className="w-4 h-4" />} />
                            <PMTile href="/pm/meters" title={t('dashboard.communal')} value="—"
                                hint={t('dashboard.communalHint')} accent="#86efac" icon={<Gauge className="w-4 h-4" />} />
                        </div>
                    </div>
                )}

                {/* ── AI Insights ── */}
                <div className="rounded-xl border bg-white" style={{ borderColor: 'rgba(39,162,71,0.10)' }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(39,162,71,0.08)' }}>
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" style={{ color: '#27A247' }} />
                                <h2 className="text-sm font-semibold text-slate-800">{t('dashboard.aiInsights')}</h2>
                            </div>
                            <p className="text-xs mt-0.5 text-slate-400">
                                {t('dashboard.aiSubtitle')}
                            </p>
                        </div>
                        <button id="ai-insights-btn" onClick={fetchInsights} disabled={aiLoading}
                            className="flex items-center gap-2 text-sm font-medium text-slate-800 px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50 cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #27A247, #1a7a34)', boxShadow: '0 4px 16px rgba(39,162,71,0.3)' }}>
                            {aiLoading
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{t('dashboard.aiAnalyzing')}</>
                                : <><Sparkles className="w-3.5 h-3.5" />{t('dashboard.aiAnalyze')}</>
                            }
                        </button>
                    </div>

                    <div className="p-5">
                        {aiError && (
                            <div className="rounded-lg px-4 py-3 text-sm border bg-red-50 border-red-200 text-red-700">
                                {aiError}
                            </div>
                        )}
                        {aiLoading && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="h-24 rounded-xl border animate-pulse bg-slate-50 border-slate-200" />
                                ))}
                            </div>
                        )}
                        {!aiLoading && insights.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {insights.map((text, i) => (
                                    <div key={i} className="rounded-xl border p-4 flex flex-col gap-3 bg-slate-50"
                                        style={{ borderColor: 'rgba(39,162,71,0.12)' }}>
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                                            style={{ background: 'rgba(39,162,71,0.12)' }}>
                                            <Lightbulb className="w-4 h-4" style={{ color: '#27A247' }} />
                                        </div>
                                        <p className="text-sm leading-relaxed text-slate-700">{text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!aiLoading && !aiError && insights.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50"
                                    style={{ border: '1px solid rgba(39,162,71,0.12)' }}>
                                    <Sparkles className="w-5 h-5" style={{ color: '#27A247' }} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-slate-800">{t('dashboard.noInsights')}</p>
                                    <p className="text-xs mt-1 text-slate-400">{t('dashboard.noInsightsHint')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </AppShell>
    );
}
