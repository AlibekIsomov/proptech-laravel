import { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Loader2, Phone, Mail, Send, X, ShieldAlert, Home, Edit, Trash2 } from 'lucide-react';
import AppShell from '@/Components/AppShell';
import ApartmentDetailDrawer from '@/Components/pm/ApartmentDetailDrawer';

interface Resident {
  id:                string;
  full_name:          string;
  phone:              string | null;
  email:              string | null;
  telegram_username:  string | null;
  resident_type:      'owner' | 'tenant' | 'family';
  move_in_date:      string | null;
  is_active:        boolean;
  apartment_id:       string;
  pm_building_id?:       string;
  pm_project_id?:        string;
  apartment:        string;
  building:         string;
  project:          string;
}

interface BuildingOption {
  id:   string;
  name: string;
}

interface ProjectOption {
  id:        string;
  name:      string;
  buildings: BuildingOption[];
}

interface ApartmentOption {
  id:          string;
  number:      string;
  pm_building_id: string;
  floor:       number;
}

interface Props {
  residents:  Resident[];
  projects:   ProjectOption[];
  apartments: ApartmentOption[];
}

const TYPE_KEYS = {
  owner:  'pmResidents.owner',
  tenant: 'pmResidents.tenant',
  family: 'pmResidents.family',
};

const TYPE_COLOR = {
  owner:  { bg: 'rgba(16,185,129,0.12)', text: '#6ee7b7' },
  tenant: { bg: 'rgba(59,130,246,0.12)', text: '#93c5fd' },
  family: { bg: 'rgba(168,85,247,0.12)', text: '#c4b5fd' },
};

