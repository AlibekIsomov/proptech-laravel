import { useState, useMemo, useEffect } from "react";
import { Head, router } from "@inertiajs/react";
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, Boxes, Edit2, X, AlertTriangle, ShieldCheck, Wrench, Trash2, LayoutGrid, Package } from "lucide-react";
import AppShell from "@/Components/AppShell";
import { PageHead, Stat, Btn, Field, PmSelect, Seg, Drawer, Badge, EmptyState } from '@/Components/pm/ui';

interface Building {
    id: string;
    name: string;
    pm_project_id: string;
}

interface Project {
    id: string;
    name: string;
    buildings: Building[];
}

type AssetCategory = "elevator"|"pump"|"boiler"|"hvac"|"electrical"|"plumbing"|"security"|"other";
type AssetStatus   = "operational"|"needs_service"|"broken"|"retired";

interface AssetRow {
    id:                    string;
    pm_building_id:           string;
    name:                  string;
    category:              AssetCategory;
    serial_number:         string | null;
    manufacturer:          string | null;
    installed_at:          string | null;
    warranty_until:        string | null;
    next_service_at:       string | null;
    service_interval_days: number | null;
    location:              string | null;
    notes:                 string | null;
    status:                AssetStatus;
}

interface SupplyRow {
    id:            string;
    pm_building_id:   string;
    name:          string;
    category:      string | null;
    quantity:      number;
    unit:          string;
    min_threshold: number;
    unit_cost:     number | null;
    supplier:      string | null;
    notes:         string | null;
    is_low_stock:  boolean;
    image_url?:    string | null;
}

interface Props {
    projects: Project[];
}

const CAT_KEYS: Record<AssetCategory, string> = {
    elevator:   "pmInventory.catElevator",
    pump:       "pmInventory.catPump",
    boiler:     "pmInventory.catBoiler",
    hvac:       "pmInventory.catHvac",
    electrical: "pmInventory.catElectrical",
    plumbing:   "pmInventory.catPlumbing",
    security:   "pmInventory.catSecurity",
    other:      "pmInventory.catOther",
};
const ALL_CATS = Object.keys(CAT_KEYS) as AssetCategory[];

const STATUS_META: Record<AssetStatus, { labelKey: string; bg: string; fg: string; border: string; rank: number }> = {
    broken:        { labelKey: "pmInventory.statusBroken",        bg: "rgba(239,68,68,0.10)",  fg: "#f87171", border: "rgba(239,68,68,0.30)",  rank: 0 },
    needs_service: { labelKey: "pmInventory.statusNeedsService",  bg: "rgba(251,191,36,0.10)", fg: "#fbbf24", border: "rgba(251,191,36,0.30)", rank: 1 },
    operational:   { labelKey: "pmInventory.statusOperational",   bg: "rgba(16,185,129,0.10)", fg: "#34d399", border: "rgba(16,185,129,0.30)", rank: 2 },
    retired:       { labelKey: "pmInventory.statusRetired",        bg: "var(--border)", fg: "var(--muted)", border: "var(--border)", rank: 3 },
};

