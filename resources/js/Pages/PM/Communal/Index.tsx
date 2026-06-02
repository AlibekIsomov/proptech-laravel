import { useState, useMemo, useEffect } from "react";
import { Head, router } from "@inertiajs/react";
import {
    Plus, Loader2, Building, Edit2, X, AlertTriangle, CheckCircle2,
    CalendarCheck, Trees, Car, Home, DoorOpen, Layers, Hammer, Trash2
} from "lucide-react";
import AppShell from "@/Components/AppShell";

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
    pm_building_id:           string;
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

const TYPE_RU: Record<CommunalType, { label: string; icon: React.ElementType }> = {
    elevator:    { label: "Лифт",            icon: Layers   },
    entrance:    { label: "Подъезд",         icon: DoorOpen },
    parking:     { label: "Парковка",        icon: Car      },
    playground:  { label: "Детская площадка", icon: Trees    },
    common_area: { label: "Общая зона",      icon: Home     },
    roof:        { label: "Кровля",          icon: Building },
    facade:      { label: "Фасад",           icon: Hammer   },
    other:       { label: "Другое",          icon: Building },
};
const ALL_TYPES = Object.keys(TYPE_RU) as CommunalType[];

const STATUS_META: Record<CommunalStatus, { label: string; bg: string; fg: string; border: string; rank: number }> = {
    broken:      { label: "Сломан",       bg: "rgba(239,68,68,0.10)",  fg: "#f87171", border: "rgba(239,68,68,0.30)",  rank: 0 },
    maintenance: { label: "На обслуж.",   bg: "rgba(251,191,36,0.10)", fg: "#fbbf24", border: "rgba(251,191,36,0.30)", rank: 1 },
    operational: { label: "В порядке",    bg: "rgba(16,185,129,0.10)", fg: "#34d399", border: "rgba(16,185,129,0.30)", rank: 2 },
    retired:     { label: "Списано",      bg: "var(--border)", fg: "var(--muted)", border: "var(--border)", rank: 3 },
};

