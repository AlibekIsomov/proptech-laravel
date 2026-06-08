import { useState } from 'react';
import { router, usePage, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { FolderKanban, Plus, Pencil, Trash2, Building2, Home, MapPin, X, Loader2 } from 'lucide-react';
import AppShell from '@/Components/AppShell';

interface Project {
    id: string;
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

const STATUS_COLORS: Record<string, { bg: string; text: string; labelKey: string }> = {
    active:    { bg: 'rgba(16,185,129,0.12)',  text: '#34d399', labelKey: 'pmProjects.statusActive'    },
    paused:    { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24', labelKey: 'pmProjects.statusPaused'    },
    completed: { bg: 'rgba(20,184,166,0.12)',  text: '#2dd4bf', labelKey: 'pmProjects.statusCompleted' },
};

const emptyForm = { name: '', location: '', status: 'active' };

export default function PMProjectsIndex({ projects }: Props) {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;
    const canEdit = ['super_admin', 'company_admin', 'property_manager'].includes(auth.user?.role) ||
                    auth.user?.pm_role === 'property_manager';

    const [showModal, setShowModal] = useState(false);
    const [editing,   setEditing]   = useState<Project | null>(null);
    const [form,      setForm]      = useState({ ...emptyForm });
    const [loading,   setLoading]   = useState(false);

    function openCreate() { setEditing(null); setForm({ ...emptyForm }); setShowModal(true); }
    function openEdit(p: Project) {
        setEditing(p);
        setForm({ name: p.name, location: p.location ?? '', status: p.status });
        setShowModal(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        if (editing) {
            router.put(`/pm/projects/${editing.id}`, form, { onFinish: () => { setLoading(false); setShowModal(false); } });
        } else {
            router.post('/pm/projects', form, { onFinish: () => { setLoading(false); setShowModal(false); } });
        }
    }

    function handleDelete(p: Project) {
        if (!confirm(`"${p.name}" loyihasini o'chirasizmi?`)) return;
        router.delete(`/pm/projects/${p.id}`);
    }

    return (
        <AppShell>
            <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 border-b shrink-0"
                style={{ backgroundColor: 'var(--card)', borderColor: 'rgba(16,185,129,0.10)' }}>
                <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4" style={{ color: '#10b981' }} />
                    <h1 className="text-sm font-semibold text-slate-800">{t('pmProjects.title')}</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full ml-1"
                        style={{ backgroundColor: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
                        {projects.length}
                    </span>
                </div>
                {canEdit && (
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: '#10b981' }}>
                        <Plus className="w-4 h-4" /> {t('pmProjects.newProject')}
                    </button>
                )}
            </header>

            <main className="px-6 py-6">
                {projects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                            style={{ backgroundColor: 'rgba(16,185,129,0.10)' }}>
                            <FolderKanban className="w-6 h-6" style={{ color: '#10b981' }} />
                        </div>
                        <p className="text-sm font-medium text-slate-800">{t('pmProjects.noProjects')}</p>
                        <p className="text-xs" style={{ color: '#475569' }}>{t('pmProjects.noProjectsHint')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {projects.map(p => {
                            const s = STATUS_COLORS[p.status] ?? STATUS_COLORS.active;
                            return (
                                <div key={p.id}
                                    className="rounded-2xl p-5 flex flex-col gap-4 group cursor-pointer transition-all hover:border-emerald-500/30"
                                    style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(16,185,129,0.08)' }}
                                    onClick={() => router.visit(`/pm/projects/${p.id}`)}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2"
                                                style={{ backgroundColor: s.bg, color: s.text }}>{t(s.labelKey)}</span>
                                            <h2 className="text-sm font-semibold text-slate-800 group-hover:text-emerald-300 transition-colors">
                                                {p.name}
                                            </h2>
                                            {p.location && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <MapPin className="w-3 h-3 shrink-0" style={{ color: '#475569' }} />
                                                    <span className="text-xs truncate" style={{ color: '#475569' }}>{p.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2"
                                                onClick={e => e.stopPropagation()}>
                                                <button onClick={() => openEdit(p)}
                                                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
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
                                        <div className="rounded-xl p-3" style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.08)' }}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Building2 className="w-3 h-3" style={{ color: '#10b981' }} />
                                                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#475569' }}>{t('pmProjects.buildings')}</span>
                                            </div>
                                            <p className="text-xl font-bold text-slate-800">{p.buildings_count}</p>
                                        </div>
                                        <div className="rounded-xl p-3" style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.08)' }}>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <Home className="w-3 h-3" style={{ color: '#14b8a6' }} />
                                                <span className="text-[10px] uppercase tracking-wider" style={{ color: '#475569' }}>{t('pmProjects.apartments')}</span>
                                            </div>
                                            <p className="text-xl font-bold text-slate-800">{p.apartments_count}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="w-full max-w-md rounded-2xl p-6"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid rgba(16,185,129,0.12)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-slate-800">
                                {editing ? t('pmProjects.editProject') : t('pmProjects.newProject')}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: '#475569' }}
                                className="hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {[
                                { label: t('pmProjects.projectName') + ' *', key: 'name', required: true },
                                { label: t('pmProjects.address'),             key: 'location', required: false },
                            ].map(({ label, key, required }) => (
                                <div key={key}>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>{label}</label>
                                    <input type="text" required={required} value={(form as any)[key]}
                                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                        className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none"
                                        style={{ backgroundColor: 'var(--border)', border: '1px solid rgba(16,185,129,0.15)' }} />
                                </div>
                            ))}

                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>{t('pmProjects.statusLabel')}</label>
                                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                    className="w-full rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none"
                                    style={{ backgroundColor: '#f0faf3', border: '1px solid rgba(16,185,129,0.15)' }}>
                                    <option value="active">{t('pmProjects.statusActive')}</option>
                                    <option value="paused">{t('pmProjects.statusPaused')}</option>
                                    <option value="completed">{t('pmProjects.statusCompleted')}</option>
                                </select>
                            </div>

                            <button type="submit" disabled={loading}
                                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#10b981' }}>
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editing ? t('pmProjects.save') : t('pmProjects.create')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </AppShell>
    );
}

