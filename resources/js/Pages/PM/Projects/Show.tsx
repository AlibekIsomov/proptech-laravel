import { useState, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    ArrowLeft, Plus, Building2, MapPin, ChevronRight,
    ChevronDown, ChevronUp, Zap, X, Loader2, Home,
    Edit, Trash2, Calculator,
} from 'lucide-react';
import AppShell from '@/Components/AppShell';
import FloorPlan from '@/Components/FloorPlan';

interface Project {
    id: string;
    name: string;
    location: string | null;
    status: string;
    created_at: string;
}

interface Building {
    id: string;
    project_id: string;
    name: string;
    created_at: string;
}

interface AptStats {
    total: number;
    available: number;
    sold: number;
    reserved: number;
}

interface Props {
    project: Project;
    buildings: Building[];
    aptStats: Record<string, AptStats>;
}

// ── Apartment form ──────────────────────────────────────────────────────────

interface AptForm {
    building_id: string;
    floor: string;
    number: string;
    rooms: string;
    area: string;
    price: string;
    status: 'available' | 'reserved' | 'sold';
    type: string;
}

const emptyApt = (buildingId = ''): AptForm => ({
    building_id: buildingId,
    floor: '', number: '', rooms: '2', area: '', price: '',
    status: 'available', type: '',
});

const STATUS_CFG = {
    available: { bg: 'rgba(16,185,129,0.10)',  text: '#34d399', label: 'Mavjud'       },
    reserved:  { bg: 'rgba(245,158,11,0.10)',  text: '#fbbf24', label: 'Bron qilingan' },
    sold:      { bg: 'rgba(20,184,166,0.10)',  text: '#2dd4bf', label: 'Sotilgan'      },
};

