import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/Components/AppShell';
import ApartmentDetailDrawer from '@/Components/pm/ApartmentDetailDrawer';
import {
  PageHead, Btn, Badge, Field, TextInput, PmSelect, Avatar, EmptyState,
  Plus, Search, UserCheck, Phone, Mail, Loader2, Edit2, Trash2, X, Send,
} from '@/Components/pm/ui';
import type { BadgeTone } from '@/Components/pm/ui';

interface Resident {
  id:               string;
  full_name:        string;
  phone:            string | null;
  email:            string | null;
  telegram_username: string | null;
  resident_type:    'owner' | 'tenant' | 'family';
  move_in_date:     string | null;
  is_active:        boolean;
  apartment_id:     string;
  pm_building_id?:  string;
  pm_project_id?:   string;
  apartment:        string;
  building:         string;
  project:          string;
}

interface BuildingOption { id: string; name: string; }
interface ProjectOption  { id: string; name: string; buildings: BuildingOption[]; }
interface ApartmentOption { id: string; number: string; pm_building_id: string; floor: number; }

interface Props {
  residents:  Resident[];
  projects:   ProjectOption[];
  apartments: ApartmentOption[];
}

const TYPE_TONE: Record<string, BadgeTone> = { owner: 'ok', tenant: 'info', family: 'violet' };
const TYPE_KEYS: Record<string, string>    = { owner: 'pmResidents.owner', tenant: 'pmResidents.tenant', family: 'pmResidents.family' };

