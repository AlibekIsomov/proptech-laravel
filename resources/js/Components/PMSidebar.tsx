import { useEffect, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import {
  Wrench, HardHat, UserCheck, Gauge, Receipt, Vote, Boxes, Building,
  LayoutDashboard, LogOut, ArrowLeftRight, Building2, FolderKanban,
} from 'lucide-react';

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ElementType;
}

const PM_NAV: NavItem[] = [
  { href: '/pm/dashboard', label: 'Overview',           icon: LayoutDashboard },
  { href: '/pm/projects',  label: 'Projects',           icon: FolderKanban    },
  { href: '/pm/residents', label: 'Residents',          icon: UserCheck       },
  { href: '/pm/requests',  label: 'Requests',           icon: Wrench          },
  { href: '/pm/vendors',   label: 'Vendors',            icon: HardHat         },
  { href: '/pm/invoices',  label: 'Invoices',           icon: Receipt         },
  { href: '/pm/inventory', label: 'Inventory',          icon: Boxes           },
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
        backgroundColor: active ? 'rgba(16,185,129,0.12)' : 'transparent',
        color:           active ? '#6ee7b7' : 'rgba(255,255,255,0.45)',
        borderLeft:      active ? '3px solid #10b981' : '3px solid transparent',
        marginLeft:      '-2px',
        paddingLeft:     active ? 'calc(0.75rem - 1px)' : '0.75rem',
      }}
    >
      <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#10b981' : 'rgba(255,255,255,0.3)' }} />
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

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex flex-col w-56"
      style={{
        backgroundColor: '#0a0f0d',
        borderRight:     '1px solid rgba(16,185,129,0.10)',
      }}
    >
      {/* Logo + portal label */}
      <div
        className="flex flex-col gap-1 h-14 px-4 justify-center shrink-0"
        style={{ borderBottom: '1px solid rgba(16,185,129,0.10)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)' }}
          >
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span
            className="text-sm text-white tracking-tight font-bold"
          >
            {user?.company_name ?? 'PropTech UZ'}
          </span>
        </div>
        <span className="text-[9px] uppercase tracking-widest pl-10" style={{ color: '#34d399' }}>
          Property Management
        </span>
      </div>

      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <p
          className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.22)' }}
        >
          Menu
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
              style={{ color: 'rgba(255,255,255,0.22)' }}
            >
              Switch Portal
            </p>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-white/5"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              <ArrowLeftRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
              Go to Sales
            </Link>
          </>
        )}
      </nav>

      <div
        className="px-3 py-4 shrink-0 space-y-2"
        style={{ borderTop: '1px solid rgba(16,185,129,0.10)' }}
      >
        {user && (
          <div
            className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}
            >
              {initials(user.full_name || user.email)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate leading-snug">
                {user.full_name}
              </p>
              <p className="text-[10px] truncate leading-snug" style={{ color: 'rgba(255,255,255,0.28)' }}>
                {user.email}
              </p>
            </div>
          </div>
        )}

        {user?.pm_role && (
          <div className="px-1">
            <span
              className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399' }}
            >
              {user.pm_role === 'property_manager' ? 'Property Manager' : user.pm_role}
            </span>
          </div>
        )}

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-150 hover:bg-white/5"
          style={{ color: 'rgba(255,255,255,0.32)' }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
