import { useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
  Logo, LangSeg,
  LayoutDashboard, FolderKanban, UserCheck, Wrench,
  Receipt, DollarSign, Boxes, LogOut,
  Plus, ChevronLeft,
} from '@/Components/pm/ui';

// Match existing lucide-react for contractors icon
import { HardHat } from 'lucide-react';

interface NavItem { href: string; labelKey: string; Icon: React.FC<React.SVGProps<SVGSVGElement>>; badge?: number; }

function useActiveNav() {
  if (typeof window === 'undefined') return '';
  return window.location.pathname;
}

function NavLink({ item, collapsed, path }: { item: NavItem; collapsed: boolean; path: string }) {
  const { t } = useTranslation();
  const active = path === item.href || path.startsWith(item.href + '/');
  return (
    <Link href={item.href} className={`nav-item ${active ? 'active' : ''}`}>
      <item.Icon className="ic" />
      <span className="lbl">{t(item.labelKey)}</span>
      {item.badge ? <span className="badge-mini">{item.badge}</span> : null}
    </Link>
  );
}

interface AuthUser { full_name: string; email: string; role: string; company_name?: string | null; }

interface Props {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  onNewRequest?: () => void;
  openRequestCount?: number;
}

const PM_NAV: NavItem[] = [
  { href: '/pm/dashboard',    labelKey: 'nav.dashboard',    Icon: LayoutDashboard },
  { href: '/pm/projects',     labelKey: 'nav.projects',     Icon: FolderKanban    },
  { href: '/pm/residents',    labelKey: 'nav.residents',    Icon: UserCheck       },
  { href: '/pm/requests',     labelKey: 'nav.requests',     Icon: Wrench          },
  { href: '/pm/vendors',      labelKey: 'nav.vendors',      Icon: HardHat         },
  { href: '/pm/invoices',     labelKey: 'nav.invoices',     Icon: Receipt         },
  { href: '/pm/monthly-fees', labelKey: 'nav.monthlyFees',  Icon: DollarSign      },
  { href: '/pm/inventory',    labelKey: 'nav.inventory',    Icon: Boxes           },
];

export default function PMSidebar({ collapsed, setCollapsed, mobileOpen, onNewRequest, openRequestCount }: Props) {
  const { t } = useTranslation();
  const { auth } = usePage<{ auth?: { user?: AuthUser } }>().props;
  const user = auth?.user;
  const path = useActiveNav();

  const navWithBadge = PM_NAV.map(item =>
    item.href === '/pm/requests' && openRequestCount
      ? { ...item, badge: openRequestCount }
      : item
  );

  function handleLogout() { router.post('/logout'); }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo + brand */}
      <div className="sb-top">
        <div className="sb-logo"><Logo size={22} /></div>
        {!collapsed && (
          <div className="sb-brand">
            <span className="nm">1mahalla</span>
            <span className="sub">{t('nav.propertyMgmt')}</span>
          </div>
        )}
        <button className="sb-collapse" onClick={() => setCollapsed(!collapsed)} title="Collapse">
          <ChevronLeft className="ic" />
        </button>
      </div>

      {/* CTA button */}
      <div className="sb-cta">
        <button className="btn btn-primary" onClick={onNewRequest}>
          <Plus className="ic" />
          {!collapsed && <span>{t('nav.newRequest', { defaultValue: 'Yangi ariza' })}</span>}
        </button>
      </div>

      {/* Nav */}
      <div className="sb-scroll">
        <div className="sb-label">{t('nav.menu')}</div>
        {navWithBadge.map(item => (
          <NavLink key={item.href} item={item} collapsed={collapsed} path={path} />
        ))}
      </div>

      {/* Bottom: user + lang + logout */}
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

        {!collapsed && (
          <div style={{ padding: '8px 10px' }}>
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