export default function CommunalIndex({ projects }: Props) {
    const [selectedProj, setSelectedProj] = useState("");
    const [selectedBldg, setSelectedBldg] = useState("");
    const [assets,       setAssets]       = useState<CommunalAssetRow[]>([]);
    const [loading,      setLoading]      = useState(false);
    const [editing,      setEditing]      = useState<CommunalAssetRow | null>(null);
    const [showForm,     setShowForm]     = useState(false);
    const [typeFilter,   setTypeFilter]   = useState<CommunalType | "all">("all");

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
            const res = await fetch(`/pm/communal?pm_building_id=${selectedBldg}`, {
                headers: {
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                }
            });
            const json = await res.json();
            const list = json.assets || [];
            list.sort((a: CommunalAssetRow, b: CommunalAssetRow) => STATUS_META[a.status].rank - STATUS_META[b.status].rank || a.name.localeCompare(b.name));
            setAssets(list);
        } catch (err) {
            console.error("Failed to load communal assets:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssets();
    }, [selectedBldg]);

    const filtered = useMemo(() => {
        if (typeFilter === "all") return assets;
        return assets.filter((a) => a.asset_type === typeFilter);
    }, [assets, typeFilter]);

    const stats = useMemo(() => {
        let ok = 0, maint = 0, broken = 0, dueSoon = 0;
        const now = Date.now();
        const in30 = now + 30 * 24 * 3600 * 1000;
        for (const a of assets) {
            if (a.status === "broken") broken++;
            else if (a.status === "maintenance") maint++;
            else if (a.status === "operational") ok++;
            if (a.next_inspection_date) {
                const t = new Date(a.next_inspection_date).getTime();
                if (t <= in30 && a.status !== "retired") dueSoon++;
            }
        }
        return { ok, maint, broken, dueSoon, total: assets.length };
    }, [assets]);

    function openCreate() {
        setEditing(null);
        setShowForm(true);
    }
    function openEdit(a: CommunalAssetRow) {
        setEditing(a);
        setShowForm(true);
    }

    async function markInspectedToday(a: CommunalAssetRow) {
        const today = new Date().toISOString().slice(0, 10);
        setAssets((rows) => rows.map((r) => (r.id === a.id ? { ...r, last_inspection_date: today } : r)));
        try {
            await fetch(`/pm/communal/${a.id}`, {
                method:  "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                },
                body: JSON.stringify({ last_inspection_date: today }),
            });
            loadAssets();
        } catch (err) {
            console.error("Failed to quick inspect asset:", err);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Вы уверены, что хотите удалить этот коммунальный объект?")) return;
        try {
            await fetch(`/pm/communal/${id}`, {
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

    return (
        <AppShell>
            <Head title="Реестр общего имущества - PM Portal" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#34d399" }}>
                        Property Management
                    </p>
                    <h1 className="text-2xl font-bold text-slate-800 mt-1">Общее имущество</h1>
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                        Подъезды, фасады, кровли, детские площадки здания и инспекции
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    disabled={!selectedBldg}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-white flex items-center gap-2 disabled:opacity-50 transition-all hover:opacity-90 animate-fade-in"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)" }}
                >
                    <Plus className="w-4 h-4" /> Добавить
                </button>
            </div>

            <div className="mt-6 space-y-6">
                {/* Selectors */}
                <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl animate-fade-in" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Проект</span>
                        <select
                            value={selectedProj}
                            onChange={(e) => setSelectedProj(e.target.value)}
                            className="rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none cursor-pointer"
                            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                        >
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Корпус</span>
                        <select
                            value={selectedBldg}
                            onChange={(e) => setSelectedBldg(e.target.value)}
                            disabled={buildings.length === 0}
                            className="rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none cursor-pointer disabled:opacity-50"
                            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                        >
                            {buildings.length === 0 && <option value="">Нет корпусов</option>}
                            {buildings.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 min-w-[180px]">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Тип</span>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as CommunalType | "all")}
                            className="rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none cursor-pointer"
                            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
                        >
                            <option value="all">Все типы</option>
                            {ALL_TYPES.map((t) => (
                                <option key={t} value={t}>{TYPE_RU[t].label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in">
                    <SummaryCard label="Всего объектов" value={stats.total} accent="var(--muted)" />
                    <SummaryCard label="В порядке" value={stats.ok} accent="#34d399" />
                    <SummaryCard label="Требует ТО / Сроки" value={stats.dueSoon} accent="#fbbf24" />
                    <SummaryCard label="В аварии" value={stats.broken} accent="#f87171" />
                </div>

                {showForm && selectedBldg && (
                    <CommunalForm
                        buildingId={selectedBldg}
                        asset={editing}
                        onSaved={() => { setShowForm(false); loadAssets(); }}
                        onCancel={() => setShowForm(false)}
                    />
                )}

                {loading ? (
                    <div className="rounded-2xl p-12 flex items-center justify-center" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: "var(--muted)" }}>
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#34d399" }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="rounded-2xl p-16 text-center border border-dashed animate-fade-in" style={{ backgroundColor: "var(--border)", borderColor: 'var(--border)', color: "var(--muted)" }}>
                        <Building className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--border)" }} />
                        <p className="text-sm font-medium text-slate-800">Объекты не зарегистрированы</p>
                        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Зарегистрируйте подъезды, кровлю, детские площадки для ведения лога инспекций</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
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
        </AppShell>
    );
}

// ── Communal Card ────────────────────────────────────────────────────────────

interface CardProps {
    asset: CommunalAssetRow;
    onEdit: () => void;
    onDelete: () => void;
    onMarkInspected: () => void;
}

function CommunalCard({ asset, onEdit, onDelete, onMarkInspected }: CardProps) {
    const meta = STATUS_META[asset.status] || STATUS_META.operational;
    const TypeIcon = (TYPE_RU[asset.asset_type] || TYPE_RU.other).icon;

    const nextDays = asset.next_inspection_date
        ? Math.floor((new Date(asset.next_inspection_date).getTime() - Date.now()) / (24 * 3600 * 1000))
        : null;
    const overdue  = nextDays != null && nextDays < 0;
    const dueSoon  = nextDays != null && nextDays >= 0 && nextDays <= 30;

    return (
        <div className="rounded-2xl p-5 space-y-4 relative overflow-hidden transition-all" style={{ backgroundColor: 'var(--card)', border: `1px solid ${overdue ? "rgba(239,68,68,0.25)" : "var(--border)"}` }}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <TypeIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-800 truncate">{asset.name}</h3>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">{TYPE_RU[asset.asset_type]?.label || asset.asset_type}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: meta.bg, color: meta.fg, border: `1px solid ${meta.border}` }}>
                        {meta.label}
                    </span>
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

            {asset.description && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                    {asset.description}
                </p>
            )}

            <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl pt-3.5" style={{ backgroundColor: 'var(--bg)', border: "1px solid var(--border)" }}>
                <div>
                    <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-0.5">Последняя инспекция</span>
                    <p className="text-xs text-slate-800 font-semibold">
                        {asset.last_inspection_date
                            ? new Date(asset.last_inspection_date).toLocaleDateString("ru-RU")
                            : <span className="text-slate-600">—</span>}
                    </p>
                </div>
                <div>
                    <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-0.5">Следующая инспекция</span>
                    {asset.next_inspection_date ? (
                        <>
                            <p className="text-xs text-slate-800 font-semibold">
                                {new Date(asset.next_inspection_date).toLocaleDateString("ru-RU")}
                            </p>
                            <p className="text-[10px] mt-0.5 flex items-center gap-0.5" style={{ color: overdue ? "#f87171" : dueSoon ? "#fbbf24" : "var(--muted)" }}>
                                {overdue && <AlertTriangle className="w-3 h-3 shrink-0" />}
                                {overdue
                                    ? `просрочено на ${-(nextDays!)} дн.`
                                    : nextDays != null
                                        ? `через ${nextDays} дн.`
                                        : ""}
                            </p>
                        </>
                    ) : (
                        <p className="text-xs text-slate-600 font-semibold">—</p>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-1">
                <button
                    onClick={onMarkInspected}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg text-emerald-400 hover:text-white border border-emerald-500/20 hover:bg-emerald-500/10 transition-all"
                >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Инспектировать сегодня
                </button>
            </div>
        </div>
    );
}

// ── Communal Form ─────────────────────────────────────────────────────────────

interface FormProps {
    buildingId: string;
    asset:      CommunalAssetRow | null;
    onSaved:    () => void;
    onCancel:   () => void;
}

function CommunalForm({ buildingId, asset, onSaved, onCancel }: FormProps) {
    const [name,        setName]        = useState(asset?.name ?? "");
    const [assetType,   setAssetType]   = useState<CommunalType>(asset?.asset_type ?? "entrance");
    const [description, setDescription] = useState(asset?.description ?? "");
    const [status,      setStatus]      = useState<CommunalStatus>(asset?.status ?? "operational");
    const [lastInsp,    setLastInsp]    = useState(asset?.last_inspection_date ?? "");
    const [nextInsp,    setNextInsp]    = useState(asset?.next_inspection_date ?? "");
    const [saving,      setSaving]      = useState(false);
    const [error,       setError]       = useState<string | null>(null);

    async function save() {
        if (!name.trim()) {
            setError("Введите название объекта");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const url    = asset ? `/pm/communal/${asset.id}` : "/pm/communal";
            const method = asset ? "PUT" : "POST";
            const body: Record<string, unknown> = {
                name:                 name.trim(),
                asset_type:           assetType,
                description:          description.trim() || null,
                status,
                last_inspection_date: lastInsp || null,
                next_inspection_date: nextInsp || null,
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
                    {asset ? "Редактировать объект общего имущества" : "Новый объект общего имущества"}
                </h3>
                <button onClick={onCancel} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Название объекта общего имущества *">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="напр. Подъезд №3, парковка во дворе"
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none"
                        style={fs()}
                    />
                </Field>
                <Field label="Тип общего имущества">
                    <select
                        value={assetType}
                        onChange={(e) => setAssetType(e.target.value as CommunalType)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={fs()}
                    >
                        {ALL_TYPES.map((t) => (
                            <option key={t} value={t} style={{ backgroundColor: 'var(--card)' }}>
                                {TYPE_RU[t].label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Текущее состояние">
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as CommunalStatus)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={fs()}
                    >
                        <option value="operational" style={{ backgroundColor: 'var(--card)' }}>В порядке</option>
                        <option value="maintenance" style={{ backgroundColor: 'var(--card)' }}>На обслуживании</option>
                        <option value="broken" style={{ backgroundColor: 'var(--card)' }}>Сломан</option>
                        <option value="retired" style={{ backgroundColor: 'var(--card)' }}>Списано</option>
                    </select>
                </Field>
                <div className="hidden sm:block" />
                <Field label="Дата последней инспекции">
                    <input
                        type="date"
                        value={lastInsp}
                        onChange={(e) => setLastInsp(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={{ ...fs() }}
                    />
                </Field>
                <Field label="Дата следующей инспекции">
                    <input
                        type="date"
                        value={nextInsp}
                        onChange={(e) => setNextInsp(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer"
                        style={{ ...fs() }}
                    />
                </Field>
            </div>

            <Field label="Описание состояния / Заметки">
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Описание состояния, проведенных работ или необходимых мер..."
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
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarCheck className="w-3.5 h-3.5" />}
                    Сохранить объект
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

// ── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value, accent }: { label: string; value: number; accent: string }) {
    return (
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: accent }}>{label}</p>
            <p className="text-2xl text-slate-800 mt-2 font-bold font-mono" style={{ fontFamily: "var(--font-display)" }}>
                {value}
            </p>
        </div>
    );
}

