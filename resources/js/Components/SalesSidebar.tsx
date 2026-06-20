import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Logo, LangSeg, Badge,
  LayoutDashboard, FolderKanban, Building, LogOut,
  ChevronLeft, ArrowLeftRight,
} from '@/Components/pm/ui';
import { Users, ShieldCheck, Calculator, CreditCard } from 'lucide-react';

interface NavItem { href: string; labelKey: string; Icon: React.FC<React.SVGProps<SVGSVGElement>>; }

function useActiveNav() {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

function NavLink({ item, path }: { item: NavItem; path: string }) {
  const { t } = useTranslation();
  const active = path === item.href || path.startsWith(item.href + '/');
  return (
    <Link href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
      <item.Icon className="ic" />
      <span className="lbl">{t(item.labelKey)}</span>
    </Link>
  );
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  super_admin: [
    { href: '/dashboard', labelKey: 'nav.dashboard', Icon: LayoutDashboard },
    { href: '/companies', labelKey: 'nav.companies', Icon: Building        },
    { href: '/users',     labelKey: 'nav.users',     Icon: ShieldCheck     },
    { href: '/projects',  labelKey: 'nav.projects',  Icon: FolderKanban    },
    { href: '/clients',   labelKey: 'nav.clients',   Icon: Users           },
  ],
  company_admin: [
    { href: '/dashboard', labelKey: 'nav.dashboard', Icon: LayoutDashboard },
    { href: '/users',     labelKey: 'nav.users',     Icon: ShieldCheck     },
    { href: '/projects',  labelKey: 'nav.projects',  Icon: FolderKanban    },
    { href: '/clients',   labelKey: 'nav.clients',   Icon: Users           },
    { href: '/pricing',   labelKey: 'nav.pricing',   Icon: CreditCard      },
  ],
  manager: [
    { href: '/dashboard',  labelKey: 'nav.dashboard',  Icon: LayoutDashboard },
    { href: '/clients',    labelKey: 'nav.clients',    Icon: Users           },
    { href: '/calculator', labelKey: 'nav.calculator', Icon: Calculator      },
  ],
  viewer: [
    { href: '/dashboard',  labelKey: 'nav.dashboard',  Icon: LayoutDashboard },
    { href: '/calculator', labelKey: 'nav.calculator', Icon: Calculator      },
  ],
};

interface AuthUser { full_name: string; email: string; role: string; pm_role: string | null; company_name?: string | null; }

interface Props {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
}

export default function SalesSidebar({ collapsed, setCollapsed, mobileOpen }: Props) {
  const { t } = useTranslation();
  const { auth } = usePage<{ auth?: { user?: AuthUser } }>().props;
  const user = auth?.user;
  const path = useActiveNav();

  const role = user?.role ?? 'viewer';
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE['viewer'];

  const pmDest =
    user?.pm_role === 'property_manager' ? '/pm/dashboard' :
    user?.pm_role === 'dispatcher'       ? '/dispatcher/dashboard' :
    user?.pm_role === 'vendor'           ? '/vendor/dashboard' :
    user?.pm_role === 'resident'         ? '/resident/dashboard' :
    null;

  function handleLogout() { router.post('/logout'); }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sb-top">
        <div className="sb-logo"><Logo size={22} /></div>
        {!collapsed && (
          <div className="sb-brand">
            <span className="nm">{user?.company_name ?? '1mahalla'}</span>
            <span className="sub">{t('nav.salesPortal')}</span>
          </div>
        )}
        <button className="sb-collapse" onClick={() => setCollapsed(!collapsed)} title="Collapse">
          <ChevronLeft className="ic" />
        </button>
      </div>

      <div className="sb-scroll">
        <div className="sb-label">{t('nav.menu')}</div>
        {navItems.map(item => (
          <NavLink key={item.href} item={item} path={path} />
        ))}

        {pmDest && (
          <>
            <div className="sb-label">{t('nav.changePortal')}</div>
            <Link href={pmDest} className="nav-item">
              <ArrowLeftRight className="ic" />
              <span className="lbl">{t('nav.switchToPm')}</span>
            </Link>
          </>
        )}
      </div>

      <div className="sb-bottom">
        {user && (
          <div className="sb-user">
            <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
              {(user.full_name || user.email || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="meta">
              <div className="nm">{user.full_name}</div>
              <div className="em">{user.email}</div>
            </div>
          </div>
        )}

        {!collapsed && user && (
          <div style={{ padding: '6px 10px 8px' }}>
            <Badge tone={role === 'super_admin' ? 'danger' : role === 'company_admin' ? 'brand' : 'neutral'}>
              {t(`roles.${role}`, { defaultValue: role })}
            </Badge>
          </div>
        )}

        {!collapsed && (
          <div style={{ padding: '0 10px 8px' }}>
            <LangSeg />
          </div>
        )}

        <button className="sb-logout" onClick={handleLogout}>
          <LogOut className="ic" />
          <span className="lbl">{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
