import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Calculator } from 'lucide-react';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Btn, Badge, Field, TextInput, PmSelect, EmptyState,
  Plus, Search, Home, Loader2, Edit2, Trash2, X,
} from '@/Components/pm/ui';
import type { BadgeTone } from '@/Components/pm/ui';

interface Apartment {
  id:          string;
  number:      string;
  floor:       number;
  rooms:       number;
  area:        string | number | null;
  price:       string | number | null;
  status:      'available' | 'reserved' | 'sold';
  type:        string | null;
  building_id: string;
  building:    string;
  project:     string;
  monthly_fee_per_sqm: number;
}

interface Project {
  id:   string;
  name: string;
}

interface Building {
  id:         string;
  name:       string;
  project_id: string;
}

interface Props {
  apartments: Apartment[];
  projects:   Project[];
  buildings:  Building[];
}

const STATUS_TONE: Record<string, BadgeTone> = { available: 'violet', reserved: 'warn', sold: 'ok' };
const STATUS_LABEL_KEY: Record<string, string> = {
  available: 'apartments.statusAvailable',
  reserved:  'apartments.statusReserved',
  sold:      'apartments.statusSold',
};

const ALL_STATUSES = ['available', 'reserved', 'sold'] as const;

export default function Index({ apartments, projects, buildings }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>('all');

  const { url } = usePage();
  const queryParams = new URLSearchParams(url.split('?')[1] || '');
  const [searchProjectId, setSearchProjectId] = useState(queryParams.get('project_id') || '');
  const [searchBuildingId, setSearchBuildingId] = useState(queryParams.get('building_id') || '');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingApt, setEditingApt] = useState<Apartment | null>(null);

  // Form State
  const [projectId, setProjectId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [floor, setFloor] = useState('');
  const [number, setNumber] = useState('');
  const [rooms, setRooms] = useState('2');
  const [area, setArea] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<'available' | 'reserved' | 'sold'>('available');
  const [type, setType] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Cascade buildings based on selected project
  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => !projectId || b.project_id === projectId);
  }, [buildings, projectId]);

  function openCreateModal() {
    setEditingApt(null);
    setProjectId(''); setBuildingId(''); setFloor(''); setNumber('');
    setRooms('2'); setArea(''); setPrice(''); setStatus('available'); setType(''); setNotes('');
    setShowModal(true);
  }

  function openEditModal(apt: Apartment) {
    const bld = buildings.find((b) => b.id === apt.building_id);
    setEditingApt(apt);
    setProjectId(bld ? bld.project_id : '');
    setBuildingId(apt.building_id);
    setFloor(String(apt.floor));
    setNumber(apt.number);
    setRooms(String(apt.rooms));
    setArea(apt.area ? String(apt.area) : '');
    setPrice(apt.price ? String(apt.price) : '');
    setStatus(apt.status);
    setType(apt.type || '');
    setNotes('');
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      building_id: buildingId,
      floor:       Number(floor),
      number:      number.trim(),
      rooms:       Number(rooms),
      area:        area ? Number(area) : null,
      price:       price ? Number(price) : null,
      status:      status,
      type:        type || null,
      notes:       notes || null,
    };

    if (editingApt) {
      router.put(`/apartments/${editingApt.id}`, payload, {
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    } else {
      router.post('/apartments', payload, {
        onSuccess: () => { setShowModal(false); setSubmitting(false); },
        onError:   () => setSubmitting(false),
      });
    }
  }

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this apartment?')) {
      router.delete(`/apartments/${id}`, { preserveScroll: true });
    }
  }

  const filtered = useMemo(() => {
    return apartments.filter((a) => {
      const matchSearch =
        !search ||
        a.number.toLowerCase().includes(search.toLowerCase()) ||
        a.building.toLowerCase().includes(search.toLowerCase()) ||
        a.project.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [apartments, search, statusFilter]);

  const counts = useMemo(() => {
    return apartments.reduce<Record<string, number>>((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});
  }, [apartments]);

  const pricePerM2 = useMemo(() => {
    const p = parseFloat(price);
    const s = parseFloat(area);
    if (!isNaN(p) && !isNaN(s) && s > 0) return Math.round(p / s);
    return null;
  }, [price, area]);

  return (
    <AppShell>
      <Head title={t('apartments.title') + ' — 1Mahalla'} />
      <div className="page">
        <PageHead
          title={t('apartments.title')}
          sub={`${filtered.length} / ${apartments.length}`}
          actions={<Btn variant="primary" icon={Plus} onClick={openCreateModal}>{t('apartments.newApartment')}</Btn>}
        />

        {/* Filters */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px', maxWidth: 320 }}>
              <Field><TextInput icon={Search} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('apartments.searchPlaceholder')} /></Field>
            </div>
            <Field label={t('apartments.project')}>
              <PmSelect value={searchProjectId} onChange={e => {
                setSearchProjectId(e.target.value);
                setSearchBuildingId('');
                router.get('/apartments', { project_id: e.target.value, building_id: '' }, { preserveState: true });
              }}>
                <option value="">{t('apartments.allProjects')}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </PmSelect>
            </Field>
            <Field label={t('apartments.building')}>
              <PmSelect value={searchBuildingId} disabled={!searchProjectId} onChange={e => {
                setSearchBuildingId(e.target.value);
                router.get('/apartments', { project_id: searchProjectId, building_id: e.target.value }, { preserveState: true });
              }}>
                <option value="">{t('apartments.allBuildings')}</option>
                {buildings.filter(b => b.project_id === searchProjectId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </PmSelect>
            </Field>
          </div>
        </div>

        {/* Status filter chips */}
        <div className="chip-row" style={{ marginBottom: 18 }}>
          {(['all', ...ALL_STATUSES] as const).map(s => {
            const count = s === 'all' ? apartments.length : (counts[s] ?? 0);
            const label = s === 'all' ? t('apartments.allStatuses') : t(STATUS_LABEL_KEY[s]);
            return (
              <button key={s} className={`chip ${statusFilter === s ? 'on' : ''}`} onClick={() => setStatusFilter(s)}>
                {label}<span className="cnt">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="table-card">
          {filtered.length === 0 ? (
            <EmptyState icon={Home} title={t('apartments.noApartments')} />
          ) : (
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('apartments.colNum')}</th>
                    <th>{t('apartments.colBuilding')}/{t('apartments.colProject')}</th>
                    <th>{t('apartments.colFloor')}</th>
                    <th>{t('apartments.colRooms')}</th>
                    <th>{t('apartments.colArea')}</th>
                    <th>{t('apartments.colPrice')}</th>
                    <th>$/m²</th>
                    <th>{t('apartments.colStatus')}</th>
                    <th>{t('apartments.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(apt => {
                    const ppm2 = apt.area && Number(apt.area) > 0 && apt.price
                      ? Math.round(Number(apt.price) / Number(apt.area)).toLocaleString()
                      : '—';
                    return (
                      <tr key={apt.id}>
                        <td className="mono cell-strong">#{apt.number}</td>
                        <td>
                          <div className="cell-strong" style={{ fontSize: 13 }}>{apt.building}</div>
                          <div className="cell-sub">{apt.project}</div>
                        </td>
                        <td>{t('apartments.floorLabel')} {apt.floor}</td>
                        <td>{apt.rooms}</td>
                        <td>{apt.area || '—'} m²</td>
                        <td className="cell-strong">{apt.price ? `$${Number(apt.price).toLocaleString()}` : '—'}</td>
                        <td className="mono cell-sub">{ppm2 !== '—' ? `$${ppm2}` : ppm2}</td>
                        <td><Badge tone={STATUS_TONE[apt.status] ?? 'neutral'}>{t(STATUS_LABEL_KEY[apt.status] ?? 'apartments.statusAvailable')}</Badge></td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-act" onClick={() => openEditModal(apt)}><Edit2 className="ic" /></button>
                            <button className="icon-act danger" onClick={() => handleDelete(apt.id)}><Trash2 className="ic" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="scrim show" onClick={() => setShowModal(false)}>
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={e => e.stopPropagation()}>
            <div className="card card-pad" style={{ width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontWeight: 700, fontSize: 16 }}>{editingApt ? 'Edit Apartment' : 'New Apartment'}</h2>
                <button className="drawer-close" onClick={() => setShowModal(false)}><X className="ic" /></button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {!editingApt && (
                  <Field label="Project">
                    <PmSelect value={projectId} onChange={e => { setProjectId(e.target.value); setBuildingId(''); }} required>
                      <option value="">Select project...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </PmSelect>
                  </Field>
                )}

                {!editingApt && (
                  <Field label="Building">
                    <PmSelect value={buildingId} onChange={e => setBuildingId(e.target.value)} required disabled={!projectId}>
                      <option value="">Select building...</option>
                      {filteredBuildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </PmSelect>
                  </Field>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Floor">
                    <TextInput type="number" required min={1} value={floor} onChange={e => setFloor(e.target.value)} placeholder="e.g. 5" />
                  </Field>
                  <Field label="Unit Number">
                    <TextInput type="text" required value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. 154" />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Rooms">
                    <TextInput type="number" required min={0} value={rooms} onChange={e => setRooms(e.target.value)} />
                  </Field>
                  <Field label="Status">
                    <PmSelect value={status} onChange={e => setStatus(e.target.value as any)}>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{t(STATUS_LABEL_KEY[s])}</option>)}
                    </PmSelect>
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Size (m²)">
                    <TextInput type="number" step="0.01" value={area} onChange={e => setArea(e.target.value)} placeholder="e.g. 74.20" />
                  </Field>
                  <Field label="Price (USD)">
                    <TextInput type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 85000" />
                  </Field>
                </div>

                <div className="hint info">
                  <Calculator className="ic" />
                  <span>Calculated price per m²:</span>
                  {pricePerM2 ? (
                    <strong style={{ marginLeft: 'auto' }}>${pricePerM2.toLocaleString()} / m²</strong>
                  ) : (
                    <span style={{ marginLeft: 'auto' }}>Fill size & price</span>
                  )}
                </div>

                <Field label="Apartment Type">
                  <TextInput type="text" value={type} onChange={e => setType(e.target.value)} placeholder="e.g. Studio, Penthouse" />
                </Field>

                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <Btn variant="ghost" block type="button" onClick={() => setShowModal(false)}>Cancel</Btn>
                  <Btn variant="primary" block type="submit" disabled={submitting} icon={submitting ? Loader2 : undefined}>
                    {editingApt ? 'Save Changes' : 'Create Unit'}
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
