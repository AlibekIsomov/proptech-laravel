import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Btn, Badge, Field, TextInput, PmSelect, Seg, Avatar,
  Plus, Edit2, Trash2, X, Loader2,
} from '@/Components/pm/ui';
import type { BadgeTone } from '@/Components/pm/ui';

interface User {
    id: number;
    full_name: string;
    email: string;
    role: string | null;
    pm_role: string | null;
    company_id: number | null;
    company_name: string | null;
    created_at: string;
}

interface Role { id: number; name: string; }
interface Company { id: number; name: string; }

interface Props {
    users: User[];
    salesRoles: Role[];
    pmRoles: string[];
    companies: Company[];
}

const ROLE_TONE: Record<string, BadgeTone> = {
    super_admin:      'danger',
    company_admin:    'brand',
    manager:          'ok',
    viewer:           'neutral',
    property_manager: 'warn',
    dispatcher:       'violet',
    vendor:           'info',
    resident:         'info',
};

const SALES_ROLE_NAMES = ['super_admin', 'company_admin', 'manager', 'viewer'];

type Context = 'sales' | 'pm' | 'both';

const emptyForm = { full_name: '', email: '', password: '', role: 'manager', pm_role: 'property_manager', company_id: '' };

function deriveContext(u: User): Context {
    const hasSales = !!u.role && SALES_ROLE_NAMES.includes(u.role);
    const hasPM    = !!u.pm_role;
    if (hasSales && hasPM) return 'both';
    if (hasPM) return 'pm';
    return 'sales';
}

export default function UsersIndex({ users, salesRoles, pmRoles, companies }: Props) {
    const { t } = useTranslation();
    const { auth } = usePage<any>().props;
    const isSuperAdmin = auth.user?.role === 'super_admin';

    const [showModal, setShowModal] = useState(false);
    const [editing,   setEditing]   = useState<User | null>(null);
    const [form,      setForm]      = useState({ ...emptyForm });
    const [context,   setContext]   = useState<Context>('sales');
    const [loading,   setLoading]   = useState(false);

    function openCreate() {
        setEditing(null);
        const defaultCompanyId = isSuperAdmin
            ? (companies[0]?.id ? String(companies[0].id) : '')
            : String(auth.user?.company_id ?? '');
        setForm({ ...emptyForm, company_id: defaultCompanyId });
        setContext('sales');
        setShowModal(true);
    }

    function openEdit(u: User) {
        setEditing(u);
        setForm({
            full_name:  u.full_name,
            email:      u.email,
            password:   '',
            role:       u.role ?? (salesRoles[0]?.name ?? 'manager'),
            pm_role:    u.pm_role ?? (pmRoles[0] ?? 'property_manager'),
            company_id: String(u.company_id ?? ''),
        });
        setContext(deriveContext(u));
        setShowModal(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        const payload: Record<string, any> = {
            full_name:  form.full_name,
            email:      form.email,
            company_id: Number(form.company_id) || undefined,
        };
        if (form.password) payload.password = form.password;
        if (context === 'sales' || context === 'both') payload.role    = form.role;
        if (context === 'pm'    || context === 'both') payload.pm_role = form.pm_role;

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

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(prev => ({ ...prev, [k]: e.target.value }));

    const ctxOptions = [
        { value: 'sales', label: t('users.sales') },
        { value: 'pm',    label: t('users.pm')    },
        { value: 'both',  label: t('users.both')  },
    ];

    return (
        <AppShell>
            <Head title={t('users.title') + ' — 1Mahalla'} />
            <div className="page">
                <PageHead
                    title={t('users.title')}
                    sub={`${users.length} ${t('users.title').toLowerCase()}`}
                    actions={<Btn variant="primary" icon={Plus} onClick={openCreate}>{t('users.addUser')}</Btn>}
                />

                <div className="table-card">
                    <div className="tbl-wrap">
                        <table className="tbl">
                            <thead>
                                <tr>
                                    <th>{t('users.name')}</th>
                                    <th>{t('users.email')}</th>
                                    <th>{t('users.roles')}</th>
                                    <th>{t('users.company')}</th>
                                    <th>{t('users.date')}</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <Avatar name={u.full_name} color="c2" size={32} />
                                                <span className="cell-strong">{u.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="cell-sub">{u.email}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {u.role    && <Badge tone={ROLE_TONE[u.role]    ?? 'neutral'}>{u.role}</Badge>}
                                                {u.pm_role && <Badge tone={ROLE_TONE[u.pm_role] ?? 'neutral'}>{u.pm_role}</Badge>}
                                            </div>
                                        </td>
                                        <td className="cell-sub">{u.company_name ?? '—'}</td>
                                        <td className="cell-sub">{u.created_at}</td>
                                        <td>
                                            <div className="row-actions">
                                                <button className="icon-act" onClick={() => openEdit(u)}><Edit2 className="ic" /></button>
                                                <button className="icon-act danger" onClick={() => handleDelete(u)}><Trash2 className="ic" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="scrim show" onClick={() => setShowModal(false)}>
                    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
                        onClick={e => e.stopPropagation()}>
                        <div className="card card-pad" style={{ width: '100%', maxWidth: 440, maxHeight: '90vh', overflow: 'auto', padding: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h2 style={{ fontWeight: 700, fontSize: 16 }}>{editing ? t('users.editUser') : t('users.newUser')}</h2>
                                <button className="drawer-close" onClick={() => setShowModal(false)}><X className="ic" /></button>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <Field label={`${t('users.fullName')} *`}>
                                    <TextInput type="text" required value={form.full_name} onChange={set('full_name')} />
                                </Field>
                                <Field label={`${t('users.email')} *`}>
                                    <TextInput type="email" required value={form.email} onChange={set('email')} />
                                </Field>
                                <Field label={`${t('users.password')} ${editing ? t('users.passwordHint') : '*'}`}>
                                    <TextInput type="password" required={!editing} value={form.password} onChange={set('password')} />
                                </Field>

                                <Field label={`${t('users.module')} *`}>
                                    <Seg options={ctxOptions} value={context} onChange={v => setContext(v as Context)} />
                                </Field>

                                {(context === 'sales' || context === 'both') && (
                                    <Field label={`${t('users.salesRole')} *`}>
                                        <PmSelect value={form.role} onChange={set('role')}>
                                            {salesRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                        </PmSelect>
                                    </Field>
                                )}

                                {(context === 'pm' || context === 'both') && (
                                    <Field label={`${t('users.pmRole')} *`}>
                                        <PmSelect value={form.pm_role} onChange={set('pm_role')}>
                                            {pmRoles.map(r => <option key={r} value={r}>{r}</option>)}
                                        </PmSelect>
                                    </Field>
                                )}

                                {isSuperAdmin && (
                                    <Field label={t('users.company')}>
                                        <PmSelect value={form.company_id} onChange={set('company_id')}>
                                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </PmSelect>
                                    </Field>
                                )}

                                <Btn variant="primary" block type="submit" disabled={loading} icon={loading ? Loader2 : undefined}>
                                    {editing ? t('users.save') : t('users.create')}
                                </Btn>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}
