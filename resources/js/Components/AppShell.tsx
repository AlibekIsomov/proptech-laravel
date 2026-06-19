import { useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Sidebar';
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
  }, [theme]);

  const isPm = isPmPath(path);

  if (!isPm) {
    // ── Sales portal (original layout) ─────────────────────────────────────
    return (
      <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        <Sidebar />
        <div className="flex flex-col flex-1" style={{ marginLeft: '14rem' }}>
          <main className="p-6 md:p-8 flex-1">{children}</main>
        </div>
      </div>
    );
  }

  // ── PM portal (new 1mahalla design) ────────────────────────────────────────
  return (
    <div className="pm-portal" data-theme={theme}>
      <PMSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        openRequestCount={openRequestCount}
      />

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
