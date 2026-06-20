/**
 * 1mahalla PM Portal — shared UI primitives
 */
import { useEffect, ReactNode, FC, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle, AlertTriangle, AlarmClock, ArrowLeft, ArrowRight,
  Bell, Building, Building2, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, Clock, CreditCard,
  Download, Edit2, Eye, EyeOff, FileText, Gauge, Home, Inbox,
  List, Loader2, LogOut, Mail, MapPin, MessageCircle,
  Moon, Package, Paperclip, Phone, Plus, PlusCircle,
  Printer, Search, Send, Settings, Sparkles, Star,
  Sun, TrendingUp, Trash2, User, UserPlus, Wallet, Wrench, X, XCircle, Zap,
  PanelLeft, Grid, Filter, LayoutDashboard, FolderKanban, UserCheck,
  Receipt, DollarSign, Boxes, ArrowLeftRight,
} from 'lucide-react';

// Re-export all icons for convenience
export {
  AlertCircle, AlertTriangle, AlarmClock, ArrowLeft, ArrowRight,
  Bell, Building, Building2, Check, CheckCircle2, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, Clock, CreditCard,
  Download, Edit2, Eye, EyeOff, FileText, Gauge, Home, Inbox,
  List, Loader2, LogOut, Mail, MapPin, MessageCircle,
  Moon, Package, Paperclip, Phone, Plus, PlusCircle,
  Printer, Search, Send, Settings, Sparkles, Star,
  Sun, TrendingUp, Trash2, User, UserPlus, Wallet, Wrench, X, XCircle, Zap,
  PanelLeft, Grid, Filter, LayoutDashboard, FolderKanban, UserCheck,
  Receipt, DollarSign, Boxes, ArrowLeftRight,
};

