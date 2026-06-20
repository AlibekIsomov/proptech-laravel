import { useState, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, Plus, Building2, ChevronDown, ChevronUp,
    Zap, X, Loader2, Home, Calculator,
} from 'lucide-react';
import AppShell from '@/Components/AppShell';
import FloorPlan from '@/Components/FloorPlan';
import { PageHead, Btn, Field, TextInput, PmSelect } from '@/Components/pm/ui';

interface Project {
    id: string;
    name: string;
    location: string | null;
    status: string;
    created_at: string;
}

interface Building {
    id: string;
    pm_project_id: string;
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
    pm_building_id: string;
    floor: string;
    number: string;
    rooms: string;
    area: string;
    price: string;
    status: 'available' | 'reserved' | 'sold';
    type: string;
}

const emptyApt = (buildingId = ''): AptForm => ({
    pm_building_id: buildingId,
    floor: '', number: '', rooms: '2', area: '', price: '',
    status: 'available', type: '',
});

const STATUS_CFG = {
    available: { bg: 'rgba(16,185,129,0.10)',  text: '#34d399', labelKey: 'projectShow.statusAvailable' },
    reserved:  { bg: 'rgba(245,158,11,0.10)',  text: '#fbbf24', labelKey: 'projectShow.statusReserved'  },
    sold:      { bg: 'rgba(20,184,166,0.10)',  text: '#2dd4bf', labelKey: 'projectShow.statusSold'      },
};

