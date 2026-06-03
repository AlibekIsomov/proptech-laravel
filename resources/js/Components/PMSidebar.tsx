import { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
  Wrench, HardHat, UserCheck, Gauge, Receipt, Vote, Boxes, Building,
  LayoutDashboard, LogOut, ArrowLeftRight, Building2, FolderKanban, DollarSign,
} from 'lucide-react';

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ElementType;
}

const PM_NAV: NavItem[] = [
  { href: '/pm/dashboard', label: 'Bosh sahifa',         icon: LayoutDashboard },
  { href: '/pm/projects',  label: 'Loyihalar',           icon: FolderKanban    },
  { href: '/pm/residents', label: 'Aholilar',            icon: UserCheck       },
  { href: '/pm/requests',  label: 'Arizalar',            icon: Wrench          },
  { href: '/pm/vendors',   label: 'Pudratchilar',         icon: HardHat         },
  { href: '/pm/invoices',      label: 'Hisoblar',         icon: Receipt      },
  { href: '/pm/monthly-fees', label: "Oylik to'lovlar",  icon: DollarSign   },
  { href: '/pm/inventory',    label: 'Omborxona',        icon: Boxes        },
];

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
        backgroundColor: active ? 'rgba(16,185,129,0.08)' : 'transparent',
        color:           active ? '#047857' : 'rgba(26,46,34,0.65)',
        borderLeft:      active ? '3px solid #10b981' : '3px solid transparent',
        marginLeft:      '-2px',
        paddingLeft:     active ? 'calc(0.75rem - 1px)' : '0.75rem',
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#10b981' : 'rgba(26,46,34,0.45)' }} />
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

export default function PMSidebar() {
  const { auth } = usePage<{ auth: { user: AuthUser } }>().props;
  const user = auth?.user;

  const [currentPath, setCurrentPath] = useState('');
  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  function handleSignOut() {
    router.post('/logout');
  }

  // Switch back to sales is possible for super_admin, company_admin, manager, viewer
  const canSwitchToSales = user && ['super_admin', 'company_admin', 'manager', 'viewer'].includes(user.role);

  const formatPmRole = (role: string | null) => {
    if (!role) return '';
    const roles: Record<string, string> = {
      property_manager: 'Mulk menejeri',
      dispatcher: 'Dispetcher',
      vendor: 'Pudratchi',
      resident: 'Aholi'
    };
    return roles[role] || role;
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex flex-col w-56 bg-white"
      style={{
        borderRight:     '1px solid rgba(16,185,129,0.12)',
      }}
    >
      {/* Logo + portal label */}
      <div
        className="flex flex-col gap-1 h-14 px-4 justify-center shrink-0"
        style={{ borderBottom: '1px solid rgba(16,185,129,0.08)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
          >
            <Building2 className="w-4 h-4 text-slate-800" />
          </div>
          <span
            className="text-sm tracking-tight font-bold"
            style={{ color: '#1a2e22', fontFamily: 'var(--font-display)' }}
          >
            {user?.company_name ?? '1Mahalla'}
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-widest pl-10" style={{ color: '#047857', fontWeight: 600 }}>
          Mulk boshqaruvi
        </span>
      </div>

      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <p
          className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(26,46,34,0.45)' }}
        >
          Menyu
        </p>
        <div className="space-y-0.5">
          {PM_NAV.map((item) => (
            <NavLink key={item.href} item={item} currentPath={currentPath} />
          ))}
        </div>

        {canSwitchToSales && (
          <>
            <p
              className="px-3 pt-6 pb-3 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'rgba(26,46,34,0.45)' }}
            >
              Portalni o'zgartirish
            </p>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-slate-100"
              style={{ color: 'rgba(26,46,34,0.65)' }}
            >
              <ArrowLeftRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(26,46,34,0.45)' }} />
              Savdo portaliga o'tish
            </Link>
          </>
        )}
      </nav>

      <div
        className="px-3 py-4 shrink-0 space-y-2"
        style={{ borderTop: '1px solid rgba(16,185,129,0.08)' }}
      >
        {user && (
          <div
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl"
            style={{ backgroundColor: 'rgba(16,185,129,0.04)' }}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-xs font-bold text-slate-800"
              style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
            >
              {initials(user.full_name || user.email)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate leading-snug" style={{ color: '#1a2e22' }}>
                {user.full_name}
              </p>
              <p className="text-[10px] truncate leading-snug" style={{ color: 'rgba(26,46,34,0.5)' }}>
                {user.email}
              </p>
            </div>
          </div>
        )}

        {user?.pm_role && (
          <div className="px-1">
            <span
              className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(16,185,129,0.08)', color: '#047857' }}
            >
              {formatPmRole(user.pm_role)}
            </span>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-slate-100"
          style={{ color: 'rgba(26,46,34,0.6)' }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Chiqish
        </button>
      </div>
    </aside>
  );
}
