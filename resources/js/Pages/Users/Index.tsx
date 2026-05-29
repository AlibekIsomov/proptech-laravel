import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Users, Plus, Pencil, Trash2, X, Loader2, Building2, Shield } from 'lucide-react';
import AppShell from '@/Components/AppShell';

interface User {
    id: number;
    full_name: string;
    email: string;
    role: string;
    pm_role: string | null;
    company_id: number | null;
    company_name: string | null;
    created_at: string;
}

interface Role { id: number; name: string; }
interface Company { id: number; name: string; }

interface Props {
    users: User[];
    roles: Role[];
    companies: Company[];
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
    super_admin:   { bg: 'rgba(239,68,68,0.12)',   text: '#fca5a5' },
    company_admin: { bg: 'rgba(99,102,241,0.12)',  text: '#a5b4fc' },
    manager:       { bg: 'rgba(16,185,129,0.12)',  text: '#34d399' },
    viewer:        { bg: 'rgba(100,116,139,0.12)', text: '#94a3b8' },
    property_manager: { bg: 'rgba(245,158,11,0.12)', text: '#fbbf24' },
    dispatcher:    { bg: 'rgba(139,92,246,0.12)',  text: '#c4b5fd' },
    vendor:        { bg: 'rgba(20,184,166,0.12)',  text: '#5eead4' },
    resident:      { bg: 'rgba(59,130,246,0.12)',  text: '#93c5fd' },
};

const emptyForm = { full_name: '', email: '', password: '', role: 'manager', pm_role: '', company_id: '' };

export default function UsersIndex({ users, roles, companies }: Props) {
    const { auth } = usePage<any>().props;
    const isSuperAdmin = auth.user?.role === 'super_admin';

    const [showModal, setShowModal] = useState(false);
    const [editing,   setEditing]   = useState<User | null>(null);
    const [form,      setForm]      = useState({ ...emptyForm });
    const [loading,   setLoading]   = useState(false);

    function openCreate() {
        setEditing(null);
        setForm({ ...emptyForm, company_id: String(auth.user?.company_id ?? '') });
        setShowModal(true);
    }

    function openEdit(u: User) {
        setEditing(u);
        setForm({ full_name: u.full_name, email: u.email, password: '', role: u.role, pm_role: u.pm_role ?? '', company_id: String(u.company_id ?? '') });
        setShowModal(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const payload = { ...form, company_id: Number(form.company_id) || undefined };
        if (editing) {
            router.put(`/users/${editing.id}`, payload, { onFinish: () => { setLoading(false); setShowModal(false); } });
        } else {
            router.post('/users', payload, { onFinish: () => { setLoading(false); setShowModal(false); } });
        }
    }

    function handleDelete(u: User) {
        if (!confirm(`"${u.full_name}" ni o'chirasizmi?`)) return;
        router.delete(`/users/${u.id}`);
    }

    const f = (k: keyof typeof form) => form[k];
    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    return (
        <AppShell>
            <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-14 border-b shrink-0"
                style={{ backgroundColor: '#0d1117', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" style={{ color: '#6366f1' }} />
                    <h1 className="text-sm font-semibold text-white">Foydalanuvchilar</h1>
                    <span className="text-xs px-2 py-0.5 rounded-full ml-1"
                        style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}>
                        {users.length}
                    </span>
                </div>
                <button id="create-user-btn" onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80"
                    style={{ backgroundColor: '#6366f1' }}>
                    <Plus className="w-4 h-4" /> Foydalanuvchi qo'shish
                </button>
            </header>

            <main className="px-6 py-6">
                <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#0d1117', borderColor: '#1e2536' }}>
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid #1e2536' }}>
                                {['Ism', 'Email', 'Rol', 'Kompaniya', 'Sana', ''].map(h => (
                                    <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: '#475569' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u, i) => {
                                const rc = ROLE_COLORS[u.role] ?? ROLE_COLORS.viewer;
                                return (
                                    <tr key={u.id} className="transition-colors hover:bg-white/[0.02]"
                                        style={{ borderBottom: i < users.length - 1 ? '1px solid #1e2536' : undefined }}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                                    {u.full_name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <span className="text-sm text-white font-medium">{u.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm" style={{ color: '#94a3b8' }}>{u.email}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full"
                                                style={{ backgroundColor: rc.bg, color: rc.text }}>{u.role}</span>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm" style={{ color: '#64748b' }}>
                                            {u.company_name ?? '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-sm" style={{ color: '#64748b' }}>{u.created_at}</td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex gap-1 justify-end">
                                                <button onClick={() => openEdit(u)}
                                                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: '#64748b' }}>
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(u)}
                                                    className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" style={{ color: '#64748b' }}>
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={e => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="w-full max-w-md rounded-2xl p-6"
                        style={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.09)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-semibold text-white">
                                {editing ? 'Foydalanuvchini tahrirlash' : 'Yangi foydalanuvchi'}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ color: '#475569' }} className="hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>To'liq ism *</label>
                                <input type="text" required value={f('full_name')} onChange={set('full_name')}
                                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Email *</label>
                                <input type="email" required value={f('email')} onChange={set('email')}
                                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    Parol {editing ? "(bo'sh qoldiring — o'zgarmaydi)" : '*'}
                                </label>
                                <input type="password" required={!editing} value={f('password')} onChange={set('password')}
                                    className="w-full rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Rol *</label>
                                    <select value={f('role')} onChange={set('role')}
                                        className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                                        style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>PM Rol</label>
                                    <select value={f('pm_role')} onChange={set('pm_role')}
                                        className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                                        style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <option value="">Yo'q</option>
                                        <option value="property_manager">property_manager</option>
                                        <option value="dispatcher">dispatcher</option>
                                        <option value="vendor">vendor</option>
                                        <option value="resident">resident</option>
                                    </select>
                                </div>
                            </div>
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Kompaniya</label>
                                    <select value={f('company_id')} onChange={set('company_id')}
                                        className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
                                        style={{ backgroundColor: '#080b14', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
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