export default function PMProjectShow({ project, buildings, aptStats }: Props) {
    const { auth } = usePage<any>().props;
    const canEdit = ['super_admin', 'company_admin'].includes(auth.user?.role) ||
                    auth.user?.pm_role === 'property_manager';

    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [fpRefreshKey,     setFpRefreshKey]     = useState(0);

    // ── Add building ────────────────────────────────────────────────────────
    const [showAddBuilding, setShowAddBuilding] = useState(false);
    const [buildingName,    setBuildingName]    = useState('');
    const [addingBuilding,  setAddingBuilding]  = useState(false);

    // ── Bulk generate ───────────────────────────────────────────────────────
    const [showBulkGen,       setShowBulkGen]       = useState(false);
    const [bulkBuildingId,    setBulkBuildingId]    = useState('');
    const [bulkFloors,        setBulkFloors]        = useState('9');
    const [bulkAptsPerFloor,  setBulkAptsPerFloor]  = useState('4');
    const [bulkRooms,         setBulkRooms]         = useState('2');
    const [bulkArea,          setBulkArea]          = useState('60');
    const [bulkBasePrice,     setBulkBasePrice]     = useState('75000');
    const [bulkPricePerFloor, setBulkPricePerFloor] = useState('0');
    const [generating,        setGenerating]        = useState(false);
    const [genError,          setGenError]          = useState<string | null>(null);

    // ── Single apartment modal ──────────────────────────────────────────────
    const [showAptModal, setShowAptModal] = useState(false);
    const [aptForm,      setAptForm]      = useState<AptForm>(emptyApt());
    const [aptSubmitting, setAptSubmitting] = useState(false);

    const pricePerM2 = useMemo(() => {
        const p = parseFloat(aptForm.price);
        const a = parseFloat(aptForm.area);
        if (!isNaN(p) && !isNaN(a) && a > 0) return Math.round(p / a);
        return null;
    }, [aptForm.price, aptForm.area]);

    // ── Handlers ────────────────────────────────────────────────────────────

    function handleAddBuilding(e: React.FormEvent) {
        e.preventDefault();
        if (!buildingName.trim()) return;
        setAddingBuilding(true);
        router.post(`/pm/projects/${project.id}/buildings`, { name: buildingName.trim() }, {
            onFinish: () => { setAddingBuilding(false); setBuildingName(''); setShowAddBuilding(false); },
        });
    }

    function openBulkGen(b: Building) {
        setBulkBuildingId(b.id);
        setBulkFloors('9'); setBulkAptsPerFloor('4');
        setBulkRooms('2');  setBulkArea('60');
        setBulkBasePrice('75000'); setBulkPricePerFloor('0');
        setGenError(null);
        setShowBulkGen(true);
    }

    function handleBulkGenerate(e: React.FormEvent) {
        e.preventDefault();
        setGenError(null);
        const floorsNum = parseInt(bulkFloors);
        const aptsNum   = parseInt(bulkAptsPerFloor);
        if (isNaN(floorsNum) || floorsNum < 1) { setGenError('Qavatlar sonini kiriting.'); return; }
        if (isNaN(aptsNum)   || aptsNum   < 1) { setGenError('Har qavatdagi kvartiralar sonini kiriting.'); return; }

        setGenerating(true);
        router.post('/pm/apartments/bulk-generate', {
            building_id:          bulkBuildingId,
            floors:               floorsNum,
            apartments_per_floor: aptsNum,
            rooms:                parseInt(bulkRooms) || 1,
            area:                 parseFloat(bulkArea) || 0,
            base_price:           parseFloat(bulkBasePrice) || 0,
            price_per_floor:      parseFloat(bulkPricePerFloor) || 0,
        }, {
            onSuccess: () => { setGenerating(false); setShowBulkGen(false); setFpRefreshKey(k => k + 1); },
            onError:   () => { setGenerating(false); setGenError('Xatolik yuz berdi.'); },
        });
    }

    function openAddApt(b: Building) {
        setAptForm(emptyApt(b.id));
        setShowAptModal(true);
    }

    function handleAptSubmit(e: React.FormEvent) {
        e.preventDefault();
        setAptSubmitting(true);
        router.post('/pm/apartments', {
            building_id: aptForm.building_id,
            floor:       Number(aptForm.floor),
            number:      aptForm.number.trim(),
            rooms:       Number(aptForm.rooms),
            area:        aptForm.area  ? Number(aptForm.area)  : null,
            price:       aptForm.price ? Number(aptForm.price) : null,
            status:      aptForm.status,
            type:        aptForm.type || null,
        }, {
            onSuccess: () => { setAptSubmitting(false); setShowAptModal(false); setFpRefreshKey(k => k + 1); },
            onError:   () => setAptSubmitting(false),
        });
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <AppShell>
            {/* Top bar */}
            <header className="sticky top-0 z-20 flex items-center gap-3 px-6 h-14 border-b shrink-0"
                style={{ backgroundColor: 'var(--card)', borderColor: 'rgba(16,185,129,0.10)' }}>
                <button onClick={() => router.visit('/pm/projects')}
                    className="p-1.5 rounded-lg transition-colors hover:bg-slate-100" style={{ color: '#64748b' }}>
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs" style={{ color: '#475569' }}>Loyihalar</span>
                    <ChevronRight className="w-3 h-3 shrink-0" style={{ color: '#334155' }} />
                    <span className="text-sm font-semibold text-slate-800 truncate">{project.name}</span>
                </div>
            </header>

            <main className="px-6 py-6 space-y-6">
                {/* Project info */}
                <div className="rounded-2xl border p-5 flex items-center gap-4"
                    style={{ backgroundColor: 'var(--card)', borderColor: 'rgba(16,185,129,0.10)' }}>
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                        style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}>
                        <Building2 className="w-6 h-6" style={{ color: '#10b981' }} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-bold text-slate-800">{project.name}</h1>
                        {project.location && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3 h-3 shrink-0" style={{ color: '#475569' }} />
                                <span className="text-xs" style={{ color: '#64748b' }}>{project.location}</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-6 text-center shrink-0">
                        <div>
                            <p className="text-xl font-bold text-slate-800">{buildings.length}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Binolar</p>
                        </div>
                        <div>
                            <p className="text-xl font-bold text-slate-800">
                                {Object.values(aptStats).reduce((s, v) => s + v.total, 0)}
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Kvartiralar</p>
                        </div>
                    </div>
                </div>

                {/* Buildings section */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-slate-800">Binolar</h2>
                        {canEdit && (
                            <button onClick={() => { setBuildingName(''); setShowAddBuilding(true); }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-xl transition-all hover:opacity-90"
                                style={{ backgroundColor: '#10b981' }}>
                                <Plus className="w-3.5 h-3.5" /> Bino qo'shish
                            </button>
                        )}
                    </div>

                    {buildings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3 rounded-2xl border border-dashed"
                            style={{ borderColor: 'rgba(16,185,129,0.15)', backgroundColor: 'rgba(16,185,129,0.02)' }}>
                            <Building2 className="w-8 h-8" style={{ color: 'var(--border)' }} />
                            <p className="text-xs" style={{ color: '#475569' }}>Hech qanday bino yo'q. Birinchi binoni qo'shing.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {buildings.map(b => {
                                const active = selectedBuilding?.id === b.id;
                                const stats  = aptStats[b.id] ?? { total: 0, available: 0, sold: 0, reserved: 0 };
                                const soldPct = stats.total > 0 ? Math.round((stats.sold / stats.total) * 100) : 0;

                                return (
                                    <div key={b.id} className="rounded-2xl border overflow-hidden transition-all duration-200"
                                        style={{
                                            borderColor:     active ? '#10b981' : 'rgba(16,185,129,0.08)',
                                            backgroundColor: active ? 'rgba(16,185,129,0.04)' : 'var(--card)',
                                        }}>
                                        {/* Building header — click to toggle */}
                                        <button onClick={() => setSelectedBuilding(active ? null : b)}
                                            className="w-full p-4 text-left flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                                                    style={{ backgroundColor: active ? '#10b981' : 'rgba(16,185,129,0.12)' }}>
                                                    <Building2 className="w-4 h-4 text-slate-800" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate">{b.name}</p>
                                                    <p className="text-[10px] mt-0.5 font-semibold" style={{ color: '#475569' }}>
                                                        {stats.total} kvartira
                                                    </p>
                                                </div>
                                            </div>
                                            {active
                                                ? <ChevronUp   className="w-4 h-4 shrink-0" style={{ color: '#10b981' }} />
                                                : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--border)' }} />}
                                        </button>

                                        {/* Stats mini-bar */}
                                        {stats.total > 0 && (
                                            <div className="px-4 pb-3 -mt-1">
                                                <div className="w-full h-1.5 rounded-full overflow-hidden mb-2"
                                                    style={{ backgroundColor: 'var(--border)' }}>
                                                    <div className="h-full flex">
                                                        <div style={{ width: `${(stats.sold      / stats.total) * 100}%`, backgroundColor: '#2dd4bf' }} />
                                                        <div style={{ width: `${(stats.reserved  / stats.total) * 100}%`, backgroundColor: '#f59e0b' }} />
                                                    </div>
                                                </div>
                                                <div className="flex justify-between text-[10px]" style={{ color: '#475569' }}>
                                                    <span style={{ color: '#34d399' }}>{stats.available} mavjud</span>
                                                    <span style={{ color: '#fbbf24' }}>{stats.reserved} bron</span>
                                                    <span style={{ color: '#2dd4bf' }}>{stats.sold} sotilgan</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action buttons when expanded */}
                                        {active && canEdit && (
                                            <div className="px-3 pb-3 border-t space-y-2"
                                                style={{ borderColor: 'rgba(16,185,129,0.08)' }}>
                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    <button onClick={() => openBulkGen(b)}
                                                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors border hover:border-emerald-500/40"
                                                        style={{ borderColor: 'rgba(16,185,129,0.15)', color: '#34d399', backgroundColor: 'rgba(16,185,129,0.05)' }}>
                                                        <Zap className="w-3.5 h-3.5" />
                                                        Bulk yaratish
                                                    </button>
                                                    <button onClick={() => openAddApt(b)}
                                                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors border hover:border-emerald-500/40"
                                                        style={{ borderColor: 'rgba(16,185,129,0.15)', color: '#2dd4bf', backgroundColor: 'rgba(20,184,166,0.05)' }}>
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Kvartira
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Floor plan */}
                {selectedBuilding && (
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: '#10b981' }} />
                            <h2 className="text-sm font-semibold text-slate-800">
                                Shaxmatka — {selectedBuilding.name}
                            </h2>
                        </div>
                        <FloorPlan
                            building_id={selectedBuilding.id}
                            refreshKey={fpRefreshKey}
                            apiBase="/pm"
                        />
                    </div>
                )}
            </main>

            {/* ── Add building modal ── */}
            {showAddBuilding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setShowAddBuilding(false)}>
                    <div className="w-full max-w-sm rounded-2xl p-6"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-slate-800">Bino qo'shish</h2>
                            <button onClick={() => setShowAddBuilding(false)} style={{ color: '#475569' }}
                                className="hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddBuilding} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>Bino nomi</label>
                                <input type="text" required placeholder="masalan: A korpus" value={buildingName}
                                    onChange={e => setBuildingName(e.target.value)}
                                    className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none"
                                    style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.15)' }} />
                            </div>
                            <button type="submit" disabled={addingBuilding}
                                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#10b981' }}>
                                {addingBuilding && <Loader2 className="w-4 h-4 animate-spin" />}
                                Qo'shish
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Bulk generate modal ── */}
            {showBulkGen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setShowBulkGen(false)}>
                    <div className="w-full max-w-sm rounded-2xl p-6"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" style={{ color: '#10b981' }} />
                                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Bulk yaratish</h2>
                            </div>
                            <button onClick={() => setShowBulkGen(false)} style={{ color: '#475569' }}
                                className="hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleBulkGenerate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Qavatlar soni',     val: bulkFloors,       set: setBulkFloors       },
                                    { label: 'Har qavatda',        val: bulkAptsPerFloor, set: setBulkAptsPerFloor },
                                ].map(({ label, val, set }) => (
                                    <div key={label}>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
                                        <input type="number" min={1} required value={val} onChange={e => set(e.target.value)}
                                            className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                                            style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Xonalar soni',    val: bulkRooms, set: setBulkRooms },
                                    { label: 'Maydon, m²',       val: bulkArea,  set: setBulkArea  },
                                ].map(({ label, val, set }) => (
                                    <div key={label}>
                                        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
                                        <input type="number" min={1} required value={val} onChange={e => set(e.target.value)}
                                            className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                                            style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Boshlang'ich narx, $</label>
                                    <input type="number" min={0} required value={bulkBasePrice} onChange={e => setBulkBasePrice(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                                        style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Qavat uchun qo'shimcha $</label>
                                    <input type="number" min={0} value={bulkPricePerFloor} onChange={e => setBulkPricePerFloor(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                                        style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                                </div>
                            </div>
                            {genError && <p className="text-xs font-semibold" style={{ color: '#f87171' }}>{genError}</p>}
                            <button type="submit" disabled={generating}
                                className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#10b981' }}>
                                {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Yaratish
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Add single apartment modal ── */}
            {showAptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setShowAptModal(false)}>
                    <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Home className="w-4 h-4" style={{ color: '#10b981' }} />
                                <h2 className="text-sm font-bold text-slate-800">Yangi kvartira</h2>
                            </div>
                            <button onClick={() => setShowAptModal(false)} style={{ color: '#475569' }}
                                className="hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAptSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>Qavat *</label>
                                    <input type="number" min={1} required value={aptForm.floor}
                                        onChange={e => setAptForm(f => ({ ...f, floor: e.target.value }))}
                                        placeholder="masalan: 5"
                                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                                        style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>Kvartira raqami *</label>
                                    <input type="text" required value={aptForm.number}
                                        onChange={e => setAptForm(f => ({ ...f, number: e.target.value }))}
                                        placeholder="masalan: 501"
                                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                                        style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>Xonalar *</label>
                                    <input type="number" min={0} required value={aptForm.rooms}
                                        onChange={e => setAptForm(f => ({ ...f, rooms: e.target.value }))}
                                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                                        style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>Holat</label>
                                    <select value={aptForm.status} onChange={e => setAptForm(f => ({ ...f, status: e.target.value as any }))}
                                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                                        style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }}>
                                        <option value="available">Mavjud</option>
                                        <option value="reserved">Bron</option>
                                        <option value="sold">Sotilgan</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>Maydon, m²</label>
                                    <input type="number" step="0.01" value={aptForm.area}
                                        onChange={e => setAptForm(f => ({ ...f, area: e.target.value }))}
                                        placeholder="masalan: 65.50"
                                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                                        style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>Narx, $</label>
                                    <input type="number" value={aptForm.price}
                                        onChange={e => setAptForm(f => ({ ...f, price: e.target.value }))}
                                        placeholder="masalan: 85000"
                                        className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                                        style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                                </div>
                            </div>

                            {/* Price per m² calculator */}
                            <div className="flex items-center gap-2 rounded-xl px-4 py-2.5"
                                style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.08)' }}>
                                <Calculator className="w-3.5 h-3.5 shrink-0" style={{ color: '#475569' }} />
                                <span className="text-xs" style={{ color: '#475569' }}>Hisoblangan narx m² uchun:</span>
                                {pricePerM2 ? (
                                    <span className="text-xs font-bold text-slate-800 ml-auto">${pricePerM2.toLocaleString()} / m²</span>
                                ) : (
                                    <span className="text-xs ml-auto" style={{ color: '#334155' }}>maydon va narxni kiriting</span>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--muted)' }}>Turi</label>
                                <input type="text" value={aptForm.type}
                                    onChange={e => setAptForm(f => ({ ...f, type: e.target.value }))}
                                    placeholder="masalan: Studio, Penthouse"
                                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                                    style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.12)' }} />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAptModal(false)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all"
                                    style={{ border: '1px solid rgba(16,185,129,0.12)', color: '#64748b' }}>
                                    Bekor qilish
                                </button>
                                <button type="submit" disabled={aptSubmitting}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                                    style={{ backgroundColor: '#10b981' }}>
                                    {aptSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Yaratish
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
