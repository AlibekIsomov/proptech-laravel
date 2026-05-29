import { useState, useMemo, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { Inbox, Loader, CheckCircle2, AlarmClock, Search, Loader2, ChevronRight, AlertTriangle, UserPlus, X, Sparkles, Phone, ShieldAlert, Check, Plus } from 'lucide-react';
import AppShell from '@/Components/AppShell';

interface MaintenanceRequest {
  id:                    string;
  title:                 string;
  description:           string;
  category:              string | null;
  priority:              'low' | 'medium' | 'high' | 'emergency';
  status:                'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  ai_category_suggested: string | null;
  ai_priority_suggested: string | null;
  ai_summary:            string | null;
  apartment:             string | null;
  building:              string | null;
  resident:              string | null;
  assigned_vendor_id:    string | null;
  vendor:                string | null;
  dispatcher:            string | null;
  cost_amount:           number | null;
  resident_rating:       number | null;
  sla_deadline:          string | null;
  created_at:            string;
  assigned_at:           string | null;
  completed_at:          string | null;
}

interface Vendor {
  id:              string;
  name:            string;
  specializations: string[];
  rating:          number;
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
  building_id: string;
  floor:       number;
}

interface ResidentOption {
  id:           string;
  full_name:    string;
  apartment_id: string;
}

interface Props {
  requests:   MaintenanceRequest[];
  vendors:    Vendor[];
  projects:   ProjectOption[];
  apartments: ApartmentOption[];
  residents:  ResidentOption[];
}

const PRIORITY_COLOR = {
  emergency: { bg: 'rgba(239,68,68,0.18)',   text: '#fca5a5', label: 'Emergency', rank: 0 },
  high:      { bg: 'rgba(251,146,60,0.15)',  text: '#fdba74', label: 'High',      rank: 1 },
  medium:    { bg: 'rgba(59,130,246,0.15)',  text: '#93c5fd', label: 'Medium',    rank: 2 },
  low:       { bg: 'rgba(100,116,139,0.15)', text: '#94a3b8', label: 'Low',       rank: 3 },
};

const STATUS_COLOR = {
  open:        { bg: 'rgba(251,191,36,0.12)', text: '#fcd34d', label: 'Open' },
  assigned:    { bg: 'rgba(168,85,247,0.12)', text: '#c4b5fd', label: 'Assigned' },
  in_progress: { bg: 'rgba(59,130,246,0.12)', text: '#93c5fd', label: 'In Progress' },
  completed:   { bg: 'rgba(16,185,129,0.12)', text: '#6ee7b7', label: 'Completed' },
  cancelled:   { bg: 'rgba(100,116,139,0.10)', text: '#64748b', label: 'Cancelled' },
};

const CATEGORY_RU: Record<string, string> = {
  plumbing:   'Plumbing',
  electrical: 'Electrical',
  heating:    'Heating',
  cleaning:   'Cleaning',
  elevator:   'Elevator',
  appliance:  'Appliances',
  structural: 'Structural',
  other:      'Other',
};

export default function Index({ requests, vendors, projects, apartments, residents }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MaintenanceRequest['status']>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | MaintenanceRequest['priority']>('all');

  const [now, setNow] = useState(Date.now());
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null);

  // Assignment Modal
  const [assignReq, setAssignReq] = useState<MaintenanceRequest | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // AI run states
  const [aiRunning, setAiRunning] = useState(false);

  // Create Request Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createCategory, setCreateCategory] = useState('');
  const [createPriority, setCreatePriority] = useState<'low' | 'medium' | 'high' | 'emergency'>('medium');
  const [createProjId, setCreateProjId] = useState('');
  const [createBldgId, setCreateBldgId] = useState('');
  const [createAptId, setCreateAptId] = useState('');
  const [createResidentId, setCreateResidentId] = useState('');
  const [createVendorId, setCreateVendorId] = useState('');
  const [creating, setCreating] = useState(false);

  const buildingsForSelectedCreateProj = useMemo(() => {
    if (!createProjId) return [];
    const proj = projects.find(p => p.id === createProjId);
    return proj ? proj.buildings : [];
  }, [createProjId, projects]);

  const apartmentsForSelectedCreateBldg = useMemo(() => {
    if (!createBldgId) return [];
    return apartments.filter(a => a.building_id === createBldgId);
  }, [createBldgId, apartments]);

  const filteredResidentsForCreate = useMemo(() => {
    if (!createAptId) return [];
    return residents.filter(r => r.apartment_id === createAptId);
  }, [createAptId, residents]);

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    router.post('/pm/requests', {
      title:              createTitle,
      description:        createDesc,
      category:           createCategory || null,
      priority:           createPriority,
      apartment_id:       createAptId,
      resident_id:        createResidentId || null,
      assigned_vendor_id: createVendorId || null,
    }, {
      onSuccess: () => {
        setShowCreateModal(false);
        setCreateTitle('');
        setCreateDesc('');
        setCreateCategory('');
        setCreatePriority('medium');
        setCreateProjId('');
        setCreateBldgId('');
        setCreateAptId('');
        setCreateResidentId('');
        setCreateVendorId('');
        setCreating(false);
      },
      onError: () => setCreating(false),
    });
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const metrics = useMemo(() => {
    let open = 0, inProgress = 0, completed = 0, overdue = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const r of requests) {
      if (r.status === 'open' || r.status === 'assigned') open++;
      if (r.status === 'in_progress') inProgress++;
      if (r.status === 'completed') completed++;
      if (r.sla_deadline && r.status !== 'completed' && r.status !== 'cancelled') {
        if (new Date(r.sla_deadline).getTime() < now) overdue++;
      }
    }
    return { open, inProgress, completed, overdue };
  }, [requests, now]);

  const filtered = useMemo(() => {
    return requests
      .filter((r) => statusFilter === 'all' || r.status === statusFilter)
      .filter((r) => priorityFilter === 'all' || r.priority === priorityFilter)
      .filter((r) => !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const pa = PRIORITY_COLOR[a.priority]?.rank ?? 2;
        const pb = PRIORITY_COLOR[b.priority]?.rank ?? 2;
        if (pa !== pb) return pa - pb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [requests, statusFilter, priorityFilter, search]);

  const triggerAiCategorize = (r: MaintenanceRequest) => {
    setAiRunning(true);
    fetch(`/pm/requests/${r.id}/ai-categorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
      },
    })
      .then((res) => res.json())
      .then(() => {
        setAiRunning(false);
        router.reload({ only: ['requests'] });
        // Close / refresh details drawer if open
        setSelectedReq(null);
      })
      .catch((err) => {
        console.error(err);
        setAiRunning(false);
      });
  };

  const handleAssignVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignReq) return;

    router.put(`/pm/requests/${assignReq.id}`, {
      status:             'assigned',
      assigned_vendor_id: selectedVendorId,
      priority:           assignReq.priority,
      category:           assignReq.category,
    }, {
      onSuccess: () => {
        setAssignReq(null);
        setSelectedVendorId('');
      },
    });
  };

  const handleUpdateStatus = (r: MaintenanceRequest, nextStatus: MaintenanceRequest['status']) => {
    router.put(`/pm/requests/${r.id}`, {
      status:             nextStatus,
      assigned_vendor_id: r.assigned_vendor_id,
      priority:           r.priority,
      category:           r.category,
    }, {
      onSuccess: () => {
        if (selectedReq?.id === r.id) {
          setSelectedReq(null);
        }
      },
    });
  };

  return (
    <AppShell>
      <Head title="Maintenance Requests - PM PropTech UZ" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#34d399' }}>
            Property Management
          </p>
          <h1 className="text-2xl font-bold text-white mt-1">Maintenance Requests</h1>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Service tickets, SLA tracking, and vendor assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-3 rounded-xl transition-all"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Inbox}        label="Open / Assigned" value={metrics.open}           accent="#fbbf24" />
          <MetricCard icon={Loader}       label="In Progress"     value={metrics.inProgress}     accent="#3b82f6" />
          <MetricCard icon={CheckCircle2} label="Completed"       value={metrics.completed}      accent="#10b981" />
          <MetricCard icon={AlarmClock}   label="SLA Overdue"     value={metrics.overdue}        accent="#ef4444" />
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search request title or description..."
              className="w-full rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none placeholder:text-slate-500"
              style={{ backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
            style={{ backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="rounded-xl px-3 py-2.5 text-xs text-white outline-none cursor-pointer"
            style={{ backgroundColor: '#161b22', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <option value="all">All Priorities</option>
            <option value="emergency">Emergency</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Requests Table */}
        <div className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.06)' }}>
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              No maintenance requests matching filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Priority', 'Ticket Details', 'Apartment', 'Resident', 'Category', 'Status', 'Contractor', 'SLA', 'Actions'].map((h) => (
                      <th key={h} className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((r) => {
                    const p = PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.medium;
                    const s = STATUS_COLOR[r.status] || STATUS_COLOR.open;

                    let slaCell: React.ReactNode = <span className="text-slate-500">—</span>;
                    if (r.sla_deadline && r.status !== 'completed' && r.status !== 'cancelled') {
                      const diff = new Date(r.sla_deadline).getTime() - now;
                      const overdue = diff < 0;
                      const absMin = Math.floor(Math.abs(diff) / 60000);
                      const hrs = Math.floor(absMin / 60);
                      const mins = absMin % 60;
                      slaCell = (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold font-mono" style={{ color: overdue ? '#fca5a5' : '#6ee7b7' }}>
                          {overdue ? `-${hrs}h ${mins}m` : `${hrs}h ${mins}m`}
                        </span>
                      );
                    }

                    return (
                      <tr
                        key={r.id}
                        className="transition-all hover:bg-white/[0.01] cursor-pointer"
                        onClick={() => setSelectedReq(r)}
                      >
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: p.bg, color: p.text }}>
                            {p.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{r.description}</p>
                        </td>
                        <td className="px-6 py-4 text-xs text-white">
                          <span className="font-semibold font-mono">№{r.apartment}</span>
                          <span className="text-[10px] block text-slate-500">Floor {r.building}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-white">{r.resident || '—'}</td>
                        <td className="px-6 py-4 text-xs text-white capitalize">{r.category || '—'}</td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: s.bg, color: s.text }}>
                            {s.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs" onClick={(e) => e.stopPropagation()}>
                          {r.vendor ? (
                            <span className="text-white">{r.vendor}</span>
                          ) : r.status === 'completed' || r.status === 'cancelled' ? (
                            <span className="text-slate-500">—</span>
                          ) : (
                            <button
                              onClick={() => {
                                setAssignReq(r);
                                setSelectedVendorId(r.assigned_vendor_id || '');
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-white transition-all bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Assign
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4">{slaCell}</td>
                        <td className="px-6 py-4">
                          <ChevronRight className="w-4 h-4 text-slate-400" />
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

      {/* Assign Vendor Modal */}
      {assignReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6"
            style={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Assign Contractor</h2>
              <button onClick={() => setAssignReq(null)} className="p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Select Contractor</label>
                <select
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  required
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none cursor-pointer"
                  style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="">Choose a contractor...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} ({v.specializations.join(', ') || 'General'})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignReq(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
                >
                  Assign Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Details Slide-out Drawer */}
      {selectedReq && (
        <>
          <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} onClick={() => setSelectedReq(null)} />
          <aside
            className="fixed top-0 right-0 z-50 h-screen overflow-y-auto p-6"
            style={{
              width:           'min(500px, 95vw)',
              backgroundColor: '#0d1117',
              borderLeft:      '1px solid rgba(255,255,255,0.08)',
              boxShadow:       '-12px 0 60px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Maintenance Ticket</p>
                <h2 className="text-lg font-bold text-white mt-0.5">#{selectedReq.title}</h2>
              </div>
              <button onClick={() => setSelectedReq(null)} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* SLA status details */}
              <div className="rounded-xl p-4 flex items-center justify-between" style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">Current Status</p>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold mt-1"
                    style={{
                      backgroundColor: STATUS_COLOR[selectedReq.status]?.bg || 'rgba(255,255,255,0.08)',
                      color:           STATUS_COLOR[selectedReq.status]?.text || 'white',
                    }}>
                    {STATUS_COLOR[selectedReq.status]?.label || selectedReq.status}
                  </span>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">Priority</p>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold mt-1"
                    style={{
                      backgroundColor: PRIORITY_COLOR[selectedReq.priority]?.bg || 'rgba(255,255,255,0.08)',
                      color:           PRIORITY_COLOR[selectedReq.priority]?.text || 'white',
                    }}>
                    {PRIORITY_COLOR[selectedReq.priority]?.label || selectedReq.priority}
                  </span>
                </div>
              </div>

              {/* AI helper box */}
              <div className="rounded-2xl p-4 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h4 className="text-xs font-bold text-white">AI Assistant Insights</h4>
                </div>
                {selectedReq.ai_summary ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-300 leading-relaxed font-mono">{selectedReq.ai_summary}</p>
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {selectedReq.ai_category_suggested && <span className="bg-purple-950/40 border border-purple-500/25 px-2 py-0.5 rounded text-purple-300">Category: {selectedReq.ai_category_suggested}</span>}
                      {selectedReq.ai_priority_suggested && <span className="bg-indigo-950/40 border border-indigo-500/25 px-2 py-0.5 rounded text-indigo-300">Priority: {selectedReq.ai_priority_suggested}</span>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-3">AI models can automatically analyze, categorize, and summarize this maintenance request.</p>
                    <button
                      onClick={() => triggerAiCategorize(selectedReq)}
                      disabled={aiRunning}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all shadow-md"
                    >
                      {aiRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Run AI Categorization
                    </button>
                  </div>
                )}
              </div>

              {/* Information row */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Apartment" value={`№${selectedReq.apartment || '—'}`} />
                  <DetailField label="Resident Name" value={selectedReq.resident || '—'} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <DetailField label="Created On" value={new Date(selectedReq.created_at).toLocaleDateString()} />
                  <DetailField label="SLA Deadline" value={selectedReq.sla_deadline ? new Date(selectedReq.sla_deadline).toLocaleString() : '—'} />
                </div>
                <DetailField label="Description" value={selectedReq.description} isWide />
              </div>

              {/* Actions workflow */}
              {selectedReq.status !== 'completed' && selectedReq.status !== 'cancelled' && (
                <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Actions Workflow</h3>
                  <div className="flex gap-3">
                    {selectedReq.status === 'open' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedReq, 'in_progress')}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500"
                      >
                        Start Progress
                      </button>
                    )}
                    {selectedReq.status === 'assigned' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedReq, 'in_progress')}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500"
                      >
                        Start Progress
                      </button>
                    )}
                    {selectedReq.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedReq, 'completed')}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500"
                      >
                        Complete Job
                      </button>
                    )}
                    <button
                      onClick={() => handleUpdateStatus(selectedReq, 'cancelled')}
                      className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 border border-slate-700 hover:bg-white/5"
                    >
                      Cancel Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(2px)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6 max-h-[90vh] overflow-y-auto animate-fade-in"
            style={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">New Maintenance Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">Ticket Title *</label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="e.g. Faucet leaking in kitchen"
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">Description *</label>
                <textarea
                  required
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={3}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-none"
                  style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>

              {/* Project -> Building -> Apartment Selector */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Project *</label>
                  <select
                    required
                    value={createProjId}
                    onChange={(e) => {
                      setCreateProjId(e.target.value);
                      setCreateBldgId('');
                      setCreateAptId('');
                      setCreateResidentId('');
                    }}
                    className="w-full rounded-xl px-2 py-2.5 text-xs text-white outline-none"
                    style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option value="" style={{ backgroundColor: '#0d1117' }}>Select...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} style={{ backgroundColor: '#0d1117' }}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Building *</label>
                  <select
                    required
                    value={createBldgId}
                    onChange={(e) => {
                      setCreateBldgId(e.target.value);
                      setCreateAptId('');
                      setCreateResidentId('');
                    }}
                    disabled={!createProjId}
                    className="w-full rounded-xl px-2 py-2.5 text-xs text-white outline-none disabled:opacity-50"
                    style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option value="" style={{ backgroundColor: '#0d1117' }}>Select...</option>
                    {buildingsForSelectedCreateProj.map((b) => (
                      <option key={b.id} value={b.id} style={{ backgroundColor: '#0d1117' }}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Apartment *</label>
                  <select
                    required
                    value={createAptId}
                    onChange={(e) => {
                      setCreateAptId(e.target.value);
                      setCreateResidentId('');
                    }}
                    disabled={!createBldgId}
                    className="w-full rounded-xl px-2 py-2.5 text-xs text-white outline-none disabled:opacity-50"
                    style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option value="" style={{ backgroundColor: '#0d1117' }}>Select...</option>
                    {apartmentsForSelectedCreateBldg.map((a) => (
                      <option key={a.id} value={a.id} style={{ backgroundColor: '#0d1117' }}>№{a.number}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resident */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">Resident (Optional)</label>
                <select
                  value={createResidentId}
                  onChange={(e) => setCreateResidentId(e.target.value)}
                  disabled={!createAptId || filteredResidentsForCreate.length === 0}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                  style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="" style={{ backgroundColor: '#0d1117' }}>
                    {!createAptId 
                      ? 'Select apartment first...' 
                      : (filteredResidentsForCreate.length === 0 
                        ? 'No active residents found in this unit' 
                        : 'Select resident...')}
                  </option>
                  {filteredResidentsForCreate.map((r) => (
                    <option key={r.id} value={r.id} style={{ backgroundColor: '#0d1117' }}>{r.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Category</label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option value="" style={{ backgroundColor: '#0d1117' }}>Choose...</option>
                    {Object.entries(CATEGORY_RU).map(([k, v]) => (
                      <option key={k} value={k} style={{ backgroundColor: '#0d1117' }}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-slate-400">Priority *</label>
                  <select
                    required
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value as any)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <option value="low" style={{ backgroundColor: '#0d1117' }}>Low</option>
                    <option value="medium" style={{ backgroundColor: '#0d1117' }}>Medium</option>
                    <option value="high" style={{ backgroundColor: '#0d1117' }}>High</option>
                    <option value="emergency" style={{ backgroundColor: '#0d1117' }}>Emergency</option>
                  </select>
                </div>
              </div>

              {/* Assign Vendor (Optional) */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">Assign Contractor (Optional)</label>
                <select
                  value={createVendorId}
                  onChange={(e) => setCreateVendorId(e.target.value)}
                  className="w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                  style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <option value="" style={{ backgroundColor: '#0d1117' }}>Assign contractor later...</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id} style={{ backgroundColor: '#0d1117' }}>{v.name} ({v.specializations.join(', ') || 'General'})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold hover:bg-white/5 transition-all text-slate-400"
                  style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}1F`, border: `1px solid ${accent}3A` }}>
          <Icon className="w-4 h-4" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-3xl text-white mt-3 font-bold font-mono" style={{ fontFamily: 'var(--font-display)' }}>
        {value}
      </p>
    </div>
  );
}

function DetailField({ label, value, isWide = false }: { label: string; value: string; isWide?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${isWide ? 'col-span-2' : ''}`} style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">{label}</p>
      <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}
