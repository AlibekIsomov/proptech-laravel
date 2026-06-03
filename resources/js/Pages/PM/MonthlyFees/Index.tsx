import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    DollarSign, CheckCircle, XCircle, AlertCircle, Zap,
    Filter, RefreshCw, ChevronDown, TrendingUp,
} from 'lucide-react';
import AppShell from '@/Components/AppShell';

interface Building {
    id: string;
    name: string;
    pm_project_id: string;
}

interface Fee {
    id: string;
    invoice_number: string;
    apartment_id: string;
    apartment: string | null;
    building: string | null;
    building_id: string | null;
    resident: string | null;
    month: string | null;
    amount: number;
    status: 'draft' | 'paid' | 'overdue' | 'sent' | 'cancelled';
    due_date: string | null;
    paid_at: string | null;
}

interface Summary {
    total_count: number;
    paid_count: number;
    unpaid_count: number;
    total_amount: number;
    paid_amount: number;
    unpaid_amount: number;
}

interface Props {
    buildings:    Building[];
    selectedBldg: string | null;
    month:        string;
    fees:         Fee[];
    summary:      Summary;
}

const STATUS_CFG = {
    draft:     { label: "To'lanmagan",  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)'  },
    paid:      { label: "To'langan",    color: '#10b981', bg: 'rgba(16,185,129,0.10)'  },
    overdue:   { label: 'Kechikkan',    color: '#ef4444', bg: 'rgba(239,68,68,0.10)'   },
    sent:      { label: 'Yuborilgan',   color: '#6366f1', bg: 'rgba(99,102,241,0.10)'  },
    cancelled: { label: 'Bekor qilingan', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)' },
} as const;

function fmt(n: number) {
    return n.toLocaleString('uz-UZ') + ' UZS';
}

