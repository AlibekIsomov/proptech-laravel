import { useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import { FolderKanban, Plus, Pencil, Trash2, Building2, Home, MapPin, X, Loader2 } from 'lucide-react';
import AppShell from '@/Components/AppShell';

interface Project {
    id: string | number;
    name: string;
    location: string | null;
    status: string;
    buildings_count: number;
    apartments_count: number;
    created_at: string;
}

interface Props {
    projects: Project[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    active:    { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', label: 'Faol' },
    paused:    { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', label: 'To\'xtatilgan' },
    completed: { bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc', label: 'Tugallangan' },
};

const emptyForm = { name: '', location: '', status: 'active', description: '', total_area: '', total_floors: '' };

export default function ProjectsIndex({ projects }: Props) {
    const { auth } = usePage<any>().props;
    const canEdit = ['super_admin', 'company_admin'].includes(auth.user?.role);

    const [showModal, setShowModal] = useState(false);
    const [editing,   setEditing]   = useState<Project | null>(null);
    const [form,      setForm]      = useState({ ...emptyForm });
    const [loading,   setLoading]   = useState(false);

    function openCreate() { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); }
    function openEdit(p: Project) {
        setEditing(p);
        setForm({ name: p.name, location: p.location ?? '', status: p.status, description: '', total_area: '', total_floors: '' });
        setShowModal(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const action = editing
            ? router.put(`/projects/${editing.id}`, form, { onFinish: () => { setLoading(false); setShowModal(false); } })
            : router.post('/projects', form, { onFinish: () => { setLoading(false); setShowModal(false); } });
    }

    function handleDelete(p: Project) {
        if (!confirm(`"${p.name}" loyihasini o'chirasizmi?`)) return;
        router.delete(`/projects/${p.id}`);
    }

    return (
        <AppShell>
            <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 border-b shrink-0"
                style={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4" style={{ color: '#6366f1' }} />
                    <h1 className="text-sm font-semibold text-white">Loyihalar</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full ml-1"
                        style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>
                        {projects.length}
                    </span>
                </div>
                {canEdit && (
                    <button id="create-project-btn" onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: '#6366f1' }}>
                        <Plus className="w-4 h-4" /> Yangi loyiha
                    </button>
                )}
            </header>

            <main className="px-6 py-6">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                            <FolderKanban className="w-6 h-6" style={{ color: '#6366f1' }} />
                        </div>
                        <p className="text-sm font-medium text-white">Loyihalar yo'q</p>
                        <p className="text-xs" style={{ color: '#475569' }}>Birinchi loyihani yarating</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map(p => {
                            const s = STATUS_COLORS[p.status] ?? STATUS_COLORS.active;
                            return (
                                <div key={p.id} className="rounded-2xl p-5 flex flex-col gap-4 group"
                                    style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2"
                                                style={{ backgroundColor: s.bg, color: s.text }}>{s.label}</span>
                                            <h2 className="text-sm font-semibold text-white">
                                                <Link href={`/projects/${p.id}`} className="hover:text-indigo-400 transition-colors">
                                                    {p.name}
                                                </Link>
                                            </h2>
                                            {p.location && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <MapPin className="w-3 h-3" style={{ color: '#475569' }} />
                                                    <span className="text-xs" style={{ color: '#475569' }}>{p.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(p)}
                                                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                                                    style={{ color: '#64748b' }}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(p)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                                    style={{ color: '#64748b' }}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-xl p-3" style={{ backgroundColor: '#080b14', border: '1px solid #1e2536' }}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Building2 className="w-3 h-3" style={{ color: '#6366f1' }} />
                                                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#475569' }}>Binolar</span>
                                            </div>
                                            <p className="text-xl font-bold text-white">{p.buildings_count}</p>
                                        </div>
                                        <div className="rounded-xl p-3" style={{ backgroundColor: '#080b14', border: '1px solid #1e2536' }}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Home className="w-3 h-3" style={{ color: '#10b981' }} />
                                                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#475569' }}>Kvartiralar</span>
                                            </div>
                                            <p className="text-xl font-bold text-white">{p.apartments_count}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="w-full max-w-md rounded-2xl p-6"
                        style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.09)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-white">
                                {editing ? 'Loyihani tahrirlash' : 'Yangi loyiha'}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: '#475569' }}
                                className="hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {[
                                { label: 'Loyiha nomi *', key: 'name', required: true },
                                { label: 'Manzil', key: 'location', required: false },
                            ].map(({ label, key, required }) => (
                                <div key={key}>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
                                    <input type="text" required={required} value={(form as any)[key]}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                                </div>
                            ))}

                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Holat</label>
                                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                                    style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <option value="active">Faol</option>
                                    <option value="paused">To'xtatilgan</option>
                                    <option value="completed">Tugallangan</option>
                                </select>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#6366f1' }}>
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editing ? 'Saqlash' : 'Yaratish'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
