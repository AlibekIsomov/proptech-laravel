import { useState, useMemo, useEffect } from "react";
import { Head, router } from "@inertiajs/react";
import { Vote, Plus, Loader2, X, Lock, Trash2, CalendarClock, ChevronRight, Sparkles, Check } from "lucide-react";
import AppShell from "@/Components/AppShell";

interface Building {
    id: string;
    name: string;
    project_id: string;
}

interface Project {
    id: string;
    name: string;
    buildings: Building[];
}

interface PollOption {
    id: string;
    label: string;
}

type PollStatus = "open" | "closed" | "cancelled";

interface PollRow {
    id:          string;
    building_id: string;
    title:       string;
    description: string | null;
    options:     PollOption[];
    status:      PollStatus;
    quorum_pct:  number;
    closes_at:   string | null;
    ai_summary:  string | null;
    vote_counts: Record<string, number>;
    total_votes: number;
    created_at:  string;
}

interface Props {
    projects: Project[];
}

const STATUS_META: Record<PollStatus, { label: string; bg: string; fg: string; border: string }> = {
    open:      { label: "Идёт",     bg: "rgba(16,185,129,0.12)", fg: "#34d399", border: "rgba(16,185,129,0.35)" },
    closed:    { label: "Завершён", bg: "rgba(255,255,255,0.05)", fg: "rgba(255,255,255,0.6)", border: "rgba(255,255,255,0.10)" },
    cancelled: { label: "Отменён",  bg: "rgba(239,68,68,0.10)",  fg: "#f87171", border: "rgba(239,68,68,0.30)" },
};

