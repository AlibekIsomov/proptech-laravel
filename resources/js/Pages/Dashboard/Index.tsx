import { useState, useRef, useEffect } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
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

// ── Static chart data ─────────────────────────────────────────────────────────
const monthlySales = [
    { month: 'Sep', revenue: 820, units: 12 },
    { month: 'Oct', revenue: 1140, units: 17 },
    { month: 'Nov', revenue: 980, units: 14 },
    { month: 'Dec', revenue: 1350, units: 21 },
    { month: 'Jan', revenue: 1620, units: 24 },
    { month: 'Feb', revenue: 1480, units: 19 },
    { month: 'Mar', revenue: 1890, units: 28 },
];

const projectData = [
    { name: 'Tashkent City', sold: 84, available: 36 },
    { name: 'Yunusobod',     sold: 61, available: 19 },
    { name: 'Mirzo Ulugbek', sold: 45, available: 55 },
    { name: 'Sergeli',       sold: 32, available: 68 },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Metrics {
    totalApts: number;
    soldApts:  number;
    availApts: number;
    revenue:   number;
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
function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    completed: { bg: '#052e16', text: '#10b981', label: 'Completed' },
    reserved:  { bg: '#1e1b4b', text: '#6366f1', label: 'Reserved' },
};

const STATUS_NOTIF: Record<string, { label: string; color: string }> = {
    contacted: { label: 'Kontakt',  color: '#6366f1' },
    viewing:   { label: 'Ko\'rik',  color: '#f59e0b' },
    reserved:  { label: 'Bron',     color: '#10b981' },
    bought:    { label: 'Sotilgan', color: '#22c55e' },
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
            style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.38)' }}>{title}</p>
                <div className="flex items-center justify-center w-9 h-9 rounded-xl"
                    style={{ background: `linear-gradient(135deg,${accent}22,${accent}10)`, border: `1px solid ${accent}25` }}>
                    <span style={{ color: accent }}>{icon}</span>
                </div>
            </div>
            <div>
                {loading
                    ? <div className="h-8 w-28 rounded-lg animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    : <p className="text-3xl text-white font-bold">{value}</p>
                }
                {change && !loading && (
                    <div className="flex items-center gap-1 mt-1.5">
                        {positive
                            ? <ChevronUp className="w-3.5 h-3.5" style={{ color: '#10b981' }} />
                            : <ChevronDown className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                        }
                        <span className="text-xs font-semibold" style={{ color: positive ? '#10b981' : '#ef4444' }}>{change}</span>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>vs last month</span>
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
        <Link href={href} className="rounded-xl p-4 flex flex-col gap-3 transition-colors hover:bg-white/[0.02]"
            style={{ backgroundColor: '#080b14', border: '1px solid #1e2536' }}>
            <div className="flex items-start justify-between">
                <p className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.38)' }}>{title}</p>
                <div className="flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ background: `linear-gradient(135deg,${accent}22,${accent}10)`, border: `1px solid ${accent}25` }}>
                    <span style={{ color: accent }}>{icon}</span>
                </div>
            </div>
            <div>
                <p className="text-2xl text-white font-bold">{value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{hint}</p>
            </div>
        </Link>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DashboardIndex({ metrics, transactions, notifications, pmStats }: Props) {
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
    const greeting = hour < 12 ? 'Xayrli tong 👋' : hour < 17 ? 'Xayrli kun 👋' : 'Xayrli kech 👋';

    return (
        <AppShell>
            {/* ── Top bar ── */}
            <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 border-b shrink-0"
                style={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div>
                    <h1 className="text-sm font-semibold text-white">{greeting}</h1>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {user.company_name ?? 'All Projects'} · Overview
                    </p>
                </div>

                {/* Notifications bell */}
                <div className="relative" ref={notifRef}>
                    <button id="notif-btn" onClick={() => setShowNotif(v => !v)}
                        className="relative p-2 rounded-lg transition-colors hover:bg-white/5"
                        style={{ color: showNotif ? '#a5b4fc' : '#64748b' }}>
                        <Bell className="w-4 h-4" />
                        {notifications.length > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: '#6366f1' }} />
                        )}
                    </button>

                    {showNotif && (
                        <div className="absolute right-0 top-10 w-72 rounded-xl border shadow-2xl z-50 overflow-hidden"
                            style={{ backgroundColor: '#0d1117', borderColor: '#1e2536' }}>
                            <div className="px-4 py-3 border-b" style={{ borderColor: '#1e2536' }}>
                                <p className="text-xs font-semibold text-white">Bildirishnomalar</p>
                            </div>
                            {notifications.length === 0
                                ? <div className="px-4 py-6 text-center">
                                    <p className="text-xs" style={{ color: '#475569' }}>Bildirishnoma yo'q</p>
                                  </div>
                                : <div className="divide-y" style={{ borderColor: '#1e2536' }}>
                                    {notifications.map(n => {
                                        const cfg = STATUS_NOTIF[n.status];
                                        return (
                                            <div key={n.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-medium text-white truncate">{n.full_name}</p>
                                                    <span className="text-[10px] shrink-0" style={{ color: '#334155' }}>
                                                        {timeAgo(n.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] mt-0.5" style={{ color: cfg?.color ?? '#64748b' }}>
                                                    → {cfg?.label ?? n.status}
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
                    <MetricCard title="Jami kvartiralar" value={metrics.totalApts.toLocaleString()}
                        accent="#6366f1" icon={<Building2 className="w-4 h-4" />} />
                    <MetricCard title="Sotilgan" value={metrics.soldApts.toLocaleString()}
                        accent="#10b981" icon={<TrendingUp className="w-4 h-4" />} />
                    <MetricCard title="Bo'sh" value={metrics.availApts.toLocaleString()}
                        accent="#f59e0b" icon={<Home className="w-4 h-4" />} />
                    <MetricCard title="Daromad" value={fmt(metrics.revenue)}
                        accent="#6366f1" icon={<DollarSign className="w-4 h-4" />} />
                </div>

                {/* ── Charts ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-3 rounded-xl border p-5"
                        style={{ backgroundColor: '#0d1117', borderColor: '#1e2536' }}>
                        <h2 className="text-sm font-semibold text-white mb-1">Revenue Trend</h2>
                        <p className="text-xs mb-4" style={{ color: '#64748b' }}>Monthly revenue in USD thousands</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={monthlySales} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #1e2536', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }}
                                    formatter={(v) => [`$${v}K`, 'Revenue']} />
                                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="lg:col-span-2 rounded-xl border p-5"
                        style={{ backgroundColor: '#0d1117', borderColor: '#1e2536' }}>
                        <h2 className="text-sm font-semibold text-white mb-1">Units by Project</h2>
                        <p className="text-xs mb-4" style={{ color: '#64748b' }}>Sold vs available</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={projectData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barSize={8} barGap={3}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" horizontal={false} />
                                <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #1e2536', borderRadius: 8, fontSize: 12, color: '#e2e8f0' }} />
                                <Bar dataKey="sold" fill="#10b981" radius={[0, 4, 4, 0]} name="Sold" />
                                <Bar dataKey="available" fill="#1e2536" radius={[0, 4, 4, 0]} name="Available" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Recent transactions ── */}
                <div className="rounded-xl border" style={{ backgroundColor: '#0d1117', borderColor: '#1e2536' }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2536' }}>
                        <div>
                            <h2 className="text-sm font-semibold text-white">So'nggi tranzaksiyalar</h2>
                            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Kvartira sotuv va bronlar</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                            style={{ backgroundColor: '#080b14', border: '1px solid #1e2536' }}>
                            <Search className="w-3.5 h-3.5" style={{ color: '#475569' }} />
                            <input type="text" id="tx-search" placeholder="Qidirish…" value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="bg-transparent text-xs text-white outline-none placeholder:text-slate-600 w-32" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid #1e2536' }}>
                                    {['ID', 'Mijoz', 'Kvartira', 'Summa', 'Sana', 'Holat'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: '#475569' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTx.map((t, i) => {
                                    const s = STATUS_STYLES[t.status];
                                    return (
                                        <tr key={t.id} className="transition-colors hover:bg-white/[0.02]"
                                            style={{ borderBottom: i < filteredTx.length - 1 ? '1px solid #1e2536' : undefined }}>
                                            <td className="px-5 py-3.5 text-xs font-mono" style={{ color: '#475569' }}>{t.id}</td>
                                            <td className="px-5 py-3.5 text-sm text-white font-medium">{t.client}</td>
                                            <td className="px-5 py-3.5 text-sm font-mono" style={{ color: '#94a3b8' }}>{t.apartment}</td>
                                            <td className="px-5 py-3.5 text-sm font-semibold text-white">{t.amount}</td>
                                            <td className="px-5 py-3.5 text-sm" style={{ color: '#64748b' }}>{t.date}</td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                                                    style={{ backgroundColor: s.bg, color: s.text }}>{s.label}</span>
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
                    <div className="rounded-xl border" style={{ backgroundColor: '#0d1117', borderColor: '#1e2536' }}>
                        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2536' }}>
                            <div>
                                <h2 className="text-sm font-semibold text-white">Property Management</h2>
                                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>Bino ekspluatatsiyasi va xizmat ko'rsatish</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
                            <PMTile href="/pm/requests" title="Faol arizalar" value={pmStats.open_requests}
                                hint="Nosozlik arizalari" accent="#f59e0b" icon={<Wrench className="w-4 h-4" />} />
                            <PMTile href="/pm/vendors" title="Vendor baza" value={pmStats.vendors}
                                hint="Pudratchi va reyting" accent="#6366f1" icon={<UsersIcon className="w-4 h-4" />} />
                            <PMTile href="/pm/invoices" title="PM To'lovlar" value="—"
                                hint="Hisob-fakturalar" accent="#10b981" icon={<Receipt className="w-4 h-4" />} />
                            <PMTile href="/pm/meters" title="Kommunal" value="—"
                                hint="Elektr · Gaz · Suv" accent="#8b5cf6" icon={<Gauge className="w-4 h-4" />} />
                        </div>
                    </div>
                )}

                {/* ── AI Insights ── */}
                <div className="rounded-xl border" style={{ backgroundColor: '#0d1117', borderColor: '#1e2536' }}>
                    <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#1e2536' }}>
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" style={{ color: '#6366f1' }} />
                                <h2 className="text-sm font-semibold text-white">AI Insights</h2>
                            </div>
                            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                                Claude savdo ma'lumotlarini tahlil qiladi
                            </p>
                        </div>
                        <button id="ai-insights-btn" onClick={fetchInsights} disabled={aiLoading}
                            className="flex items-center gap-2 text-sm font-medium text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={{ backgroundColor: '#6366f1' }}>
                            {aiLoading
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Tahlil qilinmoqda…</>
                                : <><Sparkles className="w-3.5 h-3.5" />AI tahlil</>
                            }
                        </button>
                    </div>

                    <div className="p-5">
                        {aiError && (
                            <div className="rounded-lg px-4 py-3 text-sm border"
                                style={{ backgroundColor: '#1f0a0a', borderColor: '#7f1d1d', color: '#fca5a5' }}>
                                {aiError}
                            </div>
                        )}
                        {aiLoading && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="h-24 rounded-xl border animate-pulse"
                                        style={{ backgroundColor: '#080b14', borderColor: '#1e2536' }} />
                                ))}
                            </div>
                        )}
                        {!aiLoading && insights.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {insights.map((text, i) => (
                                    <div key={i} className="rounded-xl border p-4 flex flex-col gap-3"
                                        style={{ backgroundColor: '#080b14', borderColor: '#1e2536' }}>
                                        <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                                            style={{ backgroundColor: '#1e1b4b' }}>
                                            <Lightbulb className="w-4 h-4" style={{ color: '#6366f1' }} />
                                        </div>
                                        <p className="text-sm leading-relaxed" style={{ color: '#cbd5e1' }}>{text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!aiLoading && !aiError && insights.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 gap-3">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl"
                                    style={{ backgroundColor: '#1e1b4b' }}>
                                    <Sparkles className="w-5 h-5" style={{ color: '#6366f1' }} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-white">Hali tahlil yo'q</p>
                                    <p className="text-xs mt-1" style={{ color: '#475569' }}>
                                        "AI tahlil" tugmasini bosing
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </AppShell>
    );
}