export default function InventoryIndex({ projects }: Props) {
    const { t } = useTranslation();
    const [activeTab,    setActiveTab]    = useState<'equipment' | 'supplies'>('equipment');
    const [selectedProj, setSelectedProj] = useState("");
    const [selectedBldg, setSelectedBldg] = useState("");

    // Equipment state
    const [assets,       setAssets]       = useState<AssetRow[]>([]);
    const [loading,      setLoading]      = useState(false);
    const [editing,      setEditing]      = useState<AssetRow | null>(null);
    const [showForm,     setShowForm]     = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<AssetRow | null>(null);
    const [statusUpdating, setStatusUpdating] = useState(false);

    // Supplies state
    const [supplies,        setSupplies]        = useState<SupplyRow[]>([]);
    const [loadingSupplies, setLoadingSupplies] = useState(false);
    const [editingSupply,   setEditingSupply]   = useState<SupplyRow | null>(null);
    const [showSupplyForm,  setShowSupplyForm]  = useState(false);

    // Initial project and building selection
    useEffect(() => {
        if (projects && projects.length > 0) {
            setSelectedProj(projects[0].id);
        }
    }, [projects]);

    const buildings = useMemo(() => {
        const proj = projects.find((p) => p.id === selectedProj);
        return proj ? proj.buildings : [];
    }, [selectedProj, projects]);

    useEffect(() => {
        if (buildings.length > 0) {
            setSelectedBldg(buildings[0].id);
        } else {
            setSelectedBldg("");
        }
    }, [buildings]);

    const loadAssets = async () => {
        if (!selectedBldg) {
            setAssets([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/pm/inventory?pm_building_id=${selectedBldg}`, {
                headers: {
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                }
            });
            const json = await res.json();
            const list = json.assets || [];
            list.sort((a: AssetRow, b: AssetRow) => STATUS_META[a.status].rank - STATUS_META[b.status].rank || a.name.localeCompare(b.name));
            setAssets(list);
        } catch (err) {
            console.error("Failed to load assets:", err);
        } finally {
            setLoading(false);
        }
    };

    const loadSupplies = async () => {
        if (!selectedBldg) {
            setSupplies([]);
            return;
        }
        setLoadingSupplies(true);
        try {
            const res = await fetch(`/pm/inventory?pm_building_id=${selectedBldg}&type=supply`, {
                headers: {
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                }
            });
            const json = await res.json();
            setSupplies(json.items || []);
        } catch (err) {
            console.error("Failed to load supplies:", err);
        } finally {
            setLoadingSupplies(false);
        }
    };

    const handleRefreshAll = () => {
        loadAssets();
        loadSupplies();
    };

    useEffect(() => {
        handleRefreshAll();
    }, [selectedBldg]);

    // Derived Equipment Stats
    const stats = useMemo(() => {
        let broken = 0, dueSoon = 0, ok = 0;
        const now = Date.now();
        const in14 = now + 14 * 24 * 3600 * 1000;
        for (const a of assets) {
            if (a.status === "broken") broken++;
            else if (a.status === "needs_service") dueSoon++;
            else if (a.status === "operational") {
                if (a.next_service_at) {
                    const t = new Date(a.next_service_at).getTime();
                    if (t <= in14) dueSoon++;
                    else ok++;
                } else ok++;
            }
        }
        return { broken, dueSoon, ok, total: assets.length };
    }, [assets]);

    // Derived Supplies Stats
    const supplyStats = useMemo(() => {
        let totalItems = 0;
        let lowStockCount = 0;
        let totalValue = 0;

        for (const s of supplies) {
            totalItems++;
            if (s.quantity <= s.min_threshold) {
                lowStockCount++;
            }
            totalValue += s.quantity * (s.unit_cost || 0);
        }

        return { totalItems, lowStockCount, totalValue };
    }, [supplies]);

    function openCreate() {
        setEditing(null);
        setShowForm(true);
    }

    function openEdit(a: AssetRow) {
        setEditing(a);
        setShowForm(true);
    }

    async function handleStatusUpdate(asset: AssetRow, newStatus: AssetStatus) {
        setStatusUpdating(true);
        try {
            const body = {
                name:     asset.name,
                category: asset.category,
                status:   newStatus,
                serial_number:         asset.serial_number,
                manufacturer:          asset.manufacturer,
                location:              asset.location,
                installed_at:          asset.installed_at,
                warranty_until:        asset.warranty_until,
                next_service_at:       asset.next_service_at,
                service_interval_days: asset.service_interval_days,
                notes:                 asset.notes,
            };
            await fetch(`/pm/inventory/${asset.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify(body),
            });
            setSelectedAsset(null);
            loadAssets();
        } catch (err) {
            console.error('Failed to update status:', err);
        } finally {
            setStatusUpdating(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Вы уверены, что хотите удалить это оборудование?")) return;
        try {
            await fetch(`/pm/inventory/${id}`, {
                method: "DELETE",
                headers: {
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                }
            });
            loadAssets();
        } catch (err) {
            console.error("Failed to delete asset:", err);
        }
    }

    function openCreateSupply() {
        setEditingSupply(null);
        setShowSupplyForm(true);
    }

    function openEditSupply(s: SupplyRow) {
        setEditingSupply(s);
        setShowSupplyForm(true);
    }

    async function handleDeleteSupply(id: string) {
        if (!confirm("Вы уверены, что хотите удалить этот расходный материал?")) return;
        try {
            await fetch(`/pm/inventory/${id}`, {
                method: "DELETE",
                headers: {
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                }
            });
            loadSupplies();
        } catch (err) {
            console.error("Failed to delete supply item:", err);
        }
    }

    return (
        <AppShell>
            <Head title={t('pmInventory.title') + ' — PM'} />
            <div className="page">
                <PageHead
                    eyebrow={t('common.propertyMgmt')}
                    title={t('pmInventory.title')}
                    sub={t('pmInventory.subtitle')}
                    actions={
                        activeTab === 'equipment'
                            ? <Btn variant="primary" icon={Plus} disabled={!selectedBldg} onClick={openCreate}>{t('pmInventory.addEquipment')}</Btn>
                            : <Btn variant="primary" icon={Plus} disabled={!selectedBldg} onClick={openCreateSupply}>{t('pmInventory.addMaterial')}</Btn>
                    }
                />

                {/* Tab + selectors row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
                    <Seg
                        value={activeTab}
                        onChange={v => setActiveTab(v as 'equipment' | 'supplies')}
                        options={[
                            { value: 'equipment', label: t('pmInventory.equipment'), icon: LayoutGrid },
                            { value: 'supplies',  label: t('pmInventory.supplies'),  icon: Package   },
                        ]}
                    />
                    <Field label={t('pmInventory.project')}>
                        <PmSelect value={selectedProj} onChange={e => setSelectedProj(e.target.value)}>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </PmSelect>
                    </Field>
                    <Field label={t('pmInventory.building')}>
                        <PmSelect value={selectedBldg} disabled={buildings.length === 0} onChange={e => setSelectedBldg(e.target.value)}>
                            {buildings.length === 0 && <option value="">{t('pmInventory.noBuildings')}</option>}
                            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </PmSelect>
                    </Field>
                </div>

                {activeTab === 'equipment' ? (
                    <>
                        <div className="stat-grid" style={{ marginBottom: 20 }}>
                            <Stat label={t('pmInventory.totalEquipment')} value={stats.total}   icon={Boxes}         tone="neutral" />
                            <Stat label={t('pmInventory.operational')}    value={stats.ok}      icon={ShieldCheck}   tone="ok"      />
                            <Stat label={t('pmInventory.needsService')}   value={stats.dueSoon} icon={AlertTriangle} tone="warn"    />
                            <Stat label={t('pmInventory.broken')}         value={stats.broken}  icon={Wrench}        tone="danger"  />
                        </div>

                        {showForm && selectedBldg && (
                            <AssetForm buildingId={selectedBldg} asset={editing} onSaved={() => { setShowForm(false); loadAssets(); }} onCancel={() => setShowForm(false)} />
                        )}

                        {loading ? (
                            <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                                <Loader2 className="ic" style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
                            </div>
                        ) : assets.length === 0 ? (
                            <EmptyState icon={Boxes} title={t('pmInventory.noEquipment')} sub={t('pmInventory.noEquipmentHint')} />
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                                {assets.map(a => <AssetCard key={a.id} asset={a} onEdit={() => openEdit(a)} onDelete={() => handleDelete(a.id)} onClick={() => setSelectedAsset(a)} />)}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="stat-grid" style={{ marginBottom: 20 }}>
                            <Stat label={t('pmInventory.totalItems')} value={supplyStats.totalItems}    icon={Package}       tone="neutral" />
                            <Stat label={t('pmInventory.lowStock')}   value={supplyStats.lowStockCount} icon={AlertTriangle} tone="warn"    />
                            <Stat label={t('pmInventory.totalValue')} value={supplyStats.totalValue}    icon={Boxes}         tone="ok"      />
                        </div>

                        {showSupplyForm && selectedBldg && (
                            <SupplyForm buildingId={selectedBldg} supply={editingSupply} onSaved={() => { setShowSupplyForm(false); loadSupplies(); }} onCancel={() => setShowSupplyForm(false)} />
                        )}

                        {loadingSupplies ? (
                            <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                                <Loader2 className="ic" style={{ width: 24, height: 24, animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
                            </div>
                        ) : supplies.length === 0 ? (
                            <EmptyState icon={Boxes} title={t('pmInventory.noMaterials')} sub={t('pmInventory.noMaterialsHint')} />
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                                {supplies.map(s => <SupplyCard key={s.id} supply={s} onEdit={() => openEditSupply(s)} onDelete={() => handleDeleteSupply(s.id)} />)}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Asset detail drawer */}
            <Drawer
                open={!!selectedAsset}
                onClose={() => setSelectedAsset(null)}
                title={selectedAsset?.name ?? ''}
                sub={t('pmInventory.equipment')}
                width={420}
                footer={selectedAsset ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                        <Btn variant="ghost" block onClick={() => { setSelectedAsset(null); openEdit(selectedAsset); }}><Edit2 className="ic" /> Tahrirlash</Btn>
                        <Btn variant="danger-ghost" block onClick={() => { setSelectedAsset(null); handleDelete(selectedAsset.id); }}><Trash2 className="ic" /> O'chirish</Btn>
                    </div>
                ) : undefined}
            >
                {selectedAsset && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Current status */}
                        <div className="card" style={{ padding: '12px 14px' }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 8 }}>Joriy holat</div>
                            <span className="badge" style={{ backgroundColor: STATUS_META[selectedAsset.status]?.bg, color: STATUS_META[selectedAsset.status]?.fg, border: `1px solid ${STATUS_META[selectedAsset.status]?.border}` }}>
                                {t(STATUS_META[selectedAsset.status]?.labelKey)}
                            </span>
                        </div>

                        {/* Asset info grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {selectedAsset.category && (
                                <div className="card" style={{ padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 4 }}>Kategoriya</div>
                                    <div style={{ fontWeight: 700, fontSize: 12 }}>{t(CAT_KEYS[selectedAsset.category] || 'pmInventory.catOther')}</div>
                                </div>
                            )}
                            {selectedAsset.location && (
                                <div className="card" style={{ padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 4 }}>Joylashuv</div>
                                    <div style={{ fontWeight: 700, fontSize: 12 }}>{selectedAsset.location}</div>
                                </div>
                            )}
                            {selectedAsset.manufacturer && (
                                <div className="card" style={{ padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 4 }}>Ishlab chiqaruvchi</div>
                                    <div style={{ fontWeight: 700, fontSize: 12 }}>{selectedAsset.manufacturer}</div>
                                </div>
                            )}
                            {selectedAsset.serial_number && (
                                <div className="card" style={{ padding: '10px 12px' }}>
                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 4 }}>Seriya №</div>
                                    <div style={{ fontWeight: 700, fontSize: 12, fontFamily: 'var(--font-mono)' }}>{selectedAsset.serial_number}</div>
                                </div>
                            )}
                        </div>

                        {/* Status change */}
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>Statusni o'zgartirish</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {(['operational', 'needs_service', 'broken', 'retired'] as AssetStatus[]).map(st => {
                                    const meta = STATUS_META[st];
                                    const isActive = selectedAsset.status === st;
                                    return (
                                        <button key={st} disabled={isActive || statusUpdating}
                                            onClick={() => handleStatusUpdate(selectedAsset, st)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 12, background: isActive ? meta.bg : 'var(--bg)', border: isActive ? `2px solid ${meta.border}` : '1px solid var(--border)', cursor: isActive ? 'default' : 'pointer', transition: 'all .15s' }}
                                        >
                                            <span style={{ fontSize: 12, fontWeight: 600, color: meta.fg }}>{t(meta.labelKey)}</span>
                                            {isActive && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: meta.border, color: meta.fg }}>Joriy</span>}
                                            {!isActive && statusUpdating && <Loader2 className="ic" style={{ width: 14, height: 14, color: 'var(--text-3)', animation: 'spin 1s linear infinite' }} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>
        </AppShell>
    );
}

