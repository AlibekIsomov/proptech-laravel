import { router, usePage, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard, FolderKanban, Home,
    Users, ShieldCheck, LogOut, Calculator,
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
        { href: '/dashboard',  label: 'Bosh sahifa',      icon: LayoutDashboard },
        { href: '/companies',  label: 'Kompaniyalar',     icon: Building        },
        { href: '/users',      label: 'Foydalanuvchilar',  icon: ShieldCheck     },
        { href: '/projects',   label: 'Loyihalar',        icon: FolderKanban    },
        { href: '/clients',    label: 'Mijozlar',         icon: Users           },
    ],
    company_admin: [
        { href: '/dashboard',  label: 'Bosh sahifa',     icon: LayoutDashboard },
        { href: '/users',      label: 'Foydalanuvchilar', icon: ShieldCheck     },
        { href: '/projects',   label: 'Loyihalar',       icon: FolderKanban    },
        { href: '/clients',    label: 'Mijozlar',        icon: Users           },
        { href: '/pricing',    label: 'Tariflar',        icon: CreditCard      },
    ],
    manager: [
        { href: '/dashboard',  label: 'Bosh sahifa',     icon: LayoutDashboard },
        { href: '/clients',    label: 'Mijozlar',        icon: Users           },
        { href: '/calculator', label: 'Kalkulyator',     icon: Calculator      },
    ],
    viewer: [
        { href: '/dashboard',  label: 'Bosh sahifa',     icon: LayoutDashboard },
        { href: '/calculator', label: 'Kalkulyator',     icon: Calculator      },
    ],
};

const ROLE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
    super_admin:   { label: 'Super Admin',    bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
    company_admin: { label: 'Kompaniya Admini',  bg: 'rgba(39,162,71,0.12)',   text: '#1a7a34' },
    manager:       { label: 'Menejer',        bg: 'rgba(39,162,71,0.08)',   text: '#1e7e34' },
    viewer:        { label: 'Kuzatuvchi',         bg: 'rgba(100,116,139,0.12)', text: '#475569' },
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
                backgroundColor: active ? 'rgba(39,162,71,0.10)' : 'transparent',
                color:           active ? '#1e7e34' : 'rgba(26,46,34,0.65)',
                borderLeft:      active ? '3px solid #27A247' : '3px solid transparent',
                marginLeft:      '-2px',
                paddingLeft:     active ? 'calc(0.75rem - 1px)' : '0.75rem',
            }}
        >
            <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#27A247' : 'rgba(26,46,34,0.45)' }} />
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

// 1Mahalla arch SVG logo icon
function MahallаArchIcon({ size = 20 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Uzbek arch (pishtoq) shape */}
            <path
                d="M4 32V16C4 9.373 9.373 4 16 4C22.627 4 28 9.373 28 16V32"
                stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none"
            />
            <rect x="4" y="26" width="8" height="6" rx="0" fill="white" />
            <rect x="20" y="26" width="8" height="6" rx="0" fill="white" />
        </svg>
    );
}

export default function Sidebar() {
    const { auth } = usePage<{ auth: { user: AuthUser } }>().props;
    const user = auth?.user;

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
        <aside className="fixed inset-y-0 left-0 z-30 flex flex-col w-56 bg-white"
            style={{ borderRight: '1px solid rgba(39,162,71,0.12)' }}>

            {/* Logo — 1Mahalla style */}
            <div className="flex items-center gap-2.5 h-14 px-4 shrink-0"
                style={{ borderBottom: '1px solid rgba(39,162,71,0.08)' }}>
                <div className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
                    style={{
                        background: 'linear-gradient(135deg, #27A247 0%, #1a7a34 100%)',
                        boxShadow: '0 0 16px rgba(39,162,71,0.35)',
                    }}>
                    <MahallаArchIcon size={18} />
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-sm tracking-tight font-bold" style={{ color: '#1a2e22', fontFamily: 'var(--font-display)' }}>
                        {user?.company_name ?? '1Mahalla'}
                    </span>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-4 overflow-y-auto">
                <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-widest"
                    style={{ color: 'rgba(26,46,34,0.45)' }}>Menyu</p>
                <div className="space-y-0.5">
                    {navItems.map(item => (
                        <NavLink key={item.href} item={item} currentPath={currentPath} />
                    ))}
                </div>
            </nav>

            {/* PM Portal switcher */}
            {pmDest && (
                <div className="px-3 pt-3 pb-1 shrink-0">
                    <Link href={pmDest} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                        style={{ backgroundColor: 'rgba(39,162,71,0.06)', color: '#1a7a34', border: '1px solid rgba(39,162,71,0.15)' }}>
                        <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                        PM Portalga o'tish
                    </Link>
                </div>
            )}

            {/* User info + Sign out */}
            <div className="px-3 py-4 shrink-0 space-y-2"
                style={{ borderTop: '1px solid rgba(39,162,71,0.08)' }}>
                {user && (
                    <div className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl"
                        style={{ backgroundColor: 'rgba(39,162,71,0.04)' }}>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-xs font-bold text-slate-800"
                            style={{ background: 'linear-gradient(135deg, #27A247, #1a7a34)' }}>
                            {initials(user.full_name || user.email)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate leading-snug" style={{ color: '#1a2e22' }}>{user.full_name}</p>
                            <p className="text-[10px] truncate leading-snug" style={{ color: 'rgba(26,46,34,0.5)' }}>{user.email}</p>
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
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-slate-100"
                    style={{ color: 'rgba(26,46,34,0.6)' }}>
                    <LogOut className="w-4 h-4 shrink-0" />
                    Chiqish
                </button>
            </div>
        </aside>
    );
}