export default function PollsIndex({ projects }: Props) {
    const [selectedProj, setSelectedProj] = useState("");
    const [selectedBldg, setSelectedBldg] = useState("");
    const [polls,        setPolls]        = useState<PollRow[]>([]);
    const [loading,      setLoading]      = useState(false);
    const [aptCount,     setAptCount]     = useState(0);
    const [creating,     setCreating]     = useState(false);

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

    const loadPolls = async () => {
        if (!selectedBldg) {
            setPolls([]);
            setAptCount(0);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/pm/polls?building_id=${selectedBldg}`, {
                headers: {
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                }
            });
            const json = await res.json();
            setPolls(json.polls || []);
            setAptCount(json.apartment_count || 0);
        } catch (err) {
            console.error("Failed to load polls:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPolls();
    }, [selectedBldg]);

    const changeStatus = async (id: string, status: PollStatus) => {
        try {
            setPolls((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
            await fetch(`/pm/polls/${id}`, {
                method:  "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                },
                body: JSON.stringify({ status }),
            });
            loadPolls();
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Вы уверены, что хотите удалить это голосование?")) return;
        try {
            await fetch(`/pm/polls/${id}`, {
                method: "DELETE",
                headers: {
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                }
            });
            loadPolls();
        } catch (err) {
            console.error("Failed to delete poll:", err);
        }
    };

    return (
        <AppShell>
            <Head title="Голосования ОСС - PM Portal" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div>
                    <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: "#34d399" }}>
                        Property Management
                    </p>
                    <h1 className="text-2xl font-bold text-white mt-1">Голосования ОСС</h1>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                        Общие собрания собственников, опросы и сбор голосов
                    </p>
                </div>
                <button
                    onClick={() => setCreating((c) => !c)}
                    disabled={!selectedBldg}
                    className="rounded-xl px-4 py-2.5 text-xs font-bold text-white flex items-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
                    style={{
                        background: creating
                            ? "rgba(255,255,255,0.05)"
                            : "linear-gradient(135deg, #10b981 0%, #14b8a6 100%)",
                    }}
                >
                    {creating ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {creating ? "Отмена" : "Создать опрос"}
                </button>
            </div>

            <div className="mt-6 space-y-6">
                {/* Selectors */}
                <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex flex-col gap-1 min-w-[200px]">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Проект</span>
                        <select
                            value={selectedProj}
                            onChange={(e) => setSelectedProj(e.target.value)}
                            className="rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
                            style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1 min-w-[200px]">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Корпус</span>
                        <select
                            value={selectedBldg}
                            onChange={(e) => setSelectedBldg(e.target.value)}
                            disabled={buildings.length === 0}
                            className="rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer disabled:opacity-50"
                            style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }}
                        >
                            {buildings.length === 0 && <option value="">Нет корпусов</option>}
                            {buildings.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {creating && selectedBldg && (
                    <CreatePollCard
                        buildingId={selectedBldg}
                        onCreated={() => { setCreating(false); loadPolls(); }}
                        onCancel={() => setCreating(false)}
                    />
                )}

                {loading ? (
                    <div className="rounded-2xl p-12 flex items-center justify-center" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#34d399" }} />
                    </div>
                ) : polls.length === 0 ? (
                    <div className="rounded-2xl p-16 text-center border border-dashed" style={{ backgroundColor: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
                        <Vote className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                        <p className="text-sm font-medium text-white">Голосований не найдено</p>
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Создайте первое собрание или опрос для этого здания</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {polls.map((p) => (
                            <PollCard key={p.id} poll={p} aptCount={aptCount} onStatusChange={changeStatus} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}

// ── Create Poll Card ────────────────────────────────────────────────────────

interface CreateProps {
    buildingId: string;
    onCreated: () => void;
    onCancel: () => void;
}

function CreatePollCard({ buildingId, onCreated, onCancel }: CreateProps) {
    const [title,       setTitle]       = useState("");
    const [description, setDescription] = useState("");
    const [options,     setOptions]     = useState<string[]>(["За", "Против", "Воздержался"]);
    const [quorum,      setQuorum]      = useState(50);
    const [closesAt,    setClosesAt]    = useState("");
    const [saving,      setSaving]      = useState(false);
    const [error,       setError]       = useState<string | null>(null);

    function setOpt(i: number, v: string) {
        setOptions((arr) => arr.map((x, idx) => (idx === i ? v : x)));
    }
    function addOpt() {
        setOptions((arr) => [...arr, ""]);
    }
    function removeOpt(i: number) {
        if (options.length <= 2) return;
        setOptions((arr) => arr.filter((_, idx) => idx !== i));
    }

    async function save() {
        setError(null);
        const cleanOpts = options
            .map((o, idx) => ({ id: String.fromCharCode(97 + idx), label: o.trim() }))
            .filter((o) => o.label);
        if (!title.trim()) {
            setError("Введите заголовок");
            return;
        }
        if (cleanOpts.length < 2) {
            setError("Минимум 2 варианта ответа");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/pm/polls", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                },
                body: JSON.stringify({
                    building_id: buildingId,
                    title:       title.trim(),
                    description: description.trim() || null,
                    options:     cleanOpts,
                    quorum_pct:  quorum,
                    closes_at:   closesAt ? new Date(closesAt).toISOString() : null,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                setError(json.error ?? "Ошибка сохранения");
                return;
            }
            onCreated();
        } catch (err) {
            setError("Произошла ошибка при сохранении");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-2xl p-6 space-y-4" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(16,185,129,0.25)" }}>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Новое голосование ОСС</h3>

            <div className="space-y-3">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Тема голосования (например: Установка видеонаблюдения)"
                    className="w-full rounded-xl px-4 py-2.5 text-xs text-white outline-none placeholder:text-slate-500"
                    style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }}
                />
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Подробное описание вопроса для собственников..."
                    rows={3}
                    className="w-full rounded-xl px-4 py-2.5 text-xs text-white outline-none resize-none placeholder:text-slate-500"
                    style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }}
                />
            </div>

            <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Варианты ответа</p>
                <div className="space-y-2">
                    {options.map((o, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <input
                                value={o}
                                onChange={(e) => setOpt(i, e.target.value)}
                                placeholder={`Вариант ${i + 1}`}
                                className="flex-1 rounded-xl px-3 py-2 text-xs text-white outline-none"
                                style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }}
                            />
                            <button
                                type="button"
                                onClick={() => removeOpt(i)}
                                disabled={options.length <= 2}
                                className="p-2 rounded-lg transition-colors hover:bg-red-500/10 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addOpt} className="mt-2 text-xs flex items-center gap-1 font-semibold text-emerald-400 hover:text-emerald-300">
                    <Plus className="w-3.5 h-3.5" /> Добавить вариант
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1.5">Кворум, %</span>
                    <input
                        type="number"
                        min={0} max={100}
                        value={quorum}
                        onChange={(e) => setQuorum(Math.max(0, Math.min(100, Number(e.target.value))))}
                        className="w-full rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                        style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)" }}
                    />
                </div>
                <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold block mb-1.5">Закрыть до</span>
                    <input
                        type="datetime-local"
                        value={closesAt}
                        onChange={(e) => setClosesAt(e.target.value)}
                        className="w-full rounded-xl px-3.5 py-2 text-xs text-white outline-none cursor-pointer"
                        style={{ backgroundColor: "#161b22", border: "1px solid rgba(255,255,255,0.08)", colorScheme: "dark" }}
                    />
                </div>
            </div>

            {error && <p className="text-xs text-red-400 font-medium">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-white/5 transition-all"
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
                    Запустить голосование
                </button>
            </div>
        </div>
    );
}

// ── Poll Card ────────────────────────────────────────────────────────────────

interface PollCardProps {
    poll: PollRow;
    aptCount: number;
    onStatusChange: (id: string, s: PollStatus) => void;
    onDelete: (id: string) => void;
}

function PollCard({ poll, aptCount, onStatusChange, onDelete }: PollCardProps) {
    const meta = STATUS_META[poll.status] || STATUS_META.open;
    const quorumThreshold = Math.ceil(aptCount * poll.quorum_pct / 100);
    const quorumPct = aptCount > 0 ? Math.min(100, (poll.total_votes / aptCount) * 100) : 0;
    const quorumMet = poll.total_votes >= quorumThreshold && quorumThreshold > 0;

    return (
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ backgroundColor: "#0d1117", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white">{poll.title}</h3>
                    {poll.description && (
                        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{poll.description}</p>
                    )}
                    {poll.closes_at && (
                        <div className="flex items-center gap-1 mt-2.5 text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                            <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Активно до: {new Date(poll.closes_at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: meta.bg, color: meta.fg, border: `1px solid ${meta.border}` }}>
                        {meta.label}
                    </span>
                    <button
                        onClick={() => onDelete(poll.id)}
                        className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                        title="Удалить"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Quorum bar */}
            <div className="mb-5 p-3.5 rounded-xl" style={{ backgroundColor: "#080b14", border: "1px solid rgba(255,255,255,0.03)" }}>
                <div className="flex items-center justify-between text-[11px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                    <span>Кворум {poll.quorum_pct}%</span>
                    <span>
                        {poll.total_votes} из {aptCount} квартир
                        {quorumMet ? (
                            <span style={{ color: "#34d399" }}> · кворум собран</span>
                        ) : (
                            <span style={{ color: "#fbbf24" }}> · сбор голосов</span>
                        )}
                    </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                    <div
                        className="h-full transition-all duration-500"
                        style={{
                            width: `${quorumPct}%`,
                            background: quorumMet
                                ? "linear-gradient(90deg, #10b981 0%, #14b8a6 100%)"
                                : "linear-gradient(90deg, #fbbf24 0%, #f97316 100%)",
                        }}
                    />
                </div>
            </div>

            {/* Options list */}
            <div className="space-y-2">
                {poll.options.map((o) => {
                    const count = poll.vote_counts[o.id] ?? 0;
                    const pct   = poll.total_votes > 0 ? (count / poll.total_votes) * 100 : 0;
                    return (
                        <div key={o.id} className="rounded-xl p-3 relative overflow-hidden transition-all" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.03)" }}>
                            <div
                                className="absolute inset-y-0 left-0 transition-all duration-500"
                                style={{
                                    width: `${pct}%`,
                                    background: "linear-gradient(90deg, rgba(16,185,129,0.1) 0%, rgba(20,184,166,0.03) 100%)",
                                }}
                            />
                            <div className="relative flex items-center justify-between">
                                <span className="text-xs font-semibold text-white">{o.label}</span>
                                <span className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>
                                    {count} ({pct.toFixed(0)}%)
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* AI Summary integration */}
            {poll.ai_summary && (
                <div className="mt-4 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20">
                    <div className="flex items-center gap-1.5 mb-1 text-purple-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">AI Анализ результатов</span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono leading-relaxed">{poll.ai_summary}</p>
                </div>
            )}

            {poll.status === "open" && (
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <button
                        onClick={() => onStatusChange(poll.id, "closed")}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 text-slate-300 border border-slate-700 hover:bg-white/5 transition-all"
                    >
                        <Lock className="w-3.5 h-3.5" /> Завершить
                    </button>
                    <button
                        onClick={() => onStatusChange(poll.id, "cancelled")}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
                    >
                        Отменить
                    </button>
                </div>
            )}
        </div>
    );
}