export default function Index({ residents, projects, apartments }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);

  // Form State
  const [apartmentId, setApartmentId] = useState('');
  const [projId, setProjId] = useState('');
  const [bldgId, setBldgId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [residentType, setResidentType] = useState<'owner' | 'tenant' | 'family'>('owner');
  const [moveInDate, setMoveInDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Custom states for smart autocomplete
  const [searchAptQuery, setSearchAptQuery] = useState('');
  const [isAptDropdownOpen, setIsAptDropdownOpen] = useState(false);

  // Map apartments with context
  const apartmentsWithContext = useMemo(() => {
    return apartments.map((apt) => {
      let buildingName = '';
      let projectName = '';
      for (const p of projects) {
        const b = p.buildings.find((b) => b.id === apt.pm_building_id);
        if (b) {
          buildingName = b.name;
          projectName = p.name;
          break;
        }
      }
      return {
        ...apt,
        buildingName,
        projectName,
      };
    });
  }, [apartments, projects]);

  const selectedAptObj = useMemo(() => {
    if (!apartmentId) return null;
    return apartmentsWithContext.find(a => a.id === apartmentId);
  }, [apartmentId, apartmentsWithContext]);

  const buildingsForSelectedProj = useMemo(() => {
    if (!projId) return [];
    const proj = projects.find(p => p.id === projId);
    return proj ? proj.buildings : [];
  }, [projId, projects]);

  const apartmentsForSelectedBldg = useMemo(() => {
    if (!bldgId) return [];
    return apartments.filter(a => a.pm_building_id === bldgId);
  }, [bldgId, apartments]);

  const filteredApartmentsForSelector = useMemo(() => {
    let result = apartmentsWithContext;
    if (projId) {
      const proj = projects.find(p => p.id === projId);
      const bldgIds = proj ? proj.buildings.map(b => b.id) : [];
      result = result.filter(a => bldgIds.includes(a.pm_building_id));
    }
    if (bldgId) {
      result = result.filter(a => a.pm_building_id === bldgId);
    }
    if (searchAptQuery.trim()) {
      const q = searchAptQuery.toLowerCase();
      result = result.filter(a => 
        a.number.toLowerCase().includes(q) ||
        a.buildingName.toLowerCase().includes(q) ||
        a.projectName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [apartmentsWithContext, projId, bldgId, searchAptQuery, projects]);

  const openCreateModal = () => {
    setEditingResident(null);
    setProjId('');
    setBldgId('');
    setApartmentId('');
    setSearchAptQuery('');
    setIsAptDropdownOpen(false);
    setFullName('');
    setPhone('');
    setEmail('');
    setTelegramUsername('');
    setResidentType('owner');
    setMoveInDate('');
    setShowModal(true);
  };

  const openEditModal = (r: Resident) => {
    setEditingResident(r);
    setProjId(r.pm_project_id || '');
    setBldgId(r.pm_building_id || '');
    setApartmentId(r.apartment_id);
    setSearchAptQuery('');
    setIsAptDropdownOpen(false);
    setFullName(r.full_name);
    setPhone(r.phone || '');
    setEmail(r.email || '');
    setTelegramUsername(r.telegram_username || '');
    setResidentType(r.resident_type);
    setMoveInDate(r.move_in_date || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      apartment_id:      apartmentId,
      full_name:         fullName.trim(),
      phone:             phone.trim() || null,
      email:             email.trim() || null,
      telegram_username: telegramUsername.trim() || null,
      resident_type:     residentType,
      move_in_date:      moveInDate || null,
    };

    if (editingResident) {
      router.put(`/pm/residents/${editingResident.id}`, { ...payload, is_active: true }, {
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    } else {
      router.post('/pm/residents', payload, {
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to archive/remove this resident?')) {
      router.delete(`/pm/residents/${id}`);
    }
  };

  // Filter residents list
  const filtered = useMemo(() => {
    return residents.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        r.full_name.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(search)) ||
        (r.email && r.email.toLowerCase().includes(q)) ||
        (r.apartment && r.apartment.toLowerCase().includes(q)) ||
        (r.building && r.building.toLowerCase().includes(q)) ||
        (r.project && r.project.toLowerCase().includes(q));

      const matchType = !filterType || r.resident_type === filterType;

      return matchSearch && matchType;
    });
  }, [residents, search, filterType]);

  return (
    <AppShell>
      <Head title="PM — 1Mahalla" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'rgba(16,185,129,0.12)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#10b981' }}>
            {t('common.propertyMgmt')}
          </p>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">{t('pmResidents.title')}</h1>
          <p className="text-xs mt-1 text-slate-500">
            {filtered.length} {t('pmResidents.showingOf')} {residents.length} {t('pmResidents.from')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2 bg-white"
            style={{ border: '1px solid rgba(16,185,129,0.15)' }}>
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('common.search') + '...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 w-44 md:w-56 border-none p-0 focus:ring-0 focus:outline-none"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-3 rounded-xl transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
          >
            <Plus className="w-4 h-4" />
            {t('pmResidents.addResident')}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Filters Select */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span>{t('pmResidents.filterByType')}</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-xl px-3 py-2 text-xs text-slate-800 outline-none cursor-pointer bg-white"
              style={{ border: '1px solid rgba(16,185,129,0.15)' }}
            >
              <option value="">{t('pmResidents.allTypes')}</option>
              <option value="owner">{t('pmResidents.owner')}</option>
              <option value="tenant">{t('pmResidents.tenant')}</option>
              <option value="family">{t('pmResidents.family')}</option>
            </select>
          </label>
        </div>

        {/* Table representation */}
        <div className="rounded-2xl border overflow-hidden bg-white"
          style={{ borderColor: 'rgba(16,185,129,0.12)' }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Home className="w-10 h-10 text-slate-300" />
              <p className="text-sm text-slate-400">{t('pmResidents.noResidents')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(16,185,129,0.12)' }}>
                    {[t('pmResidents.colUser'), t('pmResidents.colContacts'), t('pmResidents.colType'), t('pmResidents.colApartment'), t('pmResidents.colBuilding'), t('pmResidents.colActions')].map((h) => (
                      <th key={h} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((r) => {
                    const c = TYPE_COLOR[r.resident_type] || TYPE_COLOR.owner;
                    const typeLabel = t(TYPE_KEYS[r.resident_type] ?? 'pmResidents.owner');
                    const typeTextColors: Record<string, string> = {
                      owner: '#047857',
                      tenant: '#1d4ed8',
                      family: '#7c3aed'
                    };
                    return (
                      <tr key={r.id} className="transition-all hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 text-slate-800"
                              style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}>
                              {r.full_name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-slate-800">{r.full_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {r.phone && <p className="text-slate-700 flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" />{r.phone}</p>}
                          {r.email && <p className="text-slate-500 flex items-center gap-1.5 mt-0.5"><Mail className="w-3 h-3 text-slate-400" />{r.email}</p>}
                          {r.telegram_username && <p className="text-emerald-700 flex items-center gap-1.5 mt-0.5"><Send className="w-3 h-3 text-emerald-400" />@{r.telegram_username}</p>}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: c.bg, color: typeTextColors[r.resident_type] || c.text }}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-800">
                          <span className="font-mono font-semibold">№{r.apartment}</span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <p className="text-slate-800 font-medium">{r.building}</p>
                          <p className="text-slate-400">{r.project}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => setDrawerId(r.apartment_id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-500/20 text-emerald-600 hover:text-slate-800 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all cursor-pointer"
                            >
                              {t('pmResidents.viewApartment')}
                            </button>
                            <button
                              onClick={() => openEditModal(r)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6 max-h-[90vh] overflow-y-auto bg-white shadow-2xl"
            style={{ borderColor: 'rgba(16,185,129,0.15)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">
                {editingResident ? t('pmResidents.editResident') : t('pmResidents.newResident')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-500">{t('pmResidents.fullName')} *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masalan: Alibek Isomov"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none bg-white border-slate-200 focus:border-emerald-500"
                  style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                />
              </div>

              {/* Smart Apartment Autocomplete Selector */}
              <div className="relative">
                <label className="block text-xs font-semibold mb-1.5 text-slate-500">{t('pmResidents.apartment')} *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={
                      isAptDropdownOpen 
                        ? searchAptQuery 
                        : selectedAptObj 
                          ? `№${selectedAptObj.number} · ${selectedAptObj.buildingName} (${selectedAptObj.projectName})`
                          : ''
                    }
                    onChange={(e) => {
                      setSearchAptQuery(e.target.value);
                      setIsAptDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setIsAptDropdownOpen(true);
                      setSearchAptQuery('');
                    }}
                    placeholder={t('pmResidents.aptPlaceholder')}
                    className="w-full rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-slate-800 outline-none transition-all bg-white"
                    style={{ 
                      border: '1px solid rgba(16,185,129,0.15)',
                      borderColor: isAptDropdownOpen ? '#10b981' : 'rgba(16,185,129,0.15)',
                      boxShadow: isAptDropdownOpen ? '0 0 12px rgba(16,185,129,0.08)' : 'none'
                    }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {apartmentId && (
                      <button
                        type="button"
                        onClick={() => {
                          setApartmentId('');
                          setProjId('');
                          setBldgId('');
                          setSearchAptQuery('');
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-slate-400 text-[10px] select-none">▼</span>
                  </div>
                </div>

                {isAptDropdownOpen && (
                  <>
                    {/* Backdrop to close dropdown on click-away */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsAptDropdownOpen(false)} />
                    
                    <div 
                      className="absolute left-0 right-0 mt-1.5 rounded-xl border p-2.5 max-h-[250px] overflow-y-auto z-20 shadow-2xl transition-all bg-white"
                      style={{ 
                        borderColor: 'rgba(16,185,129,0.15)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
                      }}
                    >
                      {/* Optional structural step-by-step browsing inside dropdown */}
                      <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-100 text-[10px]">
                        <span className="text-slate-400 font-semibold select-none font-sans">Süzgich:</span>
                        
                        <select
                          value={projId}
                          onChange={(e) => {
                            setProjId(e.target.value);
                            setBldgId('');
                            setApartmentId('');
                          }}
                          className="bg-slate-50 text-[10px] text-slate-700 px-2 py-1 rounded border border-slate-200 outline-none cursor-pointer"
                        >
                          <option value="">{t('pmResidents.allProjectsFilter')}</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
 
                        <select
                          value={bldgId}
                          onChange={(e) => {
                            setBldgId(e.target.value);
                            setApartmentId('');
                          }}
                          disabled={!projId}
                          className="bg-slate-50 text-[10px] text-slate-700 px-2 py-1 rounded border border-slate-200 outline-none disabled:opacity-50 cursor-pointer"
                        >
                          <option value="">{t('pmResidents.allBuildingsFilter')}</option>
                          {buildingsForSelectedProj.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Filtered list of apartments with full context subtitle */}
                      {filteredApartmentsForSelector.length === 0 ? (
                        <div className="text-center text-xs text-slate-400 py-6 select-none">
                          {t('pmResidents.aptNotFound')}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {filteredApartmentsForSelector.map((a) => {
                            const isSelected = a.id === apartmentId;
                            return (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => {
                                  setApartmentId(a.id);
                                  
                                  // Find the correct project ID automatically
                                  let foundProjId = '';
                                  for (const p of projects) {
                                    if (p.buildings.some(b => b.id === a.pm_building_id)) {
                                      foundProjId = p.id;
                                      break;
                                    }
                                  }
                                  setProjId(foundProjId);
                                  setBldgId(a.pm_building_id);
                                  setIsAptDropdownOpen(false);
                                }}
                                className="w-full text-left rounded-lg px-3 py-2 text-xs transition-all flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                                style={{
                                  backgroundColor: isSelected ? 'rgba(16,185,129,0.08)' : 'transparent',
                                  border: isSelected ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent'
                                }}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-800 text-sm">№{a.number}</span>
                                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-[9px] text-slate-500">
                                      {a.floor}-qavat
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                    {a.buildingName} <span className="text-slate-300 select-none">·</span> {a.projectName}
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className="text-emerald-500 font-bold shrink-0 text-sm pl-2">✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-500">{t('pmResidents.phone')}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+998 90..."
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none bg-white"
                    style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-500">{t('pmResidents.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none bg-white"
                    style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Telegram Username */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-500">{t('pmResidents.telegram')}</label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="Masalan: alibek"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none bg-white"
                    style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                  />
                </div>

                {/* Resident Type */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-500">{t('pmResidents.type')} *</label>
                  <select
                    value={residentType}
                    onChange={(e) => setResidentType(e.target.value as any)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none bg-white"
                    style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                  >
                    <option value="owner">{t('pmResidents.owner')}</option>
                    <option value="tenant">{t('pmResidents.tenant')}</option>
                    <option value="family">{t('pmResidents.family')}</option>
                  </select>
                </div>
              </div>

              {/* Move-in Date */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-500">{t('pmResidents.moveInDate')}</label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none bg-white"
                  style={{ border: '1px solid rgba(16,185,129,0.15)' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all text-slate-400 border border-slate-200 cursor-pointer"
                >
                  {t('pmResidents.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingResident ? t('pmResidents.save') : t('pmResidents.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer */}
      <ApartmentDetailDrawer
        apartmentId={drawerId}
        onClose={() => setDrawerId(null)}
      />
    </AppShell>
  );
}

