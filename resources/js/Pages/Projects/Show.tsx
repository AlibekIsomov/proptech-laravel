import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, Plus, Building2, MapPin, ChevronDown, ChevronUp,
    Zap, X, Loader2, Home, Edit2, Calculator,
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

export default function ProjectShow({ project, buildings, aptStats }: Props) {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;
    const canEdit = ['super_admin', 'company_admin', 'manager'].includes(auth.user?.role);

    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [fpRefreshKey,     setFpRefreshKey]     = useState(0);

    // ── Add building ────────────────────────────────────────────────────────
    const [showAddBuilding, setShowAddBuilding] = useState(false);
    const [buildingName,    setBuildingName]    = useState('');
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
        router.post(`/buildings`, {
            project_id: project.id,
            name: buildingName.trim(),
        }, {
            onFinish: () => { setAddingBuilding(false); setBuildingName(''); setShowAddBuilding(false); },
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
            rooms:          t.rooms,
            count_per_floor: parseInt(t.count) || 1,
            area:           parseFloat(t.area)  || 0,
            price:          parseFloat(t.price) || 0,
        }));

        setGenerating(true);
        router.post('/apartments/bulk-generate', {
            building_id:     bulkBuildingId,
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
        router.post('/apartments', {
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

    const totalAptsAll = Object.values(aptStats).reduce((s, v) => s + v.total, 0);

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <AppShell>
            <Head title={project.name + ' — 1Mahalla'} />
            <div className="page">
                <PageHead
                    eyebrow={t('projects.title')}
                    title={project.name}
                    sub={project.location ?? undefined}
                    actions={
                        <Btn variant="ghost" icon={ArrowLeft} onClick={() => router.visit('/projects')}>
                            {t('projects.title')}
                        </Btn>
                    }
                />

                {/* Project info strip */}
                <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <div className="st-ic brand" style={{ width: 48, height: 48 }}>
                        <Building2 className="ic" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h1 style={{ fontSize: 17 }}>{project.name}</h1>
                        {project.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: 'var(--text-faint)', fontSize: 12.5 }}>
                                <MapPin className="ic" style={{ width: 13, height: 13 }} />{project.location}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 28, textAlign: 'center', flex: 'none' }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 21 }}>{buildings.length}</div>
                            <div className="cell-sub">{t('projects.buildings')}</div>
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 21 }}>{totalAptsAll}</div>
                            <div className="cell-sub">{t('projects.apartments')}</div>
                        </div>
                    </div>
                </div>

                {/* Buildings section */}
                <div style={{ marginBottom: 24, flex: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t('projects.buildings')}</h2>
                        {canEdit && (
                            <Btn variant="primary" icon={Plus} onClick={() => { setBuildingName(''); setShowAddBuilding(true); }}>
                                {t('projectShow.addBuilding')}
                            </Btn>
                        )}
                    </div>

                    {buildings.length === 0 ? (
                        <div className="empty" style={{ flex: 'none', border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)' }}>
                            <div className="e-ic"><Building2 className="ic" /></div>
                            <h3>{t('projectShow.noBuildings', { defaultValue: "Hech qanday bino yo'q" })}</h3>
                            <p>{t('projectShow.addFirstBuilding', { defaultValue: 'Birinchi binoni qo\'shing' })}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                            {buildings.map(b => {
                                const active = selectedBuilding?.id === b.id;
                                const stats  = aptStats[b.id] ?? { total: 0, available: 0, sold: 0, reserved: 0 };

                                return (
                                    <div key={b.id} className="bld" style={{ borderColor: active ? 'var(--brand)' : undefined }}>
                                        <button className="bld-head" style={{ width: '100%' }} onClick={() => setSelectedBuilding(active ? null : b)}>
                                            <div className="b-ic" style={active ? { background: 'var(--brand)', color: '#fff' } : undefined}>
                                                <Building2 className="ic" />
                                            </div>
                                            <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                                                <div className="b-title" style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                                                <div className="b-sub">{stats.total} kvartira</div>
                                            </div>
                                            {active ? <ChevronUp className="ic" style={{ color: 'var(--brand)' }} /> : <ChevronDown className="ic" style={{ color: 'var(--text-faint)' }} />}
                                        </button>

                                        {stats.total > 0 && (
                                            <div style={{ padding: '0 18px 14px' }}>
                                                <div style={{ width: '100%', height: 6, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-3)', display: 'flex', marginBottom: 8 }}>
                                                    <div style={{ width: `${(stats.sold / stats.total) * 100}%`, background: 'var(--ok)' }} />
                                                    <div style={{ width: `${(stats.reserved / stats.total) * 100}%`, background: 'var(--warn)' }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                                                    <span style={{ color: 'var(--ok)' }}>{stats.available} {t('projectShow.available')}</span>
                                                    <span style={{ color: 'var(--warn)' }}>{stats.reserved} {t('projectShow.reserved')}</span>
                                                    <span style={{ color: 'var(--text-soft)' }}>{stats.sold} {t('projectShow.sold')}</span>
                                                </div>
                                            </div>
                                        )}

                                        {active && canEdit && (
                                            <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                <Btn variant="soft" size="sm" icon={Zap} onClick={() => openBulkGen(b)}>{t('projectShow.bulkGenerate')}</Btn>
                                                <Btn variant="soft" size="sm" icon={Plus} onClick={() => openAddApt(b)}>Kvartira</Btn>
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
                        <h2 style={{ fontSize: 15, marginBottom: 14 }}>Shaxmatka — {selectedBuilding.name}</h2>
                        <FloorPlan building_id={selectedBuilding.id} refreshKey={fpRefreshKey} />
                    </div>
                )}
            </div>

            {/* ── Add building modal ── */}
            {showAddBuilding && (
                <div className="scrim show" onClick={() => setShowAddBuilding(false)}>
                    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                        onClick={e => e.stopPropagation()}>
                        <div className="card card-pad" style={{ width: '100%', maxWidth: 380, padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h2 style={{ fontWeight: 700, fontSize: 16 }}>Bino qo'shish</h2>
                                <button className="drawer-close" onClick={() => setShowAddBuilding(false)}><X className="ic" /></button>
                            </div>
                            <form onSubmit={handleAddBuilding} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <Field label="Bino nomi">
                                    <TextInput type="text" required placeholder="masalan: A korpus" value={buildingName} onChange={e => setBuildingName(e.target.value)} />
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
                        <div className="card card-pad" style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Zap className="ic" style={{ color: 'var(--brand)' }} />
                                    <h2 style={{ fontWeight: 700, fontSize: 15 }}>Massoviy kvartira yaratish</h2>
                                </div>
                                <button className="drawer-close" onClick={() => setShowBulkGen(false)}><X className="ic" /></button>
                            </div>

                            <form onSubmit={handleBulkGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                <Field label="Qavatlar soni">
                                    <TextInput type="number" min={1} max={100} required value={bulkFloors} onChange={e => setBulkFloors(e.target.value)} />
                                </Field>

                                <div>
                                    <div className="field-label" style={{ marginBottom: 8 }}>Kvartira turlari</div>
                                    <div className="card" style={{ overflow: 'hidden' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 80px 90px 100px', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-faint)' }}>
                                            <span></span><span>Tur</span>
                                            <span style={{ textAlign: 'center' }}>Har qavatda</span>
                                            <span style={{ textAlign: 'center' }}>Maydon m²</span>
                                            <span style={{ textAlign: 'center' }}>Narx $</span>
                                        </div>

                                        {aptTypes.map((rt, idx) => (
                                            <div key={rt.rooms}
                                                style={{
                                                    display: 'grid', gridTemplateColumns: '44px 1fr 80px 90px 100px', alignItems: 'center',
                                                    padding: '10px 14px',
                                                    borderBottom: idx < aptTypes.length - 1 ? '1px solid var(--border)' : 'none',
                                                    opacity: rt.enabled ? 1 : 0.45,
                                                }}>
                                                <button type="button" onClick={() => updateType(rt.rooms, 'enabled', !rt.enabled)}
                                                    style={{ width: 36, height: 20, borderRadius: 999, position: 'relative', flexShrink: 0, border: 'none', background: rt.enabled ? 'var(--brand)' : 'var(--surface-3)' }}>
                                                    <span style={{ position: 'absolute', top: 2, left: rt.enabled ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: 'var(--sh-xs)', transition: '.15s' }} />
                                                </button>
                                                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{rt.rooms}-xonali</span>
                                                <input type="number" min={1} max={20} value={rt.count} disabled={!rt.enabled}
                                                    onChange={e => updateType(rt.rooms, 'count', e.target.value)}
                                                    className="input" style={{ width: 56, textAlign: 'center', padding: '5px 6px', margin: '0 auto' }} />
                                                <input type="number" min={1} step="0.1" value={rt.area} disabled={!rt.enabled}
                                                    onChange={e => updateType(rt.rooms, 'area', e.target.value)}
                                                    className="input" style={{ width: 64, textAlign: 'center', padding: '5px 6px', margin: '0 auto' }} />
                                                <input type="number" min={0} step={1000} value={rt.price} disabled={!rt.enabled}
                                                    onChange={e => updateType(rt.rooms, 'price', e.target.value)}
                                                    className="input" style={{ width: 80, textAlign: 'center', padding: '5px 6px', margin: '0 auto' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="hint info">
                                    <Zap className="ic" />
                                    <span>Yaratiladi:</span>
                                    <strong style={{ marginLeft: 'auto' }}>
                                        {grandTotal > 0 ? `${totalFloors} qavat × ${totalApts} kvartira = ${grandTotal} ta` : '—'}
                                    </strong>
                                </div>

                                {genError && <div className="hint warn">{genError}</div>}

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <Btn variant="ghost" block type="button" onClick={() => setShowBulkGen(false)}>Bekor qilish</Btn>
                                    <Btn variant="primary" block type="submit" disabled={generating || grandTotal === 0} icon={generating ? Loader2 : Zap}>
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
                        <div className="card card-pad" style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Home className="ic" style={{ color: 'var(--brand)' }} />
                                    <h2 style={{ fontWeight: 700, fontSize: 15 }}>Yangi kvartira</h2>
                                </div>
                                <button className="drawer-close" onClick={() => setShowAptModal(false)}><X className="ic" /></button>
                            </div>

                            <form onSubmit={handleAptSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <Field label="Qavat *">
                                        <TextInput type="number" min={1} required value={aptForm.floor} onChange={e => setAptForm(f => ({ ...f, floor: e.target.value }))} placeholder="masalan: 5" />
                                    </Field>
                                    <Field label="Kvartira raqami *">
                                        <TextInput type="text" required value={aptForm.number} onChange={e => setAptForm(f => ({ ...f, number: e.target.value }))} placeholder="masalan: 501" />
                                    </Field>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <Field label="Xonalar *">
                                        <TextInput type="number" min={0} required value={aptForm.rooms} onChange={e => setAptForm(f => ({ ...f, rooms: e.target.value }))} />
                                    </Field>
                                    <Field label="Holat">
                                        <PmSelect value={aptForm.status} onChange={e => setAptForm(f => ({ ...f, status: e.target.value as any }))}>
                                            <option value="available">Mavjud</option>
                                            <option value="reserved">Bron</option>
                                            <option value="sold">Sotilgan</option>
                                        </PmSelect>
                                    </Field>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <Field label="Maydon, m²">
                                        <TextInput type="number" step="0.01" value={aptForm.area} onChange={e => setAptForm(f => ({ ...f, area: e.target.value }))} placeholder="masalan: 65.50" />
                                    </Field>
                                    <Field label="Narx, $">
                                        <TextInput type="number" value={aptForm.price} onChange={e => setAptForm(f => ({ ...f, price: e.target.value }))} placeholder="masalan: 85000" />
                                    </Field>
                                </div>

                                <div className="hint info">
                                    <Calculator className="ic" />
                                    <span>Hisoblangan narx m² uchun:</span>
                                    {pricePerM2 ? (
                                        <strong style={{ marginLeft: 'auto' }}>${pricePerM2.toLocaleString()} / m²</strong>
                                    ) : (
                                        <span style={{ marginLeft: 'auto' }}>maydon va narxni kiriting</span>
                                    )}
                                </div>

                                <Field label="Turi">
                                    <TextInput type="text" value={aptForm.type} onChange={e => setAptForm(f => ({ ...f, type: e.target.value }))} placeholder="masalan: Studio, Penthouse" />
                                </Field>

                                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
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
