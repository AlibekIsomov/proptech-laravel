import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Bell, ChevronDown, PanelLeft } from 'lucide-react';
import { PmIcon } from '@/Components/pm/ui';

interface Props {
  onBurger?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function PMTopbar({ onBurger, theme, onToggleTheme }: Props) {
  const { t } = useTranslation();
  const { auth } = usePage<{ auth?: { user?: { company_name?: string } } }>().props;
  const companyName = auth?.user?.company_name ?? '1Mahalla';

  return (
    <header className="topbar">
      <button className="tb-icon-btn" onClick={onBurger} style={{ display: 'none' }} data-burger>
        <PanelLeft className="ic" />
      </button>

      <div className="tb-right">
        <button className="tb-org">
          {companyName}
          <ChevronDown className="ic" />
        </button>

        <button className="tb-icon-btn" onClick={onToggleTheme} title="Toggle theme">
          {theme === 'dark'
            ? <Sun className="ic" style={{ width: 19, height: 19 }} />
            : <Moon className="ic" style={{ width: 19, height: 19 }} />
          }
        </button>

        <button className="tb-icon-btn">
          <Bell className="ic" />
          <span className="dot" />
        </button>
      </div>
    </header>
  );
}
