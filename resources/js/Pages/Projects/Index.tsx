import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Btn, Badge, EmptyState, Field, TextInput, PmSelect,
  FolderKanban, Plus, Building2, Home, MapPin, Edit2, Trash2, X, Loader2,
} from '@/Components/pm/ui';
import type { BadgeTone } from '@/Components/pm/ui';

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

const STATUS_TONE: Record<string, BadgeTone> = {
    active:    'ok',
    paused:    'warn',
    completed: 'info',
};

const emptyForm = { name: '', location: '', status: 'active', description: '', total_area: '', total_floors: '' };

export default function ProjectsIndex({ projects }: Props) {
    const { t } = useTranslation();
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
        if (editing) {
            router.put(`/projects/${editing.id}`, form, { onFinish: () => { setLoading(false); setShowModal(false); } });
        } else {
            router.post('/projects', form, { onFinish: () => { setLoading(false); setShowModal(false); } });
        }
    }

    function handleDelete(p: Project) {
        if (!confirm(`"${p.name}" loyihasini o'chirasizmi?`)) return;
        router.delete(`/projects/${p.id}`);
    }

    return (
        <AppShell>
            <Head title={t('projects.title') + ' — 1Mahalla'} />
            <div className="page">
                <PageHead
                    title={t('projects.title')}
                    sub={`${projects.length} ${t('projects.title').toLowerCase()}`}
                    actions={canEdit ? <Btn variant="primary" icon={Plus} onClick={openCreate}>{t('projects.newProject')}</Btn> : undefined}
                />

                {projects.length === 0 ? (
                    <EmptyState
                        icon={FolderKanban}
                        title={t('projects.noProjects')}
                        sub={t('projects.noProjectsHint')}
                        action={canEdit ? <Btn variant="primary" icon={Plus} onClick={openCreate}>{t('projects.newProject')}</Btn> : undefined}
                    />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                        {projects.map(p => {
                            const tone = STATUS_TONE[p.status] ?? 'neutral';
                            const statusLabel =
                                p.status === 'active'    ? t('projects.statusActive') :
                                p.status === 'paused'    ? t('projects.statusPaused') :
                                p.status === 'completed' ? t('projects.statusCompleted') : p.status;
                            return (
                                <div
                                    key={p.id}
                                    className="card card-pad"
                                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14, transition: 'border-color .15s' }}
                                    onClick={() => router.visit(`/projects/${p.id}`)}
                                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
                                    onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <Badge tone={tone}>{statusLabel}</Badge>
                                            <h2 style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>{p.name}</h2>
                                            {p.location && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: 'var(--text-faint)', fontSize: 12 }}>
                                                    <MapPin className="ic" style={{ flexShrink: 0 }} />
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        {canEdit && (
                                            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                                <button className="icon-act" onClick={() => openEdit(p)}><Edit2 className="ic" /></button>
                                                <button className="icon-act danger" onClick={() => handleDelete(p)}><Trash2 className="ic" /></button>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div className="card" style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--brand)', fontSize: 11 }}>
                                                <Building2 className="ic" />{t('projects.buildings')}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: 22 }}>{p.buildings_count}</div>
                                        </div>
                                        <div className="card" style={{ padding: '10px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--brand)', fontSize: 11 }}>
                                                <Home className="ic" />{t('projects.apartments')}
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: 22 }}>{p.apartments_count}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="scrim show" onClick={() => setShowModal(false)}>
                    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                        onClick={e => e.stopPropagation()}>
                        <div className="card card-pad" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h2 style={{ fontWeight: 700, fontSize: 16 }}>
                                    {editing ? t('projects.editProject') : t('projects.newProject')}
                                </h2>
                                <button className="drawer-close" onClick={() => setShowModal(false)}><X className="ic" /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <Field label={`${t('projects.projectName')} *`}>
                                    <TextInput type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                                </Field>
                                <Field label={t('projects.address')}>
                                    <TextInput type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                                </Field>
                                <Field label={t('projects.statusLabel')}>
                                    <PmSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                        <option value="active">{t('projects.statusActive')}</option>
                                        <option value="paused">{t('projects.statusPaused')}</option>
                                        <option value="completed">{t('projects.statusCompleted')}</option>
                                    </PmSelect>
                                </Field>
                                <Btn variant="primary" block type="submit" disabled={loading} icon={loading ? Loader2 : undefined}>
                                    {editing ? t('projects.save') : t('projects.create')}
                                </Btn>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
