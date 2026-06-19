import { useState, useMemo, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Vote, Lock, Trash2, CalendarClock } from "lucide-react";
import AppShell from "@/Components/AppShell";
import {
    PageHead, Btn, Badge, Field, PmSelect, EmptyState,
    Plus, X, Loader2, Sparkles, Check,
} from "@/Components/pm/ui";
import type { BadgeTone } from "@/Components/pm/ui";

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

interface PollOption {
    id: string;
    label: string;
}

type PollStatus = "open" | "closed" | "cancelled";

interface PollRow {
    id:             string;
    pm_building_id: string;
    title:          string;
    description:    string | null;
    options:        PollOption[];
    status:         PollStatus;
    quorum_pct:     number;
    closes_at:      string | null;
    ai_summary:     string | null;
    vote_counts:    Record<string, number>;
    total_votes:    number;
    created_at:     string;
}

interface Props {
    projects: Project[];
}

const STATUS_TONE: Record<PollStatus, BadgeTone> = {
    open:      'ok',
    closed:    'neutral',
    cancelled: 'danger',
};

export default function PollsIndex({ projects }: Props) {
    const { t } = useTranslation();
    const [selectedProj, setSelectedProj] = useState("");
    const [selectedBldg, setSelectedBldg] = useState("");
    const [polls,        setPolls]        = useState<PollRow[]>([]);
    const [loading,      setLoading]      = useState(false);
    const [aptCount,     setAptCount]     = useState(0);
    const [creating,     setCreating]     = useState(false);

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

    const loadPolls = async () => {
        if (!selectedBldg) { setPolls([]); setAptCount(0); return; }
        setLoading(true);
        try {
            const res  = await fetch(`/pm/polls?pm_building_id=${selectedBldg}`, {
                headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" }
            });
            const json = await res.json();
            setPolls(json.polls || []);
            setAptCount(json.apartment_count || 0);
        } catch (err) { console.error("Failed to load polls:", err); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadPolls(); }, [selectedBldg]);

    const changeStatus = async (id: string, status: PollStatus) => {
        setPolls((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
        try {
            await fetch(`/pm/polls/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json", "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                },
                body: JSON.stringify({ status }),
            });
            loadPolls();
        } catch (err) { console.error("Failed to update status:", err); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('pmPolls.confirmDelete'))) return;
        try {
            await fetch(`/pm/polls/${id}`, {
                method: "DELETE",
                headers: {
                    "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                }
            });
            loadPolls();
        } catch (err) { console.error("Failed to delete poll:", err); }
    };

    return (
        <AppShell>
            <div className="page">
                <PageHead
                    eyebrow="Property Management"
                    title={t('pmPolls.title')}
                    sub={t('pmPolls.subtitle')}
                    actions={
                        <Btn
                            variant={creating ? "ghost" : "primary"}
                            icon={creating ? X : Plus}
                            disabled={!selectedBldg}
                            onClick={() => setCreating((c) => !c)}
                        >
                            {creating ? t('pmPolls.cancel') : t('pmPolls.createPoll')}
                        </Btn>
                    }
                />

                {/* Selectors */}
                <div className="card card-pad" style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
                        <Field label={t('pmPolls.project')}>
                            <PmSelect value={selectedProj} onChange={(e) => setSelectedProj(e.target.value)}>
                                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </PmSelect>
                        </Field>
                        <Field label={t('pmPolls.building')}>
                            <PmSelect value={selectedBldg} disabled={buildings.length === 0} onChange={(e) => setSelectedBldg(e.target.value)}>
                                {buildings.length === 0 && <option value="">{t('pmPolls.noBuildings')}</option>}
                                {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </PmSelect>
                        </Field>
                    </div>
                </div>

                {/* Create form (inline expand) */}
                {creating && selectedBldg && (
                    <CreatePollCard
                        buildingId={selectedBldg}
                        onCreated={() => { setCreating(false); loadPolls(); }}
                        onCancel={() => setCreating(false)}
                    />
                )}

                {/* Poll list */}
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
                        <Loader2 className="ic" style={{ color: 'var(--brand)', width: 28, height: 28 }} />
                    </div>
                ) : polls.length === 0 ? (
                    <EmptyState
                        icon={Vote as any}
                        title={t('pmPolls.noPolls')}
                        sub={t('pmPolls.noPollsSub')}
                        action={selectedBldg ? (
                            <Btn variant="primary" icon={Plus} onClick={() => setCreating(true)}>{t('pmPolls.createPoll')}</Btn>
                        ) : undefined}
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {polls.map((p) => (
                            <PollCard key={p.id} poll={p} aptCount={aptCount} onStatusChange={changeStatus} onDelete={handleDelete} />
                        ))}
                    </div>
                )}
            </div>
        </AppShell>
    );
}

// ── Create Poll Card ──────────────────────────────────────────────────────────

interface CreateProps {
    buildingId: string;
    onCreated:  () => void;
    onCancel:   () => void;
}

function CreatePollCard({ buildingId, onCreated, onCancel }: CreateProps) {
    const { t } = useTranslation();
    const [title,       setTitle]       = useState("");
    const [description, setDescription] = useState("");
    const [options,     setOptions]     = useState<string[]>(["Ha", "Yo'q", "Betaraf"]);
    const [quorum,      setQuorum]      = useState(50);
    const [closesAt,    setClosesAt]    = useState("");
    const [saving,      setSaving]      = useState(false);
    const [error,       setError]       = useState<string | null>(null);

    function setOpt(i: number, v: string) { setOptions((arr) => arr.map((x, idx) => (idx === i ? v : x))); }
    function addOpt() { setOptions((arr) => [...arr, ""]); }
    function removeOpt(i: number) {
        if (options.length <= 2) return;
        setOptions((arr) => arr.filter((_, idx) => idx !== i));
    }

    async function save() {
        setError(null);
        const cleanOpts = options
            .map((o, idx) => ({ id: String.fromCharCode(97 + idx), label: o.trim() }))
            .filter((o) => o.label);
        if (!title.trim()) { setError(t('pmPolls.titleRequired')); return; }
        if (cleanOpts.length < 2) { setError(t('pmPolls.minOptions')); return; }

        setSaving(true);
        try {
            const res = await fetch("/pm/polls", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json", "Accept": "application/json",
                    "X-CSRF-TOKEN": (document.querySelector("meta[name=\"csrf-token\"]") as HTMLMetaElement)?.content || "",
                },
                body: JSON.stringify({
                    pm_building_id: buildingId,
                    title:          title.trim(),
                    description:    description.trim() || null,
                    options:        cleanOpts,
                    quorum_pct:     quorum,
                    closes_at:      closesAt ? new Date(closesAt).toISOString() : null,
                }),
            });
            const json = await res.json();
            if (!res.ok) { setError(json.error ?? t('pmPolls.saveError')); return; }
            onCreated();
        } catch { setError(t('pmPolls.saveError')); }
        finally { setSaving(false); }
    }

    return (
        <div className="card card-pad" style={{ marginBottom: 18, borderColor: 'color-mix(in srgb, var(--brand) 30%, transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>{t('pmPolls.newPoll')}</h3>
                <button className="drawer-close" onClick={onCancel}><X className="ic" /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('pmPolls.titlePlaceholder')} />
                <textarea className="input" rows={3} value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('pmPolls.descriptionPlaceholder')}
                    style={{ resize: 'none' }} />

                {/* Options */}
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{t('pmPolls.options')}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {options.map((o, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input className="input" value={o} onChange={(e) => setOpt(i, e.target.value)}
                                    placeholder={`${t('pmPolls.option')} ${i + 1}`} style={{ flex: 1 }} />
                                <button className="icon-act" onClick={() => removeOpt(i)} disabled={options.length <= 2}
                                    style={{ color: 'var(--danger)', opacity: options.length <= 2 ? 0.3 : 1 }}>
                                    <Trash2 className="ic" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button onClick={addOpt} style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Plus className="ic" /> {t('pmPolls.addOption')}
                    </button>
                </div>

                {/* Quorum + date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label={t('pmPolls.quorum')}>
                        <input className="input" type="number" min={0} max={100} value={quorum}
                            onChange={(e) => setQuorum(Math.max(0, Math.min(100, Number(e.target.value))))} />
                    </Field>
                    <Field label={t('pmPolls.closesAt')}>
                        <input className="input" type="datetime-local" value={closesAt}
                            onChange={(e) => setClosesAt(e.target.value)} />
                    </Field>
                </div>

                {error && <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>{error}</p>}

                <div style={{ display: 'flex', gap: 10 }}>
                    <Btn variant="ghost" block type="button" onClick={onCancel}>{t('pmPolls.cancel')}</Btn>
                    <Btn variant="primary" block type="button" disabled={saving} icon={saving ? Loader2 : undefined} onClick={save}>
                        {t('pmPolls.launch')}
                    </Btn>
                </div>
            </div>
        </div>
    );
}

// ── Poll Card ─────────────────────────────────────────────────────────────────

interface PollCardProps {
    poll:           PollRow;
    aptCount:       number;
    onStatusChange: (id: string, s: PollStatus) => void;
    onDelete:       (id: string) => void;
}

function PollCard({ poll, aptCount, onStatusChange, onDelete }: PollCardProps) {
    const { t } = useTranslation();
    const quorumThreshold = Math.ceil(aptCount * poll.quorum_pct / 100);
    const quorumPct = aptCount > 0 ? Math.min(100, (poll.total_votes / aptCount) * 100) : 0;
    const quorumMet = poll.total_votes >= quorumThreshold && quorumThreshold > 0;

    return (
        <div className="card card-pad">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>{poll.title}</div>
                    {poll.description && (
                        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>{poll.description}</p>
                    )}
                    {poll.closes_at && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11, color: 'var(--text-3)' }}>
                            <CalendarClock className="ic" style={{ width: 12, height: 12 }} />
                            {t('pmPolls.activeUntil')}: {new Date(poll.closes_at).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Badge tone={STATUS_TONE[poll.status]}>{t(`pmPolls.status${poll.status.charAt(0).toUpperCase() + poll.status.slice(1)}`)}</Badge>
                    <button className="icon-act" onClick={() => onDelete(poll.id)} style={{ color: 'var(--danger)' }}>
                        <Trash2 className="ic" />
                    </button>
                </div>
            </div>

            {/* Quorum bar */}
            <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'var(--bg)', border: '1px solid var(--border)', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8 }}>
                    <span>{t('pmPolls.quorum')} {poll.quorum_pct}%</span>
                    <span>
                        {poll.total_votes} / {aptCount} {t('pmPolls.apartments')}
                        {quorumMet
                            ? <span style={{ color: 'var(--ok)' }}> · {t('pmPolls.quorumMet')}</span>
                            : <span style={{ color: 'var(--warn)' }}> · {t('pmPolls.collecting')}</span>
                        }
                    </span>
                </div>
                <div style={{ height: 8, borderRadius: 99, overflow: 'hidden', backgroundColor: 'var(--border)' }}>
                    <div style={{
                        height: '100%', width: `${quorumPct}%`, transition: 'width 0.4s',
                        background: quorumMet
                            ? 'linear-gradient(90deg, var(--ok) 0%, var(--brand) 100%)'
                            : 'linear-gradient(90deg, var(--warn) 0%, #f97316 100%)',
                    }} />
                </div>
            </div>

            {/* Vote options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {poll.options.map((o) => {
                    const count = poll.vote_counts[o.id] ?? 0;
                    const pct   = poll.total_votes > 0 ? (count / poll.total_votes) * 100 : 0;
                    return (
                        <div key={o.id} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', padding: '10px 14px' }}>
                            <div style={{
                                position: 'absolute', inset: '0 auto 0 0', width: `${pct}%`,
                                background: 'linear-gradient(90deg, var(--brand-tint) 0%, transparent 100%)',
                                transition: 'width 0.4s',
                            }} />
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{o.label}</span>
                                <span className="tnum" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                    {count} ({pct.toFixed(0)}%)
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* AI summary */}
            {poll.ai_summary && (
                <div style={{ padding: '12px 14px', borderRadius: 10, backgroundColor: 'color-mix(in srgb, var(--violet) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--violet) 25%, transparent)', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--violet)' }}>
                        <Sparkles className="ic" style={{ width: 13, height: 13 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Tahlil</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{poll.ai_summary}</p>
                </div>
            )}

            {/* Actions */}
            {poll.status === "open" && (
                <div style={{ display: 'flex', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                    <Btn variant="ghost" size="sm" icon={Lock as any} onClick={() => onStatusChange(poll.id, "closed")}>
                        {t('pmPolls.close')}
                    </Btn>
                    <Btn variant="danger-ghost" size="sm" onClick={() => onStatusChange(poll.id, "cancelled")}>
                        {t('pmPolls.cancel')}
                    </Btn>
                </div>
            )}
        </div>
    );
}