export default function Index({ residents, projects, apartments }: Props) {
  const { t } = useTranslation();
  const [search, setSearch]       = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [drawerId, setDrawerId]     = useState<string | null>(null);

  // Form state
  const [apartmentId, setApartmentId] = useState('');
  const [projId, setProjId]           = useState('');
  const [bldgId, setBldgId]           = useState('');
  const [fullName, setFullName]       = useState('');
  const [phone, setPhone]             = useState('');
  const [email, setEmail]             = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [residentType, setResidentType] = useState<'owner' | 'tenant' | 'family'>('owner');
  const [moveInDate, setMoveInDate]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [searchAptQuery, setSearchAptQuery]       = useState('');
  const [isAptDropdownOpen, setIsAptDropdownOpen] = useState(false);

  const apartmentsWithContext = useMemo(() =>
    apartments.map(apt => {
      let buildingName = '', projectName = '';
      for (const p of projects) {
        const b = p.buildings.find(b => b.id === apt.pm_building_id);
        if (b) { buildingName = b.name; projectName = p.name; break; }
      }
      return { ...apt, buildingName, projectName };
    }), [apartments, projects]);

  const selectedAptObj = useMemo(() =>
    apartmentId ? apartmentsWithContext.find(a => a.id === apartmentId) ?? null : null,
    [apartmentId, apartmentsWithContext]);

  const buildingsForSelectedProj = useMemo(() => {
    if (!projId) return [];
    return projects.find(p => p.id === projId)?.buildings ?? [];
  }, [projId, projects]);

  const filteredApartmentsForSelector = useMemo(() => {
    let result = apartmentsWithContext;
    if (projId) {
      const proj = projects.find(p => p.id === projId);
      const bldgIds = proj ? proj.buildings.map(b => b.id) : [];
      result = result.filter(a => bldgIds.includes(a.pm_building_id));
    }
    if (bldgId) result = result.filter(a => a.pm_building_id === bldgId);
    if (searchAptQuery.trim()) {
      const q = searchAptQuery.toLowerCase();
      result = result.filter(a => a.number.toLowerCase().includes(q) || a.buildingName.toLowerCase().includes(q) || a.projectName.toLowerCase().includes(q));
    }
    return result;
  }, [apartmentsWithContext, projId, bldgId, searchAptQuery, projects]);

  function openCreateModal() {
    setEditingResident(null);
    setProjId(''); setBldgId(''); setApartmentId(''); setSearchAptQuery(''); setIsAptDropdownOpen(false);
    setFullName(''); setPhone(''); setEmail(''); setTelegramUsername(''); setResidentType('owner'); setMoveInDate('');
    setShowModal(true);
  }

  function openEditModal(r: Resident) {
    setEditingResident(r);
    setProjId(r.pm_project_id || ''); setBldgId(r.pm_building_id || ''); setApartmentId(r.apartment_id);
    setSearchAptQuery(''); setIsAptDropdownOpen(false);
    setFullName(r.full_name); setPhone(r.phone || ''); setEmail(r.email || '');
    setTelegramUsername(r.telegram_username || ''); setResidentType(r.resident_type); setMoveInDate(r.move_in_date || '');
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = { apartment_id: apartmentId, full_name: fullName.trim(), phone: phone.trim() || null, email: email.trim() || null, telegram_username: telegramUsername.trim() || null, resident_type: residentType, move_in_date: moveInDate || null };
    if (editingResident) {
      router.put(`/pm/residents/${editingResident.id}`, { ...payload, is_active: true }, {
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    } else {
      router.post('/pm/residents', payload, {
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    }
  }

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to archive/remove this resident?')) router.delete(`/pm/residents/${id}`);
  }

  const filtered = useMemo(() => {
    return residents.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !search || r.full_name.toLowerCase().includes(q) || (r.phone && r.phone.includes(search)) || (r.email && r.email.toLowerCase().includes(q)) || (r.apartment && r.apartment.toLowerCase().includes(q)) || (r.building && r.building.toLowerCase().includes(q)) || (r.project && r.project.toLowerCase().includes(q));
      return matchSearch && (!filterType || r.resident_type === filterType);
    });
  }, [residents, search, filterType]);

  return (
    <AppShell>
      <Head title={t('pmResidents.title') + ' — PM'} />
      <div className="page">
        <PageHead
          eyebrow={t('common.propertyMgmt')}
          title={t('pmResidents.title')}
          sub={`${filtered.length} / ${residents.length}`}
          actions={<Btn variant="primary" icon={Plus} onClick={openCreateModal}>{t('pmResidents.addResident')}</Btn>}
        />

        {/* Filters */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px', maxWidth: 360 }}>
              <Field><TextInput icon={Search} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search') + '...'} /></Field>
            </div>
            <Field label={t('pmResidents.filterByType')}>
              <PmSelect value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">{t('pmResidents.allTypes')}</option>
                <option value="owner">{t('pmResidents.owner')}</option>
                <option value="tenant">{t('pmResidents.tenant')}</option>
                <option value="family">{t('pmResidents.family')}</option>
              </PmSelect>
            </Field>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          {filtered.length === 0 ? (
            <EmptyState icon={UserCheck} title={t('pmResidents.noResidents')} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('pmResidents.colUser')}</th>
                    <th>{t('pmResidents.colContacts')}</th>
                    <th>{t('pmResidents.colType')}</th>
                    <th>{t('pmResidents.colApartment')}</th>
                    <th>{t('pmResidents.colBuilding')}</th>
                    <th>{t('pmResidents.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={r.full_name} color="c2" size={34} />
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{r.full_name}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, color: 'var(--text-2)' }}>
                          {r.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone className="ic" />{r.phone}</span>}
                          {r.email && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail className="ic" />{r.email}</span>}
                          {r.telegram_username && <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--brand)' }}><Send className="ic" />@{r.telegram_username}</span>}
                        </div>
                      </td>
                      <td><Badge tone={TYPE_TONE[r.resident_type] ?? 'neutral'}>{t(TYPE_KEYS[r.resident_type] ?? 'pmResidents.owner')}</Badge></td>
                      <td><span className="tnum" style={{ fontWeight: 700 }}>№{r.apartment}</span></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.building}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.project}</div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Btn variant="soft" size="sm" onClick={() => setDrawerId(r.apartment_id)}>{t('pmResidents.viewApartment')}</Btn>
                          <button className="icon-act" onClick={() => openEditModal(r)}><Edit2 className="ic" /></button>
                          <button className="icon-act danger" onClick={() => handleDelete(r.id)}><Trash2 className="ic" /></button>
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

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="scrim show" onClick={() => setShowModal(false)}>
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => e.stopPropagation()}>
            <div className="card card-pad" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>{editingResident ? t('pmResidents.editResident') : t('pmResidents.newResident')}</h2>
                <button className="drawer-close" onClick={() => setShowModal(false)}><X className="ic" /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label={`${t('pmResidents.fullName')} *`}>
                  <TextInput type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Alibek Isomov" />
                </Field>

                {/* Apartment autocomplete */}
                <div style={{ position: 'relative' }}>
                  <Field label={`${t('pmResidents.apartment')} *`}>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        required
                        value={isAptDropdownOpen ? searchAptQuery : selectedAptObj ? `№${selectedAptObj.number} · ${selectedAptObj.buildingName} (${selectedAptObj.projectName})` : ''}
                        onChange={e => { setSearchAptQuery(e.target.value); setIsAptDropdownOpen(true); }}
                        onFocus={() => { setIsAptDropdownOpen(true); setSearchAptQuery(''); }}
                        placeholder={t('pmResidents.aptPlaceholder')}
                      />
                      {apartmentId && (
                        <button type="button" onClick={() => { setApartmentId(''); setProjId(''); setBldgId(''); setSearchAptQuery(''); }}
                          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <X className="ic" />
                        </button>
                      )}
                    </div>
                  </Field>

                  {isAptDropdownOpen && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setIsAptDropdownOpen(false)} />
                      <div style={{ position: 'absolute', left: 0, right: 0, marginTop: 4, borderRadius: 12, border: '1px solid var(--border)', padding: 10, maxHeight: 250, overflowY: 'auto', zIndex: 20, background: 'var(--surface)', boxShadow: '0 10px 30px rgba(0,0,0,0.12)' }}>
                        {/* Project/building sub-filters */}
                        <div style={{ display: 'flex', gap: 6, paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                          <select value={projId} onChange={e => { setProjId(e.target.value); setBldgId(''); setApartmentId(''); }}
                            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', outline: 'none' }}>
                            <option value="">{t('pmResidents.allProjectsFilter')}</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <select value={bldgId} disabled={!projId} onChange={e => { setBldgId(e.target.value); setApartmentId(''); }}
                            style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-1)', outline: 'none', opacity: !projId ? 0.5 : 1 }}>
                            <option value="">{t('pmResidents.allBuildingsFilter')}</option>
                            {buildingsForSelectedProj.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </div>

                        {filteredApartmentsForSelector.length === 0 ? (
                          <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '16px 0', fontSize: 12 }}>{t('pmResidents.aptNotFound')}</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {filteredApartmentsForSelector.map(a => {
                              const isSelected = a.id === apartmentId;
                              return (
                                <button key={a.id} type="button"
                                  onClick={() => {
                                    setApartmentId(a.id);
                                    let foundProjId = '';
                                    for (const p of projects) {
                                      if (p.buildings.some(b => b.id === a.pm_building_id)) { foundProjId = p.id; break; }
                                    }
                                    setProjId(foundProjId); setBldgId(a.pm_building_id); setIsAptDropdownOpen(false);
                                  }}
                                  style={{ textAlign: 'left', borderRadius: 10, padding: '8px 12px', fontSize: 12, background: isSelected ? 'var(--brand-tint)' : 'transparent', border: isSelected ? '1px solid var(--brand)' : '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div>
                                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>№{a.number}</span>
                                    <span style={{ fontSize: 10, marginLeft: 8, padding: '1px 6px', borderRadius: 6, background: 'var(--bg)', color: 'var(--text-3)' }}>{a.floor}-qavat</span>
                                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{a.buildingName} · {a.projectName}</div>
                                  </div>
                                  {isSelected && <span style={{ color: 'var(--brand)', fontWeight: 700 }}>✓</span>}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label={t('pmResidents.phone')}>
                    <TextInput type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+998 90..." />
                  </Field>
                  <Field label={t('pmResidents.email')}>
                    <TextInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label={t('pmResidents.telegram')}>
                    <TextInput type="text" value={telegramUsername} onChange={e => setTelegramUsername(e.target.value)} placeholder="alibek" />
                  </Field>
                  <Field label={`${t('pmResidents.type')} *`}>
                    <PmSelect required value={residentType} onChange={e => setResidentType(e.target.value as any)}>
                      <option value="owner">{t('pmResidents.owner')}</option>
                      <option value="tenant">{t('pmResidents.tenant')}</option>
                      <option value="family">{t('pmResidents.family')}</option>
                    </PmSelect>
                  </Field>
                </div>

                <Field label={t('pmResidents.moveInDate')}>
                  <TextInput type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)} />
                </Field>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <Btn variant="ghost" block type="button" onClick={() => setShowModal(false)}>{t('pmResidents.cancel')}</Btn>
                  <Btn variant="primary" block type="submit" disabled={submitting} icon={submitting ? Loader2 : undefined}>
                    {editingResident ? t('pmResidents.save') : t('pmResidents.add')}
                  </Btn>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ApartmentDetailDrawer apartmentId={drawerId} onClose={() => setDrawerId(null)} />
    </AppShell>
  );
}