export default function MonthlyFeesIndex({
    buildings, selectedBldg, month, fees, summary,
}: Props) {
    const { auth } = usePage<any>().props;
    const canEdit = ['super_admin', 'company_admin'].includes(auth.user?.role) ||
                    auth.user?.pm_role === 'property_manager';

    const [filterBldg,   setFilterBldg]   = useState(selectedBldg ?? '');
    const [filterMonth,  setFilterMonth]  = useState(month);
    const [filterStatus, setFilterStatus] = useState('');
    const [generating,   setGenerating]   = useState(false);
    const [updatingId,   setUpdatingId]   = useState<string | null>(null);

    function applyFilters(bldg: string, m: string) {
        const params: Record<string, string> = { month: m };
        if (bldg) params.building_id = bldg;
        router.get('/pm/monthly-fees', params, { preserveState: true });
    }

    function handleGenerate() {
        setGenerating(true);
        const body: Record<string, string> = { month: filterMonth };
        if (filterBldg) body.building_id = filterBldg;
        router.post('/pm/monthly-fees/generate', body, {
            onFinish: () => setGenerating(false),
        });
    }

    function handleStatusChange(fee: Fee, newStatus: 'paid' | 'draft' | 'overdue') {
        setUpdatingId(fee.id);
        router.patch(`/pm/monthly-fees/${fee.id}`, { status: newStatus }, {
            onFinish: () => setUpdatingId(null),
            preserveScroll: true,
        });
    }

    const displayedFees = filterStatus
        ? fees.filter(f => f.status === filterStatus)
        : fees;

    const [year, mon] = filterMonth.split('-');
    const monthLabel = new Date(Number(year), Number(mon) - 1, 1)
        .toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' });

    return (
        <AppShell>
            <div className="space-y-6">
                {/* Header */}
                <header className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#10b981' }}>
                            Oylik to'lovlar
                        </p>
                        <h1 className="text-2xl font-bold text-slate-800 mt-1" style={{ fontFamily: 'var(--font-display)' }}>
                            To'lov hisobotlari
                        </h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Kvartiralar bo'yicha oylik kommunal to'lovlar
                        </p>
                    </div>
                    {canEdit && (
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                            style={{ backgroundColor: '#10b981', color: '#fff' }}
                        >
                            {generating
                                ? <RefreshCw className="w-4 h-4 animate-spin" />
                                : <Zap className="w-4 h-4" />}
                            {generating ? 'Yaratilmoqda…' : `${monthLabel} uchun yaratish`}
                        </button>
                    )}
                </header>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-white" style={{ border: '1px solid rgba(16,185,129,0.12)' }}>
                    <div className="flex flex-col gap-1.5 min-w-[160px]">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Oy</span>
                        <input
                            type="month"
                            value={filterMonth}
                            onChange={e => {
                                setFilterMonth(e.target.value);
                                applyFilters(filterBldg, e.target.value);
                            }}
                            className="rounded-xl px-3 py-2 text-sm text-slate-800 outline-none bg-white"
                            style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[180px]">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Bino</span>
                        <div className="relative">
                            <select
                                value={filterBldg}
                                onChange={e => {
                                    setFilterBldg(e.target.value);
                                    applyFilters(e.target.value, filterMonth);
                                }}
                                className="w-full appearance-none rounded-xl px-3 py-2 pr-8 text-sm text-slate-800 outline-none bg-white"
                                style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                            >
                                <option value="">Barcha binolar</option>
                                {buildings.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-slate-400" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-[150px]">
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400">Holat</span>
                        <div className="relative">
                            <select
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                                className="w-full appearance-none rounded-xl px-3 py-2 pr-8 text-sm text-slate-800 outline-none bg-white"
                                style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                            >
                                <option value="">Barchasi</option>
                                <option value="draft">To'lanmagan</option>
                                <option value="paid">To'langan</option>
                                <option value="overdue">Kechikkan</option>
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Jami to'lovlar", value: fmt(summary.total_amount),  count: summary.total_count,  icon: DollarSign,   color: '#6366f1' },
                        { label: "To'langan",       value: fmt(summary.paid_amount),   count: summary.paid_count,   icon: CheckCircle,  color: '#10b981' },
                        { label: "To'lanmagan",     value: fmt(summary.unpaid_amount), count: summary.unpaid_count, icon: XCircle,      color: '#f59e0b' },
                        { label: "Umumiy kvartira", value: `${summary.total_count} ta`, count: null,               icon: TrendingUp,   color: '#14b8a6' },
                    ].map(({ label, value, count, icon: Icon, color }) => (
                        <div key={label} className="rounded-2xl p-4" style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(16,185,129,0.10)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1F` }}>
                                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                                </div>
                                <span className="text-xs text-slate-400">{label}</span>
                            </div>
                            <p className="text-lg font-bold text-slate-800">{value}</p>
                            {count !== null && (
                                <p className="text-xs text-slate-400 mt-0.5">{count} ta kvartira</p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Fees table */}
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(16,185,129,0.10)' }}>
                    {/* Table header */}
                    <div className="grid grid-cols-[1fr_1fr_1fr_100px_110px_120px] gap-3 px-4 py-3 text-[10px] uppercase tracking-widest font-semibold text-slate-400"
                        style={{ backgroundColor: 'var(--card)', borderBottom: '1px solid rgba(16,185,129,0.08)' }}>
                        <span>Kvartira</span>
                        <span>Bino</span>
                        <span>Aholi</span>
                        <span className="text-right">Summa</span>
                        <span className="text-center">Holat</span>
                        <span className="text-center">Amal</span>
                    </div>

                    {displayedFees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-2" style={{ backgroundColor: 'var(--card)' }}>
                            <Filter className="w-7 h-7 text-slate-300" />
                            <p className="text-sm text-slate-400">
                                {fees.length === 0
                                    ? `${monthLabel} uchun to'lovlar hali yaratilmagan`
                                    : 'Filtr bo\'yicha natija topilmadi'}
                            </p>
                            {fees.length === 0 && canEdit && (
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                                    style={{ backgroundColor: 'rgba(16,185,129,0.10)', color: '#10b981' }}
                                >
                                    <Zap className="w-3.5 h-3.5" />
                                    Hozir yaratish
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{ backgroundColor: 'var(--card)' }}>
                            {displayedFees.map((fee, idx) => {
                                const cfg = STATUS_CFG[fee.status] ?? STATUS_CFG.draft;
                                const isUpdating = updatingId === fee.id;
                                return (
                                    <div
                                        key={fee.id}
                                        className="grid grid-cols-[1fr_1fr_1fr_100px_110px_120px] gap-3 items-center px-4 py-3 transition-colors hover:bg-slate-50"
                                        style={{ borderTop: idx > 0 ? '1px solid rgba(16,185,129,0.06)' : undefined }}
                                    >
                                        {/* Apartment */}
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">№{fee.apartment ?? '—'}</p>
                                            <p className="text-[10px] text-slate-400">{fee.invoice_number}</p>
                                        </div>

                                        {/* Building */}
                                        <p className="text-xs text-slate-600 truncate">{fee.building ?? '—'}</p>

                                        {/* Resident */}
                                        <p className="text-xs text-slate-600 truncate">
                                            {fee.resident ?? <span className="text-slate-300 italic">Aholi yo'q</span>}
                                        </p>

                                        {/* Amount */}
                                        <p className="text-xs font-semibold text-slate-800 text-right">
                                            {fee.amount.toLocaleString()}
                                            <span className="text-[10px] font-normal text-slate-400 ml-0.5">UZS</span>
                                        </p>

                                        {/* Status badge */}
                                        <div className="flex justify-center">
                                            <span
                                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                                style={{ backgroundColor: cfg.bg, color: cfg.color }}
                                            >
                                                {cfg.label}
                                            </span>
                                        </div>

                                        {/* Action */}
                                        {canEdit && (
                                            <div className="flex justify-center">
                                                {fee.status !== 'paid' ? (
                                                    <button
                                                        disabled={isUpdating}
                                                        onClick={() => handleStatusChange(fee, 'paid')}
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50"
                                                        style={{ backgroundColor: 'rgba(16,185,129,0.10)', color: '#10b981' }}
                                                    >
                                                        {isUpdating
                                                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                                                            : <CheckCircle className="w-3 h-3" />}
                                                        To'landi
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled={isUpdating}
                                                        onClick={() => handleStatusChange(fee, 'draft')}
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-50"
                                                        style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
                                                    >
                                                        {isUpdating
                                                            ? <RefreshCw className="w-3 h-3 animate-spin" />
                                                            : <XCircle className="w-3 h-3" />}
                                                        Bekor
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer summary */}
                    {displayedFees.length > 0 && (
                        <div
                            className="flex items-center justify-between px-4 py-3 text-xs"
                            style={{ borderTop: '1px solid rgba(16,185,129,0.08)', backgroundColor: 'rgba(16,185,129,0.02)' }}
                        >
                            <span className="text-slate-400">{displayedFees.length} ta yozuv</span>
                            <span className="font-semibold text-slate-700">
                                Jami: {fmt(displayedFees.reduce((s, f) => s + f.amount, 0))}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
