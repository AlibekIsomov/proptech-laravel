import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import SalesSidebar from '@/Components/SalesSidebar';
import PMSidebar from '@/Components/PMSidebar';
import PMTopbar from '@/Components/pm/PMTopbar';
import { Sparkles } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  /** Number of open maintenance requests — shown as badge on sidebar */
  openRequestCount?: number;
}

function isPmPath(path: string) {
  return (
    path.startsWith('/pm') ||
    path.startsWith('/dispatcher') ||
    path.startsWith('/resident') ||
    path.startsWith('/vendor')
  );
}

export default function AppShell({ children, openRequestCount }: Props) {
  const [path, setPath] = useState('');
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('1m_sb_collapsed') === '1'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem('1m_theme') as 'light' | 'dark') || 'light'; } catch { return 'light'; }
  });

  useEffect(() => { setPath(window.location.pathname); }, []);

  useEffect(() => {
    try { localStorage.setItem('1m_sb_collapsed', collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);

  useEffect(() => {
    try { localStorage.setItem('1m_theme', theme); } catch {}
    // Tema ichkaridagi div'da turadi, brauzer esa native elementlarni (select
    // ro'yxati, scrollbar) hujjat darajasidagi color-scheme bo'yicha chizadi
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const isPm = isPmPath(path);

  // ── Unified 1mahalla design (Sales CRM + PM portal share the same shell) ────
  return (
    <div className="pm-portal" data-theme={theme}>
      {isPm ? (
        <PMSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          openRequestCount={openRequestCount}
        />
      ) : (
        <SalesSidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
        />
      )}

      <div className="main">
        <PMTopbar
          onBurger={() => setMobileOpen(m => !m)}
          theme={theme}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        />
        <div className="content">
          {children}
        </div>
      </div>

      {/* AI FAB */}
      <button className="fab" title="AI Assistant">
        <Sparkles className="ic" />
      </button>
    </div>
  );
}
