import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Btn, Badge, Field, TextInput, Avatar, EmptyState,
  Plus, Search, Building, Loader2, Edit2, Trash2, X,
} from '@/Components/pm/ui';

interface Company {
  id:             number;
  name:           string;
  slug:           string;
  is_active:      boolean;
  users_count:    number;
  projects_count: number;
  created_at:     string;
}

interface Props {
  companies: Company[];
}

export default function Index({ companies }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  function openCreateModal() {
    setEditingCompany(null);
    setName(''); setSlug(''); setIsActive(true);
    setShowModal(true);
  }

  function openEditModal(c: Company) {
    setEditingCompany(c);
    setName(c.name); setSlug(c.slug); setIsActive(c.is_active);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = { name: name.trim(), slug: slug.trim() || null, is_active: isActive };

    if (editingCompany) {
      router.put(`/companies/${editingCompany.id}`, payload, {
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    } else {
      router.post('/companies', payload, {
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    }
  }

  function handleDelete(c: Company) {
    if (confirm(`Are you sure you want to deactivate/delete company "${c.name}"?`)) {
      router.delete(`/companies/${c.id}`);
    }
  }

  const filtered = useMemo(() => companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  ), [companies, search]);

  return (
    <AppShell>
      <Head title={t('companies.title') + ' — 1Mahalla'} />
      <div className="page">
        <PageHead
          title={t('companies.title')}
          sub={`${filtered.length} ${t('companies.subtitle')}`}
          actions={<Btn variant="primary" icon={Plus} onClick={openCreateModal}>{t('companies.newTenant')}</Btn>}
        />

        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div style={{ maxWidth: 360 }}>
            <Field><TextInput icon={Search} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('companies.searchPlaceholder')} /></Field>
          </div>
        </div>

        <div className="table-card">
          {filtered.length === 0 ? (
            <EmptyState icon={Building} title={t('companies.noCompanies')} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('companies.colName')}</th>
                    <th>{t('companies.colSlug')}</th>
                    <th>{t('companies.colUsers')}</th>
                    <th>{t('companies.colProjects')}</th>
                    <th>{t('companies.colStatus')}</th>
                    <th>{t('companies.colRegistered')}</th>
                    <th>{t('companies.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={c.name} color="c2" square size={34} />
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                        </div>
                      </td>
                      <td className="mono cell-sub">{c.slug}</td>
                      <td>{c.users_count} {t('companies.users')}</td>
                      <td>{c.projects_count} {t('companies.projectsCount')}</td>
                      <td><Badge tone={c.is_active ? 'ok' : 'danger'}>{c.is_active ? t('companies.statusActive') : t('companies.statusInactive')}</Badge></td>
                      <td className="cell-sub">{c.created_at}</td>
                      <td>
                        <div className="row-actions">
                          <button className="icon-act" onClick={() => openEditModal(c)}><Edit2 className="ic" /></button>
                          <button className="icon-act danger" onClick={() => handleDelete(c)}><Trash2 className="ic" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="scrim show" onClick={() => setShowModal(false)}>
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => e.stopPropagation()}>
            <div className="card card-pad" style={{ width: '100%', maxWidth: 440, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>{editingCompany ? t('companies.editCompany') : t('companies.newCompany')}</h2>
                <button className="drawer-close" onClick={() => setShowModal(false)}><X className="ic" /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={`${t('companies.companyName')} *`}>
                  <TextInput type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. UzBuilders Corp" />
                </Field>

                <Field label={t('companies.slugLabel')}>
                  <TextInput type="text" value={slug} onChange={e => setSlug(e.target.value)} placeholder="uzbuilders" style={{ fontFamily: 'var(--mono)' }} />
                </Field>

                <Field label={t('companies.statusLabel')}>
                  <select className="select" value={isActive ? '1' : '0'} onChange={e => setIsActive(e.target.value === '1')}>
                    <option value="1">{t('companies.statusActive')}</option>
                    <option value="0">{t('companies.statusInactive')}</option>
                  </select>
                </Field>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <Btn variant="ghost" block type="button" onClick={() => setShowModal(false)}>{t('companies.cancel')}</Btn>
                  <Btn variant="primary" block type="submit" disabled={submitting} icon={submitting ? Loader2 : undefined}>
                    {editingCompany ? t('companies.save') : t('companies.create')}
                  </Btn>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
