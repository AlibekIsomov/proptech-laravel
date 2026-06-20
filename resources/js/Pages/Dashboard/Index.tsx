import { useState } from 'react';
import { usePage, Link } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Lightbulb, Users } from 'lucide-react';
import AppShell from '@/Components/AppShell';
import {
    PageHead, Stat, Btn, Badge, Field, TextInput,
    Building2, TrendingUp, Home, DollarSign, Wrench, Receipt, Gauge,
    Search, Sparkles, Loader2,
} from '@/Components/pm/ui';
import type { BadgeTone } from '@/Components/pm/ui';

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

const TX_STATUS_TONE: Record<string, BadgeTone> = { completed: 'ok', reserved: 'brand' };

const STATUS_NOTIF: Record<string, { labelKey: string; tone: BadgeTone }> = {
    contacted: { labelKey: 'dashboard.contacted', tone: 'info'  },
    viewing:   { labelKey: 'dashboard.viewing',   tone: 'warn'  },
    reserved:  { labelKey: 'dashboard.reserved',  tone: 'brand' },
    bought:    { labelKey: 'dashboard.bought',    tone: 'ok'    },
};

function PMTile({ href, title, value, hint, icon: Icon }: {
    href: string; title: string; value: string | number;
    hint: string; icon: React.FC<React.SVGProps<SVGSVGElement>>;
}) {
    return (
        <Link href={href} className="pm">
            <div className="pml"><Icon className="ic" />{title}</div>
            <div className="pmv">{value}</div>
            <div className="cell-sub">{hint}</div>
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

    // AI Insights state
    const [insights,  setInsights]  = useState<string[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError,   setAiError]   = useState<string | null>(null);

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

    const filteredTx = transactions.filter(tx =>
        tx.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.apartment.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hour = new Date().getHours();
    const greeting = hour < 12 ? t('dashboard.greetingMorning') : hour < 17 ? t('dashboard.greetingDay') : t('dashboard.greetingEvening');

    return (
        <AppShell>
            <Head title={t('dashboard.overview') + ' — Sales'} />
            <div className="page">
                <PageHead
                    title={greeting}
                    sub={`${user.company_name ?? t('dashboard.allProjects')} · ${t('dashboard.overview')}`}
                />

                {/* ── Metrics ── */}
                <div className="stat-grid" style={{ marginBottom: 30 }}>
                    <Stat label={t('dashboard.totalApts')} value={metrics.totalApts.toLocaleString()} icon={Building2}   tone="brand" />
                    <Stat label={t('dashboard.sold')}      value={metrics.soldApts.toLocaleString()}  icon={TrendingUp}  tone="ok"    />
                    <Stat label={t('dashboard.available')} value={metrics.availApts.toLocaleString()} icon={Home}        tone="warn"  />
                    <Stat label={t('dashboard.revenue')}   value={fmt(metrics.revenue)}                icon={DollarSign}  tone="info"  />
                </div>

                {/* ── Charts ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16, marginBottom: 30 }}>
                    <div className="card card-pad">
                        <h2 style={{ fontSize: 15 }}>{t('dashboard.revenueTrend')}</h2>
                        <p className="cell-sub" style={{ marginBottom: 16 }}>{t('dashboard.monthlyRevenue')}</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={monthlySales} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.30} />
                                        <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fill: 'var(--text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
                                    formatter={(v) => [`$${v}K`, t('dashboard.revenue')]} />
                                <Area type="monotone" dataKey="revenue" stroke="var(--brand)" strokeWidth={2} fill="url(#revenueGrad)" dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="card card-pad">
                        <h2 style={{ fontSize: 15 }}>{t('dashboard.unitsByProject')}</h2>
                        <p className="cell-sub" style={{ marginBottom: 16 }}>{t('dashboard.soldVsAvailable')}</p>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={projectData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barSize={8} barGap={3}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                                <XAxis type="number" tick={{ fill: 'var(--text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={90} tick={{ fill: 'var(--text-faint)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }} />
                                <Bar dataKey="sold" fill="var(--brand)" radius={[0, 4, 4, 0]} name={t('dashboard.sold')} />
                                <Bar dataKey="available" fill="var(--brand-tint-2)" radius={[0, 4, 4, 0]} name={t('dashboard.available')} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ── Recent transactions + activity feed ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 30 }}>
                    <div className="table-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h2 style={{ fontSize: 15 }}>{t('dashboard.recentTx')}</h2>
                                <p className="cell-sub">{t('dashboard.txSubtitle')}</p>
                            </div>
                            <div style={{ maxWidth: 200 }}>
                                <Field><TextInput icon={Search} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('dashboard.search')} /></Field>
                            </div>
                        </div>
                        <div className="tbl-wrap">
                            <table className="tbl">
                                <thead>
                                    <tr>
                                        {[t('dashboard.id'), t('dashboard.client'), t('dashboard.apartment'), t('dashboard.amount'), t('dashboard.date'), t('dashboard.status')].map(h => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTx.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="mono cell-sub">{tx.id}</td>
                                            <td className="cell-strong">{tx.client}</td>
                                            <td className="mono">{tx.apartment}</td>
                                            <td className="cell-strong">{tx.amount}</td>
                                            <td className="cell-sub">{tx.date}</td>
                                            <td><Badge tone={TX_STATUS_TONE[tx.status] ?? 'neutral'}>{t(`dashboard.${tx.status}`)}</Badge></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ fontSize: 15 }}>{t('dashboard.notifications')}</h2>
                        </div>
                        {notifications.length === 0 ? (
                            <div className="cell-sub" style={{ padding: 20, textAlign: 'center' }}>{t('dashboard.noNotifications')}</div>
                        ) : (
                            <div style={{ overflowY: 'auto' }}>
                                {notifications.map(n => {
                                    const cfg = STATUS_NOTIF[n.status];
                                    return (
                                        <div key={n.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                <span className="cell-strong" style={{ fontSize: 13.5 }}>{n.full_name}</span>
                                                <span className="cell-sub" style={{ flex: 'none' }}>{timeAgo(n.created_at)}</span>
                                            </div>
                                            <div style={{ marginTop: 6 }}>
                                                <Badge tone={cfg?.tone ?? 'neutral'}>{cfg ? t(cfg.labelKey) : n.status}</Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── PM Quick Stats (admin/company_admin uchun) ── */}
                {pmStats && (
                    <div className="table-card" style={{ marginBottom: 30 }}>
                        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ fontSize: 15 }}>{t('dashboard.pmSection')}</h2>
                            <p className="cell-sub">{t('dashboard.pmSubtitle')}</p>
                        </div>
                        <div className="proj-mini" style={{ gridTemplateColumns: 'repeat(4,1fr)', padding: 20, margin: 0 }}>
                            <PMTile href="/pm/requests" title={t('dashboard.activeRequests')} value={pmStats.open_requests}
                                hint={t('dashboard.requestsHint')} icon={Wrench} />
                            <PMTile href="/pm/vendors" title={t('dashboard.vendorBase')} value={pmStats.vendors}
                                hint={t('dashboard.vendorHint')} icon={Users} />
                            <PMTile href="/pm/invoices" title={t('dashboard.pmPayments')} value="—"
                                hint={t('dashboard.paymentsHint')} icon={Receipt} />
                            <PMTile href="/pm/meters" title={t('dashboard.communal')} value="—"
                                hint={t('dashboard.communalHint')} icon={Gauge} />
                        </div>
                    </div>
                )}

                {/* ── AI Insights ── */}
                <div className="table-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles className="ic" style={{ color: 'var(--brand)', width: 17, height: 17 }} />
                                <h2 style={{ fontSize: 15 }}>{t('dashboard.aiInsights')}</h2>
                            </div>
                            <p className="cell-sub" style={{ marginTop: 4 }}>{t('dashboard.aiSubtitle')}</p>
                        </div>
                        <Btn variant="primary" icon={aiLoading ? Loader2 : Sparkles} onClick={fetchInsights} disabled={aiLoading}>
                            {aiLoading ? t('dashboard.aiAnalyzing') : t('dashboard.aiAnalyze')}
                        </Btn>
                    </div>

                    <div style={{ padding: 20 }}>
                        {aiError && (
                            <div className="hint warn">{aiError}</div>
                        )}
                        {aiLoading && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                                {[0, 1, 2].map(i => (
                                    <div key={i} className="card" style={{ height: 96, background: 'var(--surface-2)' }} />
                                ))}
                            </div>
                        )}
                        {!aiLoading && insights.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                                {insights.map((text, i) => (
                                    <div key={i} className="card card-pad">
                                        <div className="st-ic brand" style={{ marginBottom: 12 }}>
                                            <Lightbulb className="ic" />
                                        </div>
                                        <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-soft)' }}>{text}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!aiLoading && !aiError && insights.length === 0 && (
                            <div className="empty" style={{ padding: '40px 20px' }}>
                                <div className="e-ic"><Sparkles className="ic" /></div>
                                <h3>{t('dashboard.noInsights')}</h3>
                                <p>{t('dashboard.noInsightsHint')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
