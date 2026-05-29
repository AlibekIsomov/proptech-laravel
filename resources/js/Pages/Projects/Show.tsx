import { useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import {
    ArrowLeft, Plus, Building2, MapPin, Layers,
    Loader2, X, ChevronRight, ChevronDown, ChevronUp,
    Zap
} from "lucide-react";
import AppShell from "@/Components/AppShell";
import FloorPlan from "@/Components/FloorPlan";

interface Project {
    id: string;
    name: string;
    location: string | null;
    created_at: string;
}

interface Building {
    id: string;
    project_id: string;
    name: string;
    created_at: string;
}

interface Props {
    project: Project;
    buildings: Building[];
    aptCounts: Record<string, number>;
}

export default function ProjectShow({ project, buildings, aptCounts }: Props) {
    const { auth } = usePage<any>().props;
    const canEdit = ["super_admin", "company_admin"].includes(auth.user?.role);

    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [fpRefreshKey,  setFpRefreshKey]  = useState(0);

    // ── Add building modal ─────────────────────────────────────────────────────
    const [showAddBuilding,   setShowAddBuilding]   = useState(false);
    const [buildingName,      setBuildingName]      = useState("");
    const [addingBuilding,    setAddingBuilding]    = useState(false);

    // ── Bulk generate modal ────────────────────────────────────────────────────
    const [showBulkGen,    setShowBulkGen]    = useState(false);
    const [bulkBuildingId, setBulkBuildingId] = useState("");
    const [bulkFloors,     setBulkFloors]     = useState("9");
    const [bulkAptsPerFloor, setBulkAptsPerFloor] = useState("4");
    const [bulkRooms,      setBulkRooms]      = useState("2");
    const [bulkArea,       setBulkArea]       = useState("60");
    const [bulkBasePrice,  setBulkBasePrice]  = useState("75000");
    const [generating,     setGenerating]     = useState(false);
    const [genError,       setGenError]       = useState<string | null>(null);

    // ── Add building ───────────────────────────────────────────────────────────

    function handleAddBuilding(e: React.FormEvent) {
        e.preventDefault();
        if (!buildingName.trim()) return;
        setAddingBuilding(true);

        router.post("/buildings", {
            project_id: project.id,
            name: buildingName.trim()
        }, {
            onFinish: () => {
                setAddingBuilding(false);
                setBuildingName("");
                setShowAddBuilding(false);
            }
        });
    }

    // ── Bulk generate ──────────────────────────────────────────────────────────

    function handleBulkGenerate(e: React.FormEvent) {
        e.preventDefault();
        setGenError(null);
        const floorsNum = parseInt(bulkFloors);
        const aptsNum = parseInt(bulkAptsPerFloor);
        if (isNaN(floorsNum) || floorsNum < 1) {
            setGenError("Введите корректное кол-во этажей.");
            return;
        }
        if (isNaN(aptsNum) || aptsNum < 1) {
            setGenError("Введите количество квартир на этаж.");
            return;
        }

        setGenerating(true);
        router.post("/apartments/bulk-generate", {
            building_id: bulkBuildingId,
            floors: floorsNum,
            apartments_per_floor: aptsNum,
            rooms: parseInt(bulkRooms) || 1,
            area: parseFloat(bulkArea) || 0,
            base_price: parseFloat(bulkBasePrice) || 0,
        }, {
            onSuccess: () => {
                setGenerating(false);
                setShowBulkGen(false);
                setFpRefreshKey((k) => k + 1);
            },
            onFailure: () => {
                setGenerating(false);
                setGenError("Не удалось выполнить генерацию");
            }
        });
    }

    return (
        <AppShell>
            <Head title={`${project.name} - Детали проекта`} />

            {/* Top bar */}
            <header className="sticky top-0 z-20 flex items-center gap-3 px-6 h-14 border-b shrink-0"
                style={{ backgroundColor: "#0d1117", borderColor: "rgba(255,255,255,0.06)" }}>
                <button onClick={() => router.visit("/projects")}
                    className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: "#64748b" }}>
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs" style={{ color: "#475569" }}>Проекты</span>
                    <ChevronRight className="w-3 h-3 shrink-0" style={{ color: "#334155" }} />
                    <span className="text-sm font-semibold text-white truncate">
                        {project.name}
                    </span>
                </div>
            </header>

            <main className="px-6 py-6 w-full space-y-6">
                {/* Project info */}
                <div className="rounded-2xl border p-5 flex items-center gap-4"
                    style={{ backgroundColor: "#0d1117", borderColor: "rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
                        style={{ backgroundColor: "rgba(99,102,241,0.12)" }}>
                        <Building2 className="w-6 h-6" style={{ color: "#6366f1" }} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-lg font-bold text-white">{project.name}</h1>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3" style={{ color: "#475569" }} />
                            <span className="text-xs" style={{ color: "#64748b" }}>{project.location || "Нет адреса"}</span>
                        </div>
                    </div>
                    <div className="ml-auto flex gap-5 text-center shrink-0">
                        <div>
                            <p className="text-xl font-bold text-white">{buildings.length}</p>
                            <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Корпусов</p>
                        </div>
                    </div>
                </div>

                {/* Buildings */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-white">Корпуса</h2>
                        {canEdit && (
                            <button
                                onClick={() => { setBuildingName(""); setShowAddBuilding(true); }}
                                className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-xl transition-all hover:opacity-90"
                                style={{ backgroundColor: "#6366f1" }}>
                                <Plus className="w-3.5 h-3.5" />Добавить корпус
                            </button>
                        )}
                    </div>

                    {buildings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 gap-3 rounded-2xl border border-dashed"
                            style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.01)" }}>
                            <Building2 className="w-8 h-8" style={{ color: "rgba(255,255,255,0.15)" }} />
                            <p className="text-xs text-slate-500">Нет корпусов. Добавьте первый корпус для проекта.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                            {buildings.map((b) => {
                                const active = selectedBuilding?.id === b.id;
                                const count = aptCounts[b.id] || 0;
                                return (
                                    <div key={b.id} className="rounded-2xl border overflow-hidden transition-all duration-300"
                                        style={{
                                            borderColor: active ? "#6366f1" : "rgba(255,255,255,0.06)",
                                            backgroundColor: active ? "rgba(99,102,241,0.05)" : "#0d1117"
                                        }}>
                                        {/* Building toggle */}
                                        <button onClick={() => setSelectedBuilding(active ? null : b)}
                                            className="w-full p-4 text-left flex items-center justify-between gap-2 hover:bg-white/[0.01] transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                                                    style={{ backgroundColor: active ? "#6366f1" : "rgba(99,102,241,0.12)" }}>
                                                    <Building2 className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">{b.name}</p>
                                                    <p className="text-[10px] mt-0.5 text-slate-500 font-semibold">
                                                        {count} квартир
                                                    </p>
                                                </div>
                                            </div>
                                            {active
                                                ? <ChevronUp   className="w-4 h-4 shrink-0" style={{ color: "#6366f1" }} />
                                                : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />}
                                        </button>

                                        {/* Action buttons (when selected) */}
                                        {active && canEdit && (
                                            <div className="px-3 pb-3 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                                                <div className="mt-3">
                                                    <button
                                                        onClick={() => { setBulkBuildingId(b.id); setGenError(null); setBulkFloors("9"); setBulkAptsPerFloor("4"); setShowBulkGen(true); }}
                                                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-colors hover:border-indigo-500/40"
                                                        style={{ borderColor: "rgba(255,255,255,0.08)", color: "#a5b4fc", backgroundColor: "rgba(99,102,241,0.05)" }}>
                                                        <Zap className="w-3.5 h-3.5 text-indigo-400" />
                                                        <span>Сгенерировать шахматку</span>
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
                    <div className="animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-sm font-semibold text-white">
                                Шахматка — {selectedBuilding.name}
                            </h2>
                        </div>
                        <FloorPlan building_id={selectedBuilding.id} refreshKey={fpRefreshKey} />
                    </div>
                )}
            </main>

            {/* Add building */}
            {showAddBuilding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(2px)" }}
                    onClick={(e) => e.target === e.currentTarget && setShowAddBuilding(false)}>
                    <div className="w-full max-w-sm rounded-2xl p-6"
                        style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.09)" }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-white">Добавить корпус</h2>
                            <button onClick={() => setShowAddBuilding(false)} style={{ color: "#475569" }}
                                className="hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddBuilding} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>Название корпуса</label>
                                <input type="text" required placeholder="напр. Корпус Б" value={buildingName}
                                    onChange={(e) => setBuildingName(e.target.value)}
                                    className="w-full rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                                    style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }} />
                            </div>

                            <button type="submit" disabled={addingBuilding}
                                className="w-full py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: "#6366f1" }}>
                                {addingBuilding && <Loader2 className="w-4 h-4 animate-spin" />}
                                Добавить
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk generate */}
            {showBulkGen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
                    style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(2px)" }}
                    onClick={(e) => e.target === e.currentTarget && setShowBulkGen(false)}>
                    <div className="w-full max-w-sm rounded-2xl p-6"
                        style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.09)" }}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-indigo-400" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Массовое создание</h2>
                            </div>
                            <button onClick={() => setShowBulkGen(false)} style={{ color: "#475569" }}
                                className="hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleBulkGenerate} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Этажей</label>
                                    <input type="number" min={1} required value={bulkFloors}
                                        onChange={(e) => setBulkFloors(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white outline-none"
                                        style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Квартир на этаж</label>
                                    <input type="number" min={1} required value={bulkAptsPerFloor}
                                        onChange={(e) => setBulkAptsPerFloor(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white outline-none"
                                        style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Комнат</label>
                                    <input type="number" min={1} required value={bulkRooms}
                                        onChange={(e) => setBulkRooms(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white outline-none"
                                        style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Площадь, м²</label>
                                    <input type="number" min={1} required value={bulkArea}
                                        onChange={(e) => setBulkArea(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-xs text-white outline-none"
                                        style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Базовая цена, $</label>
                                <input type="number" min={0} required value={bulkBasePrice}
                                    onChange={(e) => setBulkBasePrice(e.target.value)}
                                    className="w-full rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                                    style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }} />
                            </div>

                            {genError && <p className="text-xs text-red-400 font-semibold">{genError}</p>}

                            <button type="submit" disabled={generating}
                                className="w-full py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: "#6366f1" }}>
                                {generating && <Loader2 className="w-4 h-4 animate-spin" />}
                                Сгенерировать шахматку
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