// ── Logo ──────────────────────────────────────────────────────────────────────
export function Logo({ size = 26, light = '#FBF7EF', accent = '#CFEFDE' }: { size?: number; light?: string; accent?: string }) {
  return (
    <svg viewBox="0 0 96 96" width={size} height={size}>
      <path d="M17 72 H33 M25 72 V32 L18 38" fill="none" stroke={light} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 72 V43 M60 72 V43 M80 72 V43 M40 43 Q49 30 50 25 Q51 30 60 43 M60 43 Q69 30 70 25 Q71 30 80 43" fill="none" stroke={accent} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Btn ───────────────────────────────────────────────────────────────────────
type LucideIcon = FC<SVGProps<SVGSVGElement>>;

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'soft' | 'dark' | 'accent' | 'danger-ghost';
  size?: 'sm' | 'lg';
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  block?: boolean;
}
export function Btn({ variant = 'ghost', size, icon: Icon, iconRight: IconRight, block, children, className = '', ...rest }: BtnProps) {
  const cls = ['btn', `btn-${variant}`, size ? `btn-${size}` : '', block ? 'btn-block' : '', className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...rest}>
      {Icon && <Icon className="ic" />}
      {children != null && <span>{children}</span>}
      {IconRight && <IconRight className="ic" />}
    </button>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export type BadgeTone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'brand' | 'violet';
export function Badge({ tone = 'neutral', dot, children }: { tone?: BadgeTone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`badge ${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, color, square, size = 40 }: { name: string; color?: string; square?: boolean; size?: number }) {
  const initials = (name || '?').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className={`avatar ${square ? 'sq ' : ''}${color || ''}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {initials}
    </div>
  );
}

// ── Stat ──────────────────────────────────────────────────────────────────────
type StatTone = 'brand' | 'ok' | 'warn' | 'danger' | 'info' | 'violet' | 'neutral';
export function Stat({ label, value, suffix, icon: Icon, tone = 'brand', delta, deltaTone }: {
  label: string; value: ReactNode; suffix?: string; icon: LucideIcon;
  tone?: StatTone; delta?: ReactNode; deltaTone?: string;
}) {
  return (
    <div className="stat">
      <div className="st-top">
        <span className="st-label">{label}</span>
        <span className={`st-ic ${tone}`}><Icon className="ic" /></span>
      </div>
      <div className="st-val tnum">
        {value}
        {suffix && <small>{suffix}</small>}
      </div>
      {delta && (
        <div className="st-delta" style={{ color: `var(--${deltaTone || 'ok'})` }}>
          <TrendingUp className="ic" style={{ width: 14, height: 14 }} />
          {delta}
        </div>
      )}
    </div>
  );
}

// ── Field / TextInput / Select ─────────────────────────────────────────────────
export function Field({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <label className="field">
      {label && <span className="field-label">{label}</span>}
      {children}
    </label>
  );
}

export function TextInput({ icon: Icon, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon }) {
  if (Icon) {
    return (
      <div className="input-wrap">
        <Icon className="ic" />
        <input className="input" {...rest} />
      </div>
    );
  }
  return <input className="input" {...rest} />;
}

export function PmSelect({ children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...rest}>{children}</select>;
}

// ── Seg ───────────────────────────────────────────────────────────────────────
export function Seg({ options, value, onChange }: {
  options: { value: string; label: string; icon?: LucideIcon }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <o.icon className="ic" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── LangSeg ───────────────────────────────────────────────────────────────────
export function LangSeg() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ru') ? 'ru' : 'uz';
  function switchTo(l: string) {
    i18n.changeLanguage(l);
    localStorage.setItem('lang', l);
  }
  return (
    <div className="lang-seg">
      <button className={lang === 'uz' ? 'on' : ''} onClick={() => switchTo('uz')}>O'Z</button>
      <button className={lang === 'ru' ? 'on' : ''} onClick={() => switchTo('ru')}>RU</button>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, value, onChange }: { tabs: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <button key={t.value} className={value === t.value ? 'on' : ''} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, sub, action }: { icon: LucideIcon; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="e-ic"><Icon className="ic" /></div>
      <h3>{title}</h3>
      {sub && <p>{sub}</p>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

// ── PageHead ──────────────────────────────────────────────────────────────────
export function PageHead({ eyebrow, title, sub, actions }: { eyebrow?: string; title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <div className="ph-main">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="ph-actions">{actions}</div>}
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
export function Drawer({ open, onClose, title, sub, children, footer, width }: {
  open: boolean; onClose: () => void; title: string; sub?: string;
  children: ReactNode; footer?: ReactNode; width?: number | string;
}) {
  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`drawer ${open ? 'show' : ''}`} style={width ? { width } : undefined}>
        <div className="drawer-head">
          <div>
            <div className="dh-title">{title}</div>
            {sub && <div className="dh-sub">{sub}</div>}
          </div>
          <button className="drawer-close" onClick={onClose}><X className="ic" /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
export type PriorityTone = 'danger' | 'warn' | 'info' | 'neutral';
export function priorityTone(p: string): PriorityTone {
  return ({ emergency: 'danger', high: 'warn', medium: 'info', low: 'neutral' } as Record<string, PriorityTone>)[p] || 'neutral';
}

export type TicketStatusTone = 'warn' | 'info' | 'ok' | 'neutral';
export function ticketStatusTone(s: string): TicketStatusTone {
  return ({ open: 'warn', assigned: 'info', in_progress: 'info', completed: 'ok', done: 'ok' } as Record<string, TicketStatusTone>)[s] || 'neutral';
}

export type InvoiceTone = 'neutral' | 'info' | 'ok' | 'danger';
export function invoiceStatusTone(s: string): InvoiceTone {
  return ({ draft: 'neutral', sent: 'info', paid: 'ok', overdue: 'danger', cancelled: 'neutral' } as Record<string, InvoiceTone>)[s] || 'neutral';
}

export function fmtUZS(n: number) {
  return n.toLocaleString('ru-RU').replace(/,/g, ' ');
}