// ── Supply Card ───────────────────────────────────────────────────────────────

function SupplyCard({ supply, onEdit, onDelete }: { supply: SupplyRow; onEdit: () => void; onDelete: () => void }) {
    const isLow = supply.quantity <= supply.min_threshold;
    const totalVal = supply.quantity * (supply.unit_cost || 0);

    return (
        <div className="rounded-2xl p-5 space-y-4 animate-fade-in" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800 truncate">{supply.name}</p>
                        {supply.category && (
                            <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0" style={{ backgroundColor: "var(--border)", color: "#a5b4fc" }}>
                                {supply.category}
                            </span>
                        )}
                    </div>
                    <div className="text-xs mt-1.5 space-x-3 text-slate-500 font-medium">
                        {supply.supplier && <span>Поставщик: {supply.supplier}</span>}
                        {supply.unit_cost ? <span>Цена: ${supply.unit_cost.toFixed(2)}</span> : null}
                    </div>
                </div>
                {supply.image_url && (
                    <div className="shrink-0 mr-2 rounded-lg overflow-hidden border border-slate-200" style={{ width: '48px', height: '48px' }}>
                        <img src={supply.image_url} alt={supply.name} className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={onEdit}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-white transition-colors"
                        title="Редактировать"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                        title="Удалить"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl text-center font-mono" style={{ backgroundColor: 'var(--bg)', border: "1px solid var(--border)" }}>
                <div>
                    <span className="block text-[9px] font-sans uppercase tracking-widest text-slate-500 font-bold mb-0.5">В наличии</span>
                    <p className="text-xs font-bold" style={{ color: isLow ? '#f87171' : '#34d399' }}>
                        {supply.quantity} {supply.unit || 'pcs'}
                    </p>
                </div>
                <div>
                    <span className="block text-[9px] font-sans uppercase tracking-widest text-slate-500 font-bold mb-0.5">Минимум</span>
                    <p className="text-xs text-slate-400 font-bold">{supply.min_threshold} {supply.unit || 'pcs'}</p>
                </div>
                <div>
                    <span className="block text-[9px] font-sans uppercase tracking-widest text-slate-500 font-bold mb-0.5">Стоимость</span>
                    <p className="text-xs text-slate-800 font-bold">${totalVal.toFixed(2)}</p>
                </div>
            </div>

            {supply.notes && (
                <p className="text-xs pt-3 leading-relaxed" style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}>
                    {supply.notes}
                </p>
            )}
        </div>
    );
}

// ── Supply Form ───────────────────────────────────────────────────────────────

interface SupplyFormProps {
    buildingId: string;
    supply:     SupplyRow | null;
    onSaved:    () => void;
    onCancel:   () => void;
}

function SupplyForm({ buildingId, supply, onSaved, onCancel }: SupplyFormProps) {
    const [name,         setName]         = useState(supply?.name ?? "");
    const [category,     setCategory]     = useState(supply?.category ?? "Other");
    const [quantity,     setQuantity]     = useState<number | "">(supply?.quantity ?? 0);
    const [unit,         setUnit]         = useState(supply?.unit ?? "pcs");
    const [minThreshold, setMinThreshold] = useState<number | "">(supply?.min_threshold ?? 0);
    const [unitCost,     setUnitCost]     = useState<number | "">(supply?.unit_cost ?? 0);
    const [supplier,     setSupplier]     = useState(supply?.supplier ?? "");
    const [notes,        setNotes]        = useState(supply?.notes ?? "");
    const [image,        setImage]        = useState<File | null>(null);
    const [saving,       setSaving]       = useState(false);
    const [error,        setError]        = useState<string | null>(null);

    async function save() {
        if (!name.trim()) {
            setError("Введите название инвентаря");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const url    = supply ? `/pm/inventory/${supply.id}` : "/pm/inventory";
            
            const formData = new FormData();
            formData.append("type", "supply");
            formData.append("name", name.trim());
            formData.append("category", category);
            formData.append("quantity", (quantity === "" ? 0 : Number(quantity)).toString());
            formData.append("unit", unit.trim() || "pcs");
            formData.append("min_threshold", (minThreshold === "" ? 0 : Number(minThreshold)).toString());
            if (unitCost !== "") formData.append("unit_cost", Number(unitCost).toString());
            if (supplier.trim()) formData.append("supplier", supplier.trim());
            if (notes.trim()) formData.append("notes", notes.trim());
            if (image) formData.append("image", image);
            if (!supply) formData.append("pm_building_id", buildingId);
            
            if (supply) {
                // Laravel handles PUT with FormData via _method
                formData.append("_method", "PUT");
            }

            const res  = await fetch(url, {
                method: "POST", // override for FormData with _method
                headers: {
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                },
                body: formData,
            });
            const json = await res.json();
            if (!res.ok) {
                setError(json.error ?? "Ошибка сохранения");
                return;
            }
            onSaved();
        } catch (err) {
            setError("Произошла ошибка при сохранении");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-2xl p-6 space-y-4 animate-fade-in" style={{ backgroundColor: 'var(--card)', border: "1px solid rgba(16,185,129,0.25)" }}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {supply ? "Редактировать расходный материал" : "Добавить новый расходный материал"}
                </h3>
                <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Название материала *">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="напр. Светодиодные лампы E27"
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Категория">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={fs()}
                    >
                        {["Plumbing", "Electrical", "Tools", "Cleaning", "Paint", "Materials", "Other"].map((c) => (
                            <option key={c} value={c} style={{ backgroundColor: 'var(--card)' }}>{c}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Количество в наличии *">
                    <input
                        type="number"
                        min={0}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Единица измерения">
                    <input
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="напр. шт, кг, м"
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Минимальный порог (оповещение)">
                    <input
                        type="number"
                        min={0}
                        value={minThreshold}
                        onChange={(e) => setMinThreshold(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Цена за единицу ($)">
                    <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Поставщик">
                    <input
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        placeholder="напр. ООО ЭлектроСнаб"
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Фото (Изображение)">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                setImage(e.target.files[0]);
                            }
                        }}
                        className="w-full rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                        style={fs()}
                    />
                </Field>
            </div>

            <Field label="Заметки">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Любая важная информация о материале..."
                  className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none resize-none placeholder:text-slate-400"
                  style={fs()}
                />
            </Field>

            {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-slate-100 transition-all"
                >
                    Отмена
                </button>
                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 disabled:opacity-50 transition-all"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)" }}
                >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Сохранить
                </button>
            </div>
        </div>
    );
}

// ── Asset Card ───────────────────────────────────────────────────────────────

interface AssetCardProps {
    asset: AssetRow;
    onEdit: () => void;
    onDelete: () => void;
    onClick?: () => void;
}

function AssetCard({ asset, onEdit, onDelete, onClick }: AssetCardProps) {
    const { t } = useTranslation();
    const meta = STATUS_META[asset.status] || STATUS_META.operational;

    const warrantyDays = asset.warranty_until
        ? Math.floor((new Date(asset.warranty_until).getTime() - Date.now()) / (24 * 3600 * 1000))
        : null;
    const serviceDays  = asset.next_service_at
        ? Math.floor((new Date(asset.next_service_at).getTime() - Date.now()) / (24 * 3600 * 1000))
        : null;

    return (
        <div
            className="rounded-2xl p-5 space-y-4 cursor-pointer transition-all hover:shadow-lg"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
            onClick={onClick}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-800 truncate">{asset.name}</p>
                        <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider" style={{ backgroundColor: "var(--border)", color: "#a5b4fc" }}>
                            {t(CAT_KEYS[asset.category] || 'pmInventory.catOther')}
                        </span>
                    </div>
                    <div className="text-xs mt-1.5 space-x-3 text-slate-500 font-medium">
                        {asset.manufacturer && <span>Бренд: {asset.manufacturer}</span>}
                        {asset.serial_number && <span>S/N: {asset.serial_number}</span>}
                        {asset.location && <span>📍 {asset.location}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: meta.bg, color: meta.fg, border: `1px solid ${meta.border}` }}>
                        {t(meta.labelKey)}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-white transition-colors"
                        title="Tahrirlash"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                        title="O'chirish"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl" style={{ backgroundColor: 'var(--bg)', border: "1px solid var(--border)" }}>
                {asset.next_service_at && (
                    <InfoRow
                        icon={<Wrench className="w-3 h-3 text-emerald-400" />}
                        label="Плановое ТО"
                        value={new Date(asset.next_service_at).toLocaleDateString("ru-RU")}
                        warn={serviceDays != null && serviceDays <= 14}
                        sub={serviceDays != null
                            ? (serviceDays >= 0 ? `через ${serviceDays} дн.` : `просрочено на ${-serviceDays} дн.`)
                            : undefined}
                    />
                )}
                {asset.warranty_until && (
                    <InfoRow
                        icon={<ShieldCheck className="w-3 h-3 text-blue-400" />}
                        label="Гарантия"
                        value={new Date(asset.warranty_until).toLocaleDateString("ru-RU")}
                        warn={warrantyDays != null && warrantyDays < 0}
                        sub={warrantyDays != null
                            ? (warrantyDays >= 0 ? `${warrantyDays} дн. осталось` : "истекла")
                            : undefined}
                    />
                )}
                {asset.installed_at && (
                    <InfoRow
                        label="Установка"
                        value={new Date(asset.installed_at).toLocaleDateString("ru-RU")}
                    />
                )}
            </div>

            {asset.notes && (
                <p className="text-xs pt-3 leading-relaxed" style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}>
                    {asset.notes}
                </p>
            )}
        </div>
    );
}

function InfoRow({ icon, label, value, sub, warn }: { icon?: React.ReactNode; label: string; value: string; sub?: string; warn?: boolean }) {
    return (
        <div className="min-w-0">
            <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-0.5">
                {icon} {label}
            </span>
            <p className="text-xs text-slate-800 font-semibold">{value}</p>
            {sub && (
                <p className="text-[10px] mt-0.5 flex items-center gap-0.5 truncate" style={{ color: warn ? "#f87171" : "var(--muted)" }}>
                    {warn && <AlertTriangle className="w-3 h-3 shrink-0" />}
                    {sub}
                </p>
            )}
        </div>
    );
}

// ── Asset Form ───────────────────────────────────────────────────────────────

interface FormProps {
    buildingId: string;
    asset:      AssetRow | null;
    onSaved:    () => void;
    onCancel:   () => void;
}

function AssetForm({ buildingId, asset, onSaved, onCancel }: FormProps) {
    const { t } = useTranslation();
    const [name,            setName]            = useState(asset?.name ?? "");
    const [category,        setCategory]        = useState<AssetCategory>(asset?.category ?? "other");
    const [serialNumber,    setSerialNumber]    = useState(asset?.serial_number ?? "");
    const [manufacturer,    setManufacturer]    = useState(asset?.manufacturer ?? "");
    const [location,        setLocation]        = useState(asset?.location ?? "");
    const [installedAt,     setInstalledAt]     = useState(asset?.installed_at ?? "");
    const [warrantyUntil,   setWarrantyUntil]   = useState(asset?.warranty_until ?? "");
    const [nextServiceAt,   setNextServiceAt]   = useState(asset?.next_service_at ?? "");
    const [serviceInterval, setServiceInterval] = useState<number | "">(asset?.service_interval_days ?? "");
    const [notes,           setNotes]           = useState(asset?.notes ?? "");
    const [status,          setStatus]          = useState<AssetStatus>(asset?.status ?? "operational");
    const [saving,          setSaving]          = useState(false);
    const [error,           setError]           = useState<string | null>(null);

    async function save() {
        if (!name.trim()) {
            setError("Введите название оборудования");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const url    = asset ? `/pm/inventory/${asset.id}` : "/pm/inventory";
            const method = asset ? "PUT" : "POST";
            const body: Record<string, unknown> = {
                name:                  name.trim(),
                category,
                serial_number:         serialNumber.trim() || null,
                manufacturer:          manufacturer.trim() || null,
                location:              location.trim() || null,
                installed_at:          installedAt   || null,
                warranty_until:        warrantyUntil || null,
                next_service_at:       nextServiceAt || null,
                service_interval_days: serviceInterval === "" ? null : Number(serviceInterval),
                notes:                 notes.trim() || null,
                status,
            };
            if (!asset) body.pm_building_id = buildingId;
            const res  = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) {
                setError(json.error ?? "Ошибка сохранения");
                return;
            }
            onSaved();
        } catch (err) {
            setError("Произошла ошибка при сохранении");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--card)', border: "1px solid rgba(16,185,129,0.25)" }}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {asset ? "Редактировать оборудование" : "Добавить новое оборудование"}
                </h3>
                <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Название оборудования *">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="напр. Насос отопления Wilo"
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Категория">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as AssetCategory)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={fs()}
                    >
                        {ALL_CATS.map((c) => (
                            <option key={c} value={c} style={{ backgroundColor: 'var(--card)' }}>{t(CAT_KEYS[c] || 'pmInventory.catOther')}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Бренд / Производитель">
                    <input
                        value={manufacturer}
                        onChange={(e) => setManufacturer(e.target.value)}
                        placeholder="напр. Wilo SE"
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Серийный номер (S/N)">
                    <input
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="напр. SN-892183218"
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Расположение">
                    <input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="напр. Подвал, бойлерная №1"
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Статус">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as AssetStatus)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={fs()}
                    >
                        <option value="operational" style={{ backgroundColor: 'var(--card)' }}>В строю</option>
                        <option value="needs_service" style={{ backgroundColor: 'var(--card)' }}>Требует ТО</option>
                        <option value="broken" style={{ backgroundColor: 'var(--card)' }}>Сломан</option>
                        <option value="retired" style={{ backgroundColor: 'var(--card)' }}>Списан</option>
                    </select>
                </Field>
                <Field label="Дата установки">
                    <input
                        type="date"
                        value={installedAt}
                        onChange={(e) => setInstalledAt(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={{ ...fs() }}
                    />
                </Field>
                <Field label="Гарантия до">
                    <input
                        type="date"
                        value={warrantyUntil}
                        onChange={(e) => setWarrantyUntil(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={{ ...fs() }}
                    />
                </Field>
                <Field label="Следующее плановое ТО">
                    <input
                        type="date"
                        value={nextServiceAt}
                        onChange={(e) => setNextServiceAt(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={{ ...fs() }}
                    />
                </Field>
                <Field label="Интервал ТО в днях">
                    <input
                        type="number"
                        min={0}
                        value={serviceInterval}
                        onChange={(e) => setServiceInterval(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
            </div>

            <Field label="Заметки по обслуживанию">
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Особенности эксплуатации, контакты мастеров по ТО..."
                    className="w-full rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none resize-none placeholder:text-slate-400"
                    style={fs()}
                />
            </Field>

            {error && <p className="text-xs text-red-400 font-semibold">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-slate-100 transition-all"
                >
                    Отмена
                </button>
                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 disabled:opacity-50 transition-all"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)" }}
                >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Сохранить оборудование
                </button>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="w-full">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1.5">
                {label}
            </span>
            {children}
        </div>
    );
}

function fs() {
    return { backgroundColor: 'var(--card)', border: '1px solid var(--border)' };
}


