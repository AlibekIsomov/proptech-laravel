import { router, usePage, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Building2, LayoutDashboard, FolderKanban, Home,
    Users, BarChart2, ShieldCheck, LogOut, Calculator,
    CreditCard, ArrowRightLeft, Building,
} from 'lucide-react';

type Role = 'super_admin' | 'company_admin' | 'manager' | 'viewer';

interface NavItem {
    href:  string;
    label: string;
    icon:  React.ElementType;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
    super_admin: [
        { href: '/dashboard',  label: 'Overview',    icon: LayoutDashboard },
        { href: '/companies',  label: 'Companies',   icon: Building        },
        { href: '/users',      label: 'Users',       icon: ShieldCheck     },
        { href: '/projects',   label: 'Projects',    icon: FolderKanban    },
        { href: '/apartments', label: 'Apartments',  icon: Home            },
        { href: '/clients',    label: 'Clients',     icon: Users           },
    ],
    company_admin: [
        { href: '/dashboard',  label: 'Overview',   icon: LayoutDashboard },
        { href: '/users',      label: 'Users',      icon: ShieldCheck     },
        { href: '/projects',   label: 'Projects',   icon: FolderKanban    },
        { href: '/apartments', label: 'Apartments', icon: Home            },
        { href: '/clients',    label: 'Clients',    icon: Users           },
        { href: '/pricing',    label: 'Pricing',    icon: CreditCard      },
    ],
    manager: [
        { href: '/dashboard',  label: 'Overview',   icon: LayoutDashboard },
        { href: '/clients',    label: 'Clients',    icon: Users           },
        { href: '/apartments', label: 'Apartments', icon: Home            },
        { href: '/calculator', label: 'Calculator', icon: Calculator      },
    ],
    viewer: [
        { href: '/dashboard',  label: 'Overview',   icon: LayoutDashboard },
        { href: '/calculator', label: 'Calculator', icon: Calculator      },
    ],
};

const ROLE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
    super_admin:   { label: 'Super Admin',    bg: 'rgba(239,68,68,0.15)',  text: '#fca5a5' },
    company_admin: { label: 'Company Admin',  bg: 'rgba(99,102,241,0.15)', text: '#a5b4fc' },
    manager:       { label: 'Manager',        bg: 'rgba(16,185,129,0.12)', text: '#34d399' },
    viewer:        { label: 'Viewer',         bg: 'rgba(100,116,139,0.15)',text: '#64748b' },
};

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function NavLink({ item, currentPath }: { item: NavItem; currentPath: string }) {
    const { href, label, icon: Icon } = item;
    const active = currentPath === href || currentPath.startsWith(href + '/');
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            style={{
                backgroundColor: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                color:           active ? '#a5b4fc' : 'rgba(255,255,255,0.45)',
                borderLeft:      active ? '3px solid #6366f1' : '3px solid transparent',
                marginLeft:      '-2px',
                paddingLeft:     active ? 'calc(0.75rem - 1px)' : '0.75rem',
            }}
        >
            <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#6366f1' : 'rgba(255,255,255,0.3)' }} />
            <span className={active ? 'font-semibold' : 'font-normal'}>{label}</span>
        </Link>
    );
}

interface AuthUser {
    full_name:    string;
    email:        string;
    role:         string;
    pm_role:      string | null;
    company_name: string | null;
}

export default function Sidebar() {
    const { auth } = usePage<{ auth: { user: AuthUser } }>().props;
    const user = auth?.user;

    // Current path — window.location (Inertia'da router.page nema)
    const [currentPath, setCurrentPath] = useState('');
    useEffect(() => { setCurrentPath(window.location.pathname); }, []);

    const role     = user?.role ?? 'viewer';
    const pmRole   = user?.pm_role;
    const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE['viewer'];
    const badge    = ROLE_BADGE[role];

    const pmDest =
        pmRole === 'property_manager' ? '/pm/dashboard' :
        pmRole === 'dispatcher'       ? '/dispatcher/dashboard' :
        pmRole === 'vendor'           ? '/vendor/dashboard' :
        pmRole === 'resident'         ? '/resident/dashboard' :
        null;

    function handleSignOut() {
        router.post('/logout');
    }

    return (
        <aside className="fixed inset-y-0 left-0 z-30 flex flex-col w-56"
            style={{ backgroundColor: '#0d1117', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

            {/* Logo */}
            <div className="flex items-center gap-2.5 h-14 px-4 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                    <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-white tracking-tight font-bold">
                    {user?.company_name ?? 'PropTech UZ'}
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-4 overflow-y-auto">
                <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.22)' }}>Menu</p>
                <div className="space-y-0.5">
                    {navItems.map(item => (
                        <NavLink key={item.href} item={item} currentPath={currentPath} />
                    ))}
                </div>
            </nav>

            {/* PM Portal switcher */}
            {pmDest && (
                <div className="px-3 pt-3 pb-1 shrink-0">
                    <Link href={pmDest} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                        style={{ backgroundColor: 'rgba(16,185,129,0.10)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
                        <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                        PM Portalga o'tish
                    </Link>
                </div>
            )}

            {/* User info + Sign out */}
            <div className="px-3 py-4 shrink-0 space-y-2"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {user && (
                    <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-xs font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            {initials(user.full_name || user.email)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate leading-snug">{user.full_name}</p>
                            <p className="text-[10px] truncate leading-snug" style={{ color: 'rgba(255,255,255,0.28)' }}>{user.email}</p>
                        </div>
                    </div>
                )}

                {badge && (
                    <div className="px-1">
                        <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                            style={{ backgroundColor: badge.bg, color: badge.text }}>
                            {badge.label}
                        </span>
                    </div>
                )}

                <button id="sign-out-btn" onClick={handleSignOut}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-white/5"
                    style={{ color: 'rgba(255,255,255,0.32)' }}>
                    <LogOut className="w-4 h-4 shrink-0" />
                    Chiqish
                </button>
            </div>
        </aside>
    );
}
