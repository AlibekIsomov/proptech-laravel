import { useState, useMemo, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import {
    Plus, Loader2, Building, Edit2, X, AlertTriangle, CheckCircle2,
    CalendarCheck, Trees, Car, Home, DoorOpen, Layers, Hammer, Trash2,
} from "lucide-react";
import AppShell from "@/Components/AppShell";
import {
    PageHead, Stat, Btn, Badge, Field, TextInput, PmSelect, EmptyState,
} from "@/Components/pm/ui";
import type { BadgeTone } from "@/Components/pm/ui";

interface BuildingRow {
    id: string;
    name: string;
    pm_project_id: string;
}

interface Project {
    id: string;
    name: string;
    buildings: BuildingRow[];
}

type CommunalType =
    | "elevator" | "entrance" | "parking" | "playground"
    | "common_area" | "roof" | "facade" | "other";

type CommunalStatus = "operational" | "maintenance" | "broken" | "retired";

interface CommunalAssetRow {
    id:                    string;
    pm_building_id:        string;
    asset_type:            CommunalType;
    name:                  string;
    description:           string | null;
    status:                CommunalStatus;
    last_inspection_date:  string | null;
    next_inspection_date:  string | null;
}

interface Props {
    projects: Project[];
}

const TYPE_CONFIG: Record<CommunalType, { labelKey: string; icon: React.ElementType }> = {
    elevator:    { labelKey: "pmCommunal.typeElevator",    icon: Layers   },
    entrance:    { labelKey: "pmCommunal.typeEntrance",    icon: DoorOpen },
    parking:     { labelKey: "pmCommunal.typeParking",     icon: Car      },
    playground:  { labelKey: "pmCommunal.typePlayground",  icon: Trees    },
    common_area: { labelKey: "pmCommunal.typeCommonArea",  icon: Home     },
    roof:        { labelKey: "pmCommunal.typeRoof",        icon: Building },
    facade:      { labelKey: "pmCommunal.typeFacade",      icon: Hammer   },
    other:       { labelKey: "pmCommunal.typeOther",       icon: Building },
};
const ALL_TYPES = Object.keys(TYPE_CONFIG) as CommunalType[];

const STATUS_TONE: Record<CommunalStatus, BadgeTone> = {
    operational: 'ok',
    maintenance: 'warn',
    broken:      'danger',
    retired:     'neutral',
};

export default function CommunalIndex({ projects }: Props) {
    const { t } = useTranslation();
    const [selectedProj, setSelectedProj] = useState("");
    const [selectedBldg, setSelectedBldg] = useState("");
    const [assets,       setAssets]       = useState<CommunalAssetRow[]>([]);
    const [loading,      setLoading]      = useState(false);
    const [editing,      setEditing]      = useState<CommunalAssetRow | null>(null);
    const [showForm,     setShowForm]     = useState(false);
    const [typeFilter,   setTypeFilter]   = useState<CommunalType | "all">("all");

    useEffect(() => {
        if (projects && projects.length > 0) setSelectedProj(projects[0].id);
    }, [projects]);

    const buildings = useMemo(() => {
        const proj = projects.find((p) => p.id === selectedProj);
        return proj ? proj.buildings : [];
    }, [selectedProj, projects]);

    useEffect(() => {
        if (buildings.length > 0) setSelectedBldg(buildings[0].id);
        else setSelectedBldg("");
    }, [buildings]);

    const loadAssets = async () => {
        if (!selectedBldg) { setAssets([]); return; }
        setLoading(true);
        try {
            const res  = await fetch(`/pm/communal?pm_building_id=${selectedBldg}`, {
                headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
            });
            const json = await res.json();
            const list = json.assets || [];
            const rankOf = (s: CommunalStatus) => ({ broken: 0, maintenance: 1, operational: 2, retired: 3 }[s] ?? 9);
            list.sort((a: CommunalAssetRow, b: CommunalAssetRow) => rankOf(a.status) - rankOf(b.status) || a.name.localeCompare(b.name));
            setAssets(list);
        } catch (err) {
            console.error("Failed to load communal assets:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAssets(); }, [selectedBldg]);

    const filtered = useMemo(() => {
        if (typeFilter === "all") return assets;
        return assets.filter((a) => a.asset_type === typeFilter);
    }, [assets, typeFilter]);

    const stats = useMemo(() => {
        let ok = 0, maint = 0, broken = 0, dueSoon = 0;
        const in30 = Date.now() + 30 * 24 * 3600 * 1000;
        for (const a of assets) {
            if (a.status === "broken") broken++;
            else if (a.status === "maintenance") maint++;
            else if (a.status === "operational") ok++;
            if (a.next_inspection_date) {
                const ts = new Date(a.next_inspection_date).getTime();
                if (ts <= in30 && a.status !== "retired") dueSoon++;
            }
        }
        return { ok, maint, broken, dueSoon, total: assets.length };
    }, [assets]);

    function openCreate() { setEditing(null); setShowForm(true); }
    function openEdit(a: CommunalAssetRow) { setEditing(a); setShowForm(true); }

    async function markInspectedToday(a: CommunalAssetRow) {
        const today = new Date().toISOString().slice(0, 10);
        setAssets((rows) => rows.map((r) => (r.id === a.id ? { ...r, last_inspection_date: today } : r)));
        try {
            await fetch(`/pm/communal/${a.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json", "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                },
                body: JSON.stringify({ last_inspection_date: today }),
            });
            loadAssets();
        } catch (err) { console.error("Failed to quick inspect:", err); }
    }

    async function handleDelete(id: string) {
        if (!confirm(t('pmCommunal.confirmDelete'))) return;
        try {
            await fetch(`/pm/communal/${id}`, {
                method: "DELETE",
                headers: {
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                }
            });
            loadAssets();
        } catch (err) { console.error("Failed to delete asset:", err); }
    }

    return (
        <AppShell>
            <div className="page">
                <PageHead
                    eyebrow="Property Management"
                    title={t('pmCommunal.title')}
                    sub={t('pmCommunal.subtitle')}
                    actions={
                        <Btn variant="primary" icon={Plus} disabled={!selectedBldg} onClick={openCreate}>
                            {t('pmCommunal.addAsset')}
                        </Btn>
                    }
                />

                {/* Selectors */}
                <div className="card card-pad" style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
                        <Field label={t('pmCommunal.project')}>
                            <PmSelect value={selectedProj} onChange={(e) => setSelectedProj(e.target.value)}>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </PmSelect>
                        </Field>
                        <Field label={t('pmCommunal.building')}>
                            <PmSelect value={selectedBldg} disabled={buildings.length === 0} onChange={(e) => setSelectedBldg(e.target.value)}>
                                {buildings.length === 0 && <option value="">Binolar yo'q</option>}
                                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </PmSelect>
                        </Field>
                        <Field label={t('pmCommunal.assetType')}>
                            <PmSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as CommunalType | "all")}>
                                <option value="all">{t('pmCommunal.filterAll')}</option>
                                {ALL_TYPES.map((tk) => <option key={tk} value={tk}>{t(TYPE_CONFIG[tk].labelKey)}</option>)}
                            </PmSelect>
                        </Field>
                    </div>
                </div>

                {/* Stats */}
                <div className="stat-grid" style={{ marginBottom: 24 }}>
                    <Stat label={t('pmCommunal.totalAssets')} value={stats.total}   icon={Building as any} tone="neutral" />
                    <Stat label={t('pmCommunal.operational')} value={stats.ok}      icon={CheckCircle2}    tone="ok"      />
                    <Stat label={t('pmCommunal.maintenance')} value={stats.dueSoon} icon={AlertTriangle as any} tone="warn" />
                    <Stat label={t('pmCommunal.brokenCount')} value={stats.broken}  icon={AlertTriangle as any} tone="danger" />
                </div>

                {/* Assets grid */}
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                        <Loader2 className="ic" style={{ color: 'var(--brand)', width: 28, height: 28 }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon={Building as any} title={t('pmCommunal.noAssets')}
                        action={selectedBldg ? <Btn variant="primary" icon={Plus} onClick={openCreate}>{t('pmCommunal.addAsset')}</Btn> : undefined} />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                        {filtered.map((a) => (
                            <CommunalCard
                                key={a.id}
                                asset={a}
                                onEdit={() => openEdit(a)}
                                onDelete={() => handleDelete(a.id)}
                                onMarkInspected={() => markInspectedToday(a)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Asset form modal */}
            {showForm && selectedBldg && (
                <CommunalFormModal
                    buildingId={selectedBldg}
                    asset={editing}
                    onSaved={() => { setShowForm(false); loadAssets(); }}
                    onCancel={() => setShowForm(false)}
                />
            )}
        </AppShell>
    );
}

// ── Communal Card ─────────────────────────────────────────────────────────────

interface CardProps {
    asset: CommunalAssetRow;
    onEdit: () => void;
    onDelete: () => void;
    onMarkInspected: () => void;
}

function CommunalCard({ asset, onEdit, onDelete, onMarkInspected }: CardProps) {
    const { t } = useTranslation();
    const TypeIcon = (TYPE_CONFIG[asset.asset_type] || TYPE_CONFIG.other).icon;

    const nextDays = asset.next_inspection_date
        ? Math.floor((new Date(asset.next_inspection_date).getTime() - Date.now()) / (24 * 3600 * 1000))
        : null;
    const overdue = nextDays != null && nextDays < 0;
    const dueSoon = nextDays != null && nextDays >= 0 && nextDays <= 30;

    return (
        <div className="card card-pad" style={{ borderColor: overdue ? 'color-mix(in srgb, var(--danger) 30%, transparent)' : undefined }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 10, flexShrink: 0, backgroundColor: 'var(--brand-tint)', border: '1px solid color-mix(in srgb, var(--brand) 20%, transparent)' }}>
                    <TypeIcon className="ic" style={{ color: 'var(--brand)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t(TYPE_CONFIG[asset.asset_type]?.labelKey || 'pmCommunal.typeOther')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Badge tone={STATUS_TONE[asset.status]}>{t(`pmCommunal.status${asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}`)}</Badge>
                    <button className="icon-act" onClick={onEdit} title={t('common.edit')}><Edit2 className="ic" /></button>
                    <button className="icon-act" onClick={onDelete} title={t('common.delete')} style={{ color: 'var(--danger)' }}><Trash2 className="ic" /></button>
                </div>
            </div>

            {asset.description && (
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, lineHeight: 1.5 }}>{asset.description}</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 14px', borderRadius: 10, backgroundColor: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 14 }}>
                <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>{t('pmCommunal.lastInspection')}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                        {asset.last_inspection_date ? new Date(asset.last_inspection_date).toLocaleDateString('ru-RU') : '—'}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, color: 'var(--text-3)', marginBottom: 4 }}>{t('pmCommunal.nextInspection')}</div>
                    {asset.next_inspection_date ? (
                        <>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{new Date(asset.next_inspection_date).toLocaleDateString('ru-RU')}</div>
                            <div style={{ fontSize: 10, marginTop: 2, display: 'flex', alignItems: 'center', gap: 3, color: overdue ? 'var(--danger)' : dueSoon ? 'var(--warn)' : 'var(--text-3)' }}>
                                {overdue && <AlertTriangle className="ic" style={{ width: 10, height: 10 }} />}
                                {overdue ? `${-(nextDays!)} kun kechikdi` : nextDays != null ? `${nextDays} kun qoldi` : ''}
                            </div>
                        </>
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>—</div>
                    )}
                </div>
            </div>

            <Btn variant="soft" size="sm" icon={CheckCircle2} onClick={onMarkInspected}>
                {t('pmCommunal.markInspected')}
            </Btn>
        </div>
    );
}

// ── Communal Form Modal ───────────────────────────────────────────────────────

interface FormModalProps {
    buildingId: string;
    asset:      CommunalAssetRow | null;
    onSaved:    () => void;
    onCancel:   () => void;
}

function CommunalFormModal({ buildingId, asset, onSaved, onCancel }: FormModalProps) {
    const { t } = useTranslation();
    const [name,        setName]        = useState(asset?.name ?? "");
    const [assetType,   setAssetType]   = useState<CommunalType>(asset?.asset_type ?? "entrance");
    const [description, setDescription] = useState(asset?.description ?? "");
    const [status,      setStatus]      = useState<CommunalStatus>(asset?.status ?? "operational");
    const [lastInsp,    setLastInsp]    = useState(asset?.last_inspection_date ?? "");
    const [nextInsp,    setNextInsp]    = useState(asset?.next_inspection_date ?? "");
    const [saving,      setSaving]      = useState(false);
    const [error,       setError]       = useState<string | null>(null);

    async function save() {
        if (!name.trim()) { setError(t('pmCommunal.nameRequired')); return; }
        setSaving(true);
        setError(null);
        try {
            const url    = asset ? `/pm/communal/${asset.id}` : "/pm/communal";
            const method = asset ? "PUT" : "POST";
            const body: Record<string, unknown> = {
                name: name.trim(), asset_type: assetType,
                description: description.trim() || null, status,
                last_inspection_date: lastInsp || null,
                next_inspection_date: nextInsp || null,
            };
            if (!asset) body.pm_building_id = buildingId;
            const res  = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json", "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) { setError(json.error ?? t('pmCommunal.saveError')); return; }
            onSaved();
        } catch {
            setError(t('pmCommunal.saveError'));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="scrim show" onClick={onCancel}>
            <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                onClick={e => e.stopPropagation()}>
                <div className="card card-pad" style={{ width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <h2 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>
                            {asset ? t('pmCommunal.editAsset') : t('pmCommunal.newAsset')}
                        </h2>
                        <button className="drawer-close" onClick={onCancel}><X className="ic" /></button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <Field label={t('pmCommunal.assetName')}>
                            <input className="input" value={name} onChange={(e) => setName(e.target.value)}
                                placeholder={t('pmCommunal.assetNamePlaceholder')} />
                        </Field>
                        <Field label={t('pmCommunal.assetType')}>
                            <PmSelect value={assetType} onChange={(e) => setAssetType(e.target.value as CommunalType)}>
                                {ALL_TYPES.map((tk) => <option key={tk} value={tk}>{t(TYPE_CONFIG[tk].labelKey)}</option>)}
                            </PmSelect>
                        </Field>
                        <Field label={t('pmCommunal.statusLabel')}>
                            <PmSelect value={status} onChange={(e) => setStatus(e.target.value as CommunalStatus)}>
                                <option value="operational">{t('pmCommunal.statusOperational')}</option>
                                <option value="maintenance">{t('pmCommunal.statusMaintenance')}</option>
                                <option value="broken">{t('pmCommunal.statusBroken')}</option>
                                <option value="retired">{t('pmCommunal.statusRetired')}</option>
                            </PmSelect>
                        </Field>
                        <div />
                        <Field label={t('pmCommunal.lastInspection')}>
                            <input className="input" type="date" value={lastInsp} onChange={(e) => setLastInsp(e.target.value)} />
                        </Field>
                        <Field label={t('pmCommunal.nextInspection')}>
                            <input className="input" type="date" value={nextInsp} onChange={(e) => setNextInsp(e.target.value)} />
                        </Field>
                    </div>

                    <div style={{ marginTop: 14 }}>
                        <Field label={t('pmCommunal.description')}>
                            <textarea className="input" rows={3} value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('pmCommunal.descriptionPlaceholder')}
                                style={{ resize: 'none' }} />
                        </Field>
                    </div>

                    {error && <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginTop: 8 }}>{error}</p>}

                    <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                        <Btn variant="ghost" block type="button" onClick={onCancel}>{t('common.cancel')}</Btn>
                        <Btn variant="primary" block type="button" disabled={saving} icon={saving ? Loader2 : CalendarCheck as any} onClick={save}>
                            {t('pmCommunal.save')}
                        </Btn>
                    </div>
                </div>
            </div>
        </div>
    );
}
