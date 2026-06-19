import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Btn, Badge, EmptyState, Field, TextInput, PmSelect,
  FolderKanban, Plus, Building2, Home, MapPin, Edit2, Trash2, X, Loader2,
} from '@/Components/pm/ui';
import type { BadgeTone } from '@/Components/pm/ui';
import { Pencil } from 'lucide-react';

interface Project {
  id:               string;
  name:             string;
  location:         string | null;
  status:           string;
  buildings_count:  number;
  apartments_count: number;
  created_at:       string;
}

interface Props { projects: Project[]; }

const STATUS_TONE: Record<string, BadgeTone> = {
  active:    'ok',
  paused:    'warn',
  completed: 'info',
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
      <div className="page">
        <PageHead
          eyebrow={t('common.propertyMgmt')}
          title={t('pmProjects.title')}
          sub={`${projects.length} ${t('pmProjects.title').toLowerCase()}`}
          actions={canEdit ? <Btn variant="primary" icon={Plus} onClick={openCreate}>{t('pmProjects.newProject')}</Btn> : undefined}
        />

        {projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={t('pmProjects.noProjects')}
            sub={t('pmProjects.noProjectsHint')}
            action={canEdit ? <Btn variant="primary" icon={Plus} onClick={openCreate}>{t('pmProjects.newProject')}</Btn> : undefined}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {projects.map(p => (
              <div
                key={p.id}
                className="card card-pad"
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14, transition: 'border-color .15s' }}
                onClick={() => router.visit(`/pm/projects/${p.id}`)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '')}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>{t(`pmProjects.status${p.status.charAt(0).toUpperCase() + p.status.slice(1)}`)}</Badge>
                    <h2 style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>{p.name}</h2>
                    {p.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, color: 'var(--text-3)', fontSize: 12 }}>
                        <MapPin className="ic" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.location}</span>
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button className="icon-act" onClick={() => openEdit(p)}><Pencil className="ic" /></button>
                      <button className="icon-act danger" onClick={() => handleDelete(p)}><Trash2 className="ic" /></button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="card" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--brand)', fontSize: 11 }}>
                      <Building2 className="ic" />{t('pmProjects.buildings')}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 22 }}>{p.buildings_count}</div>
                  </div>
                  <div className="card" style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--brand)', fontSize: 11 }}>
                      <Home className="ic" />{t('pmProjects.apartments')}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 22 }}>{p.apartments_count}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="scrim show" onClick={() => setShowModal(false)}>
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => e.stopPropagation()}>
            <div className="card card-pad" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>
                  {editing ? t('pmProjects.editProject') : t('pmProjects.newProject')}
                </h2>
                <button className="drawer-close" onClick={() => setShowModal(false)}><X className="ic" /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={`${t('pmProjects.projectName')} *`}>
                  <TextInput
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </Field>
                <Field label={t('pmProjects.address')}>
                  <TextInput
                    type="text"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </Field>
                <Field label={t('pmProjects.statusLabel')}>
                  <PmSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="active">{t('pmProjects.statusActive')}</option>
                    <option value="paused">{t('pmProjects.statusPaused')}</option>
                    <option value="completed">{t('pmProjects.statusCompleted')}</option>
                  </PmSelect>
                </Field>
                <Btn variant="primary" block type="submit" disabled={loading} icon={loading ? Loader2 : undefined}>
                  {editing ? t('pmProjects.save') : t('pmProjects.create')}
                </Btn>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
