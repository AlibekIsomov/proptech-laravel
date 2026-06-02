import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Search, Home, ChevronDown, Plus, X, Loader2, Calculator, Edit, Trash2 } from 'lucide-react';
import AppShell from '@/Components/AppShell';

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

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: '#1e1b4b', text: '#a5b4fc', label: 'Available' },
  reserved:  { bg: '#1c1003', text: '#fbbf24', label: 'Reserved'  },
  sold:      { bg: '#052e16', text: '#34d399', label: 'Sold'       },
};

const ALL_STATUSES = ['available', 'reserved', 'sold'];

export default function Index({ apartments, projects, buildings }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>('all');

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

  const openCreateModal = () => {
    setEditingApt(null);
    setProjectId('');
    setBuildingId('');
    setFloor('');
    setNumber('');
    setRooms('2');
    setArea('');
    setPrice('');
    setStatus('available');
    setType('');
    setNotes('');
    setShowModal(true);
  };

  const openEditModal = (apt: Apartment) => {
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
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
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
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    } else {
      router.post('/apartments', payload, {
        onSuccess: () => {
          setShowModal(false);
          setSubmitting(false);
        },
        onError: () => setSubmitting(false),
      });
    }
  };

  const handleStatusChange = (id: string, newStatus: any) => {
    router.put(`/apartments/${id}`, {
      status: newStatus,
      // Pass other fields required or let backend handle simple status change
    }, {
      preserveScroll: true,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this apartment?')) {
      router.delete(`/apartments/${id}`, {
        preserveScroll: true,
      });
    }
  };

  // Filter apartments
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

  // Area price calculator helper
  const pricePerM2 = useMemo(() => {
    const p = parseFloat(price);
    const s = parseFloat(area);
    if (!isNaN(p) && !isNaN(s) && s > 0) return Math.round(p / s);
    return null;
  }, [price, area]);

  return (
    <AppShell>
      <Head title="Apartments - 1Mahalla" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Apartments</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            Showing {filtered.length} of {apartments.length} total units
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <Search className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Search apartment, building..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 w-44 md:w-56"
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-3 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            <Plus className="w-4 h-4" />
            New Unit
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Status filter pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {(['all', 'available', 'reserved', 'sold'] as const).map((s) => {
            const active = statusFilter === s;
            const count = s === 'all' ? apartments.length : (counts[s] ?? 0);
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="flex items-center gap-2 text-xs px-4 py-2 rounded-full border transition-all"
                style={{
                  backgroundColor: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  borderColor:     active ? '#6366f1' : 'var(--border)',
                  color:           active ? '#a5b4fc' : 'var(--muted)',
                }}
              >
                <span className="capitalize">{s}</span>
                <span className="inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: active ? '#6366f1' : 'var(--border)', color: 'white' }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table representation */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Home className="w-10 h-10" style={{ color: 'var(--border)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>No apartments found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Number', 'Building/Project', 'Floor', 'Rooms', 'Size (m²)', 'Price', '$/m²', 'Monthly Fee', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((apt) => {
                    const cfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.available;
                    const ppm2 = apt.area && Number(apt.area) > 0 && apt.price
                      ? Math.round(Number(apt.price) / Number(apt.area)).toLocaleString()
                      : '—';
                    const monthlyFee = apt.area && apt.monthly_fee_per_sqm
                      ? (Number(apt.area) * Number(apt.monthly_fee_per_sqm)).toFixed(2)
                      : '—';
                    return (
                      <tr key={apt.id} className="transition-all hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800 font-mono">#{apt.number}</td>
                        <td className="px-6 py-4 text-xs">
                          <p className="text-slate-800 font-medium">{apt.building}</p>
                          <p style={{ color: 'var(--muted)' }}>{apt.project}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-800">Floor {apt.floor}</td>
                        <td className="px-6 py-4 text-xs text-slate-800">{apt.rooms} rooms</td>
                        <td className="px-6 py-4 text-xs text-slate-800">{apt.area || '—'} m²</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                          {apt.price ? `$${Number(apt.price).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono" style={{ color: 'var(--muted)' }}>
                          {ppm2 !== '—' ? `$${ppm2}` : ppm2}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-800">
                          {monthlyFee !== '—' ? `$${monthlyFee}` : '—'}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: cfg.bg, color: cfg.text }}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => openEditModal(apt)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-white transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(apt.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-400 transition-colors"
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

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-lg rounded-2xl border p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">
                {editingApt ? 'Edit Apartment' : 'New Apartment'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project selector */}
              {!editingApt && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Project</label>
                  <select
                    value={projectId}
                    onChange={(e) => {
                      setProjectId(e.target.value);
                      setBuildingId('');
                    }}
                    required
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    <option value="">Select project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Building Selector */}
              {!editingApt && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Building</label>
                  <select
                    value={buildingId}
                    onChange={(e) => setBuildingId(e.target.value)}
                    required
                    disabled={!projectId}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none disabled:opacity-50"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    <option value="">Select building...</option>
                    {filteredBuildings.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Floor number */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Floor</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* Unit number */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Unit Number</label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="e.g. 154"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Rooms count */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Rooms</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={rooms}
                    onChange={(e) => setRooms(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* Status selector */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Size */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Size (m²)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. 74.20"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Price (USD)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 85000"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                  />
                </div>
              </div>

              {/* Price per m2 calculator */}
              <div
                className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <Calculator className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="text-xs text-slate-400">Calculated price per m²:</span>
                {pricePerM2 ? (
                  <span className="text-xs font-bold text-slate-800 ml-auto">${pricePerM2.toLocaleString()} / m²</span>
                ) : (
                  <span className="text-xs text-slate-600 ml-auto">Fill size & price</span>
                )}
              </div>

              {/* Apartment Type */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">Apartment Type</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="e.g. Studio, Penthouse"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-none"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-all text-slate-400"
                  style={{ border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingApt ? 'Save Changes' : 'Create Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