export default function PMProjectShow({ project, buildings, aptStats }: Props) {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;
    const canEdit = ['super_admin', 'company_admin'].includes(auth.user?.role) ||
                    auth.user?.pm_role === 'property_manager';

    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [fpRefreshKey,     setFpRefreshKey]     = useState(0);

    // ── Add building ────────────────────────────────────────────────────────
    const [showAddBuilding, setShowAddBuilding] = useState(false);
    const [buildingName,    setBuildingName]    = useState('');
    const [monthlyFee,      setMonthlyFee]      = useState('0');
    const [addingBuilding,  setAddingBuilding]  = useState(false);

    // ── Bulk generate ───────────────────────────────────────────────────────
    const [showBulkGen,    setShowBulkGen]    = useState(false);
    const [bulkBuildingId, setBulkBuildingId] = useState('');
    const [bulkFloors,     setBulkFloors]     = useState('9');
    const [generating,     setGenerating]     = useState(false);
    const [genError,       setGenError]       = useState<string | null>(null);

    // Xona turlari: 1-xonali dan 5-xonalikacha
    const DEFAULT_TYPES = [
        { rooms: 1, enabled: true,  count: '1', area: '45',  price: '62000'  },
        { rooms: 2, enabled: true,  count: '2', area: '65',  price: '85000'  },
        { rooms: 3, enabled: true,  count: '1', area: '90',  price: '115000' },
        { rooms: 4, enabled: false, count: '1', area: '120', price: '150000' },
        { rooms: 5, enabled: false, count: '1', area: '150', price: '190000' },
    ];
    const [aptTypes, setAptTypes] = useState(DEFAULT_TYPES);

    const updateType = (rooms: number, field: string, value: string | boolean) =>
        setAptTypes(prev => prev.map(t => t.rooms === rooms ? { ...t, [field]: value } : t));

    const enabledTypes = aptTypes.filter(t => t.enabled);
    const totalApts    = enabledTypes.reduce((s, t) => s + (parseInt(t.count) || 0), 0);
    const totalFloors  = parseInt(bulkFloors) || 0;
    const grandTotal   = totalApts * totalFloors;

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
        router.post(`/pm/projects/${project.id}/buildings`, {
            name: buildingName.trim(),
            monthly_fee_per_sqm: monthlyFee ? parseFloat(monthlyFee) : 0,
        }, {
            onFinish: () => { setAddingBuilding(false); setBuildingName(''); setMonthlyFee('0'); setShowAddBuilding(false); },
        });
    }

    function openBulkGen(b: Building) {
        setBulkBuildingId(b.id);
        setBulkFloors('9');
        setAptTypes(DEFAULT_TYPES);
        setGenError(null);
        setShowBulkGen(true);
    }

    function handleBulkGenerate(e: React.FormEvent) {
        e.preventDefault();
        setGenError(null);
        const floorsNum = parseInt(bulkFloors);
        if (isNaN(floorsNum) || floorsNum < 1) { setGenError('Qavatlar sonini kiriting.'); return; }
        if (enabledTypes.length === 0) { setGenError("Kamida bitta xona turini yoqing."); return; }

        const types = enabledTypes.map(t => ({
            rooms:           t.rooms,
            count_per_floor: parseInt(t.count) || 1,
            area:            parseFloat(t.area)  || 0,
        }));

        setGenerating(true);
        router.post('/pm/apartments/bulk-generate', {
            pm_building_id:  bulkBuildingId,
            floors:          floorsNum,
            apartment_types: types,
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
            pm_building_id: aptForm.pm_building_id,
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
            <div className="page">
                <PageHead
                    eyebrow={t('pmProjects.title')}
                    title={project.name}
                    sub={project.location ?? undefined}
                    actions={
                        <Btn variant="ghost" icon={ArrowLeft} onClick={() => router.visit('/pm/projects')}>
                            Loyihalar
                        </Btn>
                    }
                />

                {/* Buildings section */}
                <div style={{ marginBottom: 24, flex: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Binolar</h2>
                        {canEdit && (
                            <Btn variant="primary" icon={Plus} onClick={() => { setBuildingName(''); setShowAddBuilding(true); }}>
                                Bino qo'shish
                            </Btn>
                        )}
                    </div>

                    {buildings.length === 0 ? (
                        <div className="empty">
                            <div className="e-ic"><Building2 className="ic" /></div>
                            <h3>Binolar yo'q</h3>
                            <p>Birinchi binoni qo'shing</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                            {buildings.map(b => {
                                const active = selectedBuilding?.id === b.id;
                                const stats  = aptStats[b.id] ?? { total: 0, available: 0, sold: 0, reserved: 0 };

                                return (
                                    <div key={b.id} className="card" style={{
                                        borderColor: active ? 'var(--brand)' : undefined,
                                        overflow: 'hidden',
                                        transition: 'border-color 0.15s',
                                    }}>
                                        {/* Building toggle header */}
                                        <button onClick={() => setSelectedBuilding(active ? null : b)}
                                            style={{ width: '100%', padding: '14px 16px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, flexShrink: 0, backgroundColor: active ? 'var(--brand)' : 'var(--brand-tint)' }}>
                                                <Building2 className="ic" style={{ color: active ? '#fff' : 'var(--brand)' }} />
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{stats.total} kvartira</div>
                                            </div>
                                            {active
                                                ? <ChevronUp   className="ic" style={{ color: 'var(--brand)', flexShrink: 0 }} />
                                                : <ChevronDown className="ic" style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                                        </button>

                                        {/* Stats mini-bar */}
                                        {stats.total > 0 && (
                                            <div style={{ padding: '0 16px 14px' }}>
                                                <div style={{ width: '100%', height: 5, borderRadius: 99, overflow: 'hidden', backgroundColor: 'var(--border)', marginBottom: 8 }}>
                                                    <div style={{ height: '100%', display: 'flex' }}>
                                                        <div style={{ width: `${(stats.sold / stats.total) * 100}%`, backgroundColor: 'var(--ok)' }} />
                                                        <div style={{ width: `${(stats.reserved / stats.total) * 100}%`, backgroundColor: 'var(--warn)' }} />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                                                    <span style={{ color: 'var(--ok)' }}>{stats.available} {t('projectShow.available')}</span>
                                                    <span style={{ color: 'var(--warn)' }}>{stats.reserved} {t('projectShow.reserved')}</span>
                                                    <span style={{ color: 'var(--info)' }}>{stats.sold} {t('projectShow.sold')}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Action buttons when expanded */}
                                        {active && canEdit && (
                                            <div style={{ padding: '12px 16px 14px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                <Btn variant="soft" size="sm" icon={Zap as any} onClick={() => openBulkGen(b)}>Bulk</Btn>
                                                <Btn variant="ghost" size="sm" icon={Plus} onClick={() => openAddApt(b)}>Kvartira</Btn>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <div style={{ width: 3, height: 18, borderRadius: 99, backgroundColor: 'var(--brand)', flexShrink: 0 }} />
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                                Shaxmatka — {selectedBuilding.name}
                            </h2>
                        </div>
                        <FloorPlan
                            building_id={selectedBuilding.id}
                            refreshKey={fpRefreshKey}
                            apiBase="/pm"
                            mode="pm"
                        />
                    </div>
                )}
            </div>

            {/* ── Add building modal ── */}
            {showAddBuilding && (
                <div className="scrim show" onClick={() => setShowAddBuilding(false)}>
                    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                        onClick={e => e.stopPropagation()}>
                        <div className="card card-pad" style={{ width: '100%', maxWidth: 380 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Bino qo'shish</h2>
                                <button className="drawer-close" onClick={() => setShowAddBuilding(false)}><X className="ic" /></button>
                            </div>
                            <form onSubmit={handleAddBuilding} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <Field label="Bino nomi">
                                    <TextInput type="text" required placeholder="masalan: A korpus"
                                        value={buildingName} onChange={e => setBuildingName(e.target.value)} />
                                </Field>
                                <Field label="Oylik to'lov (m² uchun), $">
                                    <TextInput type="number" step="0.01" min="0" placeholder="masalan: 1.50"
                                        value={monthlyFee} onChange={e => setMonthlyFee(e.target.value)} />
                                </Field>
                                <Btn variant="primary" block type="submit" disabled={addingBuilding} icon={addingBuilding ? Loader2 : undefined}>
                                    Qo'shish
                                </Btn>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk generate modal ── */}
            {showBulkGen && (
                <div className="scrim show" onClick={() => setShowBulkGen(false)}>
                    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                        onClick={e => e.stopPropagation()}>
                        <div className="card card-pad" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Zap className="ic" style={{ color: 'var(--brand)' }} />
                                    <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Kvartiralarni bulk yaratish</h2>
                                </div>
                                <button className="drawer-close" onClick={() => setShowBulkGen(false)}><X className="ic" /></button>
                            </div>

                            <form onSubmit={handleBulkGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <Field label="Qavatlar soni">
                                    <TextInput type="number" min={1} max={100} required
                                        value={bulkFloors} onChange={e => setBulkFloors(e.target.value)} />
                                </Field>

                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kvartira turlari</div>
                                    <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 90px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-3)', padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                                            <span></span><span>Tur</span><span style={{ textAlign: 'center' }}>Har qavatda</span><span style={{ textAlign: 'center' }}>Maydon m²</span>
                                        </div>
                                        {aptTypes.map((t, idx) => (
                                            <div key={t.rooms} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 90px', alignItems: 'center', padding: '10px 12px', borderBottom: idx < aptTypes.length - 1 ? '1px solid var(--border)' : 'none', opacity: t.enabled ? 1 : 0.4 }}>
                                                <button type="button" onClick={() => updateType(t.rooms, 'enabled', !t.enabled)}
                                                    style={{ width: 36, height: 20, borderRadius: 99, position: 'relative', flexShrink: 0, backgroundColor: t.enabled ? 'var(--brand)' : 'var(--border)', border: 'none', cursor: 'pointer' }}>
                                                    <span style={{ position: 'absolute', top: 2, width: 16, height: 16, borderRadius: 99, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s', left: t.enabled ? 18 : 2 }} />
                                                </button>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{t.rooms}-xonali</span>
                                                <input type="number" min={1} max={20} value={t.count} disabled={!t.enabled}
                                                    onChange={e => updateType(t.rooms, 'count', e.target.value)}
                                                    style={{ width: 52, textAlign: 'center', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'var(--text-1)', backgroundColor: t.enabled ? 'var(--surface)' : 'transparent', border: `1px solid ${t.enabled ? 'var(--border)' : 'transparent'}`, margin: '0 auto', display: 'block', outline: 'none' }} />
                                                <input type="number" min={1} step="0.1" value={t.area} disabled={!t.enabled}
                                                    onChange={e => updateType(t.rooms, 'area', e.target.value)}
                                                    style={{ width: 60, textAlign: 'center', borderRadius: 6, padding: '4px 6px', fontSize: 12, color: 'var(--text-1)', backgroundColor: t.enabled ? 'var(--surface)' : 'transparent', border: `1px solid ${t.enabled ? 'var(--border)' : 'transparent'}`, margin: '0 auto', display: 'block', outline: 'none' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, backgroundColor: 'var(--brand-tint)', border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)' }}>
                                    <Zap className="ic" style={{ color: 'var(--brand)', flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Yaratiladi:</span>
                                    <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>
                                        {grandTotal > 0 ? `${totalFloors} qavat × ${totalApts} kvartira = ${grandTotal} ta` : '—'}
                                    </span>
                                </div>

                                {genError && <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>{genError}</p>}

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <Btn variant="ghost" block type="button" onClick={() => setShowBulkGen(false)}>Bekor qilish</Btn>
                                    <Btn variant="primary" block type="submit" disabled={generating || grandTotal === 0} icon={generating ? Loader2 : Zap as any}>
                                        Yaratish
                                    </Btn>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Add single apartment modal ── */}
            {showAptModal && (
                <div className="scrim show" onClick={() => setShowAptModal(false)}>
                    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                        onClick={e => e.stopPropagation()}>
                        <div className="card card-pad" style={{ width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Home className="ic" style={{ color: 'var(--brand)' }} />
                                    <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Yangi kvartira</h2>
                                </div>
                                <button className="drawer-close" onClick={() => setShowAptModal(false)}><X className="ic" /></button>
                            </div>

                            <form onSubmit={handleAptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <Field label="Qavat *">
                                        <TextInput type="number" min={1} required placeholder="masalan: 5"
                                            value={aptForm.floor} onChange={e => setAptForm(f => ({ ...f, floor: e.target.value }))} />
                                    </Field>
                                    <Field label="Kvartira raqami *">
                                        <TextInput type="text" required placeholder="masalan: 501"
                                            value={aptForm.number} onChange={e => setAptForm(f => ({ ...f, number: e.target.value }))} />
                                    </Field>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <Field label="Xonalar *">
                                        <TextInput type="number" min={0} required
                                            value={aptForm.rooms} onChange={e => setAptForm(f => ({ ...f, rooms: e.target.value }))} />
                                    </Field>
                                    <Field label="Holat">
                                        <PmSelect value={aptForm.status} onChange={e => setAptForm(f => ({ ...f, status: e.target.value as any }))}>
                                            <option value="available">{t('projectShow.statusAvailable')}</option>
                                            <option value="reserved">{t('projectShow.statusReserved')}</option>
                                            <option value="sold">{t('projectShow.statusSold')}</option>
                                        </PmSelect>
                                    </Field>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <Field label="Maydon, m²">
                                        <TextInput type="number" step="0.01" placeholder="masalan: 65.50"
                                            value={aptForm.area} onChange={e => setAptForm(f => ({ ...f, area: e.target.value }))} />
                                    </Field>
                                    <Field label="Narx, $">
                                        <TextInput type="number" placeholder="masalan: 85000"
                                            value={aptForm.price} onChange={e => setAptForm(f => ({ ...f, price: e.target.value }))} />
                                    </Field>
                                </div>

                                {/* Price per m² calculator */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--brand-tint)', border: '1px solid color-mix(in srgb, var(--brand) 15%, transparent)' }}>
                                    <Calculator className="ic" style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Hisoblangan narx m² uchun:</span>
                                    {pricePerM2 ? (
                                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginLeft: 'auto' }}>${pricePerM2.toLocaleString()} / m²</span>
                                    ) : (
                                        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>maydon va narxni kiriting</span>
                                    )}
                                </div>

                                <Field label="Turi">
                                    <TextInput type="text" placeholder="masalan: Studio, Penthouse"
                                        value={aptForm.type} onChange={e => setAptForm(f => ({ ...f, type: e.target.value }))} />
                                </Field>

                                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                    <Btn variant="ghost" block type="button" onClick={() => setShowAptModal(false)}>Bekor qilish</Btn>
                                    <Btn variant="primary" block type="submit" disabled={aptSubmitting} icon={aptSubmitting ? Loader2 : undefined}>
                                        Yaratish
                                    </Btn>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}

