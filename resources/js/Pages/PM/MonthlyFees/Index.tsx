import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import AppShell from '@/Components/AppShell';
import {
  PageHead, Stat, Badge, Btn, Field, PmSelect, EmptyState,
  DollarSign, CheckCircle2, XCircle, Zap, TrendingUp, Filter, AlertCircle,
} from '@/Components/pm/ui';
import type { BadgeTone } from '@/Components/pm/ui';

interface Building { id: string; name: string; pm_project_id: string; }

interface Fee {
  id:          string;
  invoice_number: string;
  apartment_id: string;
  apartment:   string | null;
  building:    string | null;
  building_id: string | null;
  resident:    string | null;
  month:       string | null;
  amount:      number;
  status:      'draft' | 'paid' | 'overdue' | 'sent' | 'cancelled';
  due_date:    string | null;
  paid_at:     string | null;
}

interface Summary {
  total_count:   number;
  paid_count:    number;
  unpaid_count:  number;
  total_amount:  number;
  paid_amount:   number;
  unpaid_amount: number;
}

interface Props {
  buildings:    Building[];
  selectedBldg: string | null;
  month:        string;
  fees:         Fee[];
  summary:      Summary;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  draft:     'warn',
  paid:      'ok',
  overdue:   'danger',
  sent:      'info',
  cancelled: 'neutral',
};
const STATUS_LABEL_KEYS: Record<string, string> = {
  draft:     'pmFees.unpaid',
  paid:      'pmFees.paid',
  overdue:   'pmFees.overdue',
  sent:      'pmFees.paid',
  cancelled: 'common.cancel',
};

function fmt(n: number) { return n.toLocaleString('uz-UZ') + ' UZS'; }

export default function MonthlyFeesIndex({ buildings, selectedBldg, month, fees, summary }: Props) {
  const { t } = useTranslation();
  const { auth } = usePage<any>().props;
  const canEdit = ['super_admin', 'company_admin'].includes(auth.user?.role) || auth.user?.pm_role === 'property_manager';

  const [filterBldg,   setFilterBldg]   = useState(selectedBldg ?? '');
  const [filterMonth,  setFilterMonth]  = useState(month);
  const [filterStatus, setFilterStatus] = useState('');
  const [generating,   setGenerating]   = useState(false);
  const [updatingId,   setUpdatingId]   = useState<string | null>(null);

  function applyFilters(bldg: string, m: string) {
    const params: Record<string, string> = { month: m };
    if (bldg) params.building_id = bldg;
    router.get('/pm/monthly-fees', params, { preserveState: true });
  }

  function handleGenerate() {
    setGenerating(true);
    const body: Record<string, string> = { month: filterMonth };
    if (filterBldg) body.building_id = filterBldg;
    router.post('/pm/monthly-fees/generate', body, { onFinish: () => setGenerating(false) });
  }

  function handleStatusChange(fee: Fee, newStatus: 'paid' | 'draft' | 'overdue') {
    setUpdatingId(fee.id);
    router.patch(`/pm/monthly-fees/${fee.id}`, { status: newStatus }, {
      onFinish:      () => setUpdatingId(null),
      preserveScroll: true,
    });
  }

  const displayedFees = filterStatus ? fees.filter(f => f.status === filterStatus) : fees;
  const [year, mon] = filterMonth.split('-');
  const monthLabel = new Date(Number(year), Number(mon) - 1, 1).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' });

  return (
    <AppShell>
      <div className="page">
        <PageHead
          eyebrow={t('pmFees.sectionLabel')}
          title={t('pmFees.title')}
          sub={t('pmFees.subtitle')}
          actions={canEdit ? (
            <Btn variant="primary" icon={generating ? RefreshCw : Zap as any} disabled={generating} onClick={handleGenerate}>
              {generating ? t('pmFees.generating') : `${monthLabel} ${t('pmFees.generateFor')}`}
            </Btn>
          ) : undefined}
        />

        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <Stat label={t('pmFees.totalPayments')} value={fmt(summary.total_amount)}  icon={DollarSign}   tone="brand"  />
          <Stat label={t('pmFees.paidTotal')}     value={fmt(summary.paid_amount)}   icon={CheckCircle2} tone="ok"     />
          <Stat label={t('pmFees.unpaidTotal')}   value={fmt(summary.unpaid_amount)} icon={AlertCircle}  tone="warn"   />
          <Stat label={t('pmFees.totalApts')}     value={summary.total_count}        icon={TrendingUp}   tone="info"   />
        </div>

        {/* Filters */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
            <Field label={t('pmFees.month')}>
              <input type="month" className="input" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); applyFilters(filterBldg, e.target.value); }} />
            </Field>
            <Field label={t('pmFees.building')}>
              <PmSelect value={filterBldg} onChange={e => { setFilterBldg(e.target.value); applyFilters(e.target.value, filterMonth); }}>
                <option value="">{t('pmFees.allBuildings')}</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </PmSelect>
            </Field>
            <Field label={t('pmFees.status')}>
              <PmSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">{t('pmFees.allStatuses')}</option>
                <option value="draft">{t('pmFees.unpaid')}</option>
                <option value="paid">{t('pmFees.paid')}</option>
                <option value="overdue">{t('pmFees.overdue')}</option>
              </PmSelect>
            </Field>
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          {displayedFees.length === 0 ? (
            <EmptyState
              icon={Filter}
              title={fees.length === 0 ? `${monthLabel} ${t('pmFees.noFees')}` : t('pmFees.noFeesByFilter')}
              action={fees.length === 0 && canEdit ? (
                <Btn variant="soft" icon={Zap as any} onClick={handleGenerate} disabled={generating}>{t('pmFees.generateNow')}</Btn>
              ) : undefined}
            />
          ) : (
            <>
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t('pmFees.colApt')}</th>
                      <th>{t('pmFees.colBuilding')}</th>
                      <th>{t('pmFees.colResident')}</th>
                      <th className="t-right">{t('pmFees.colAmount')}</th>
                      <th>{t('pmFees.colStatus')}</th>
                      {canEdit && <th>{t('pmFees.colAction')}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedFees.map(fee => {
                      const isUpdating = updatingId === fee.id;
                      return (
                        <tr key={fee.id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>№{fee.apartment ?? '—'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{fee.invoice_number}</div>
                          </td>
                          <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{fee.building ?? '—'}</td>
                          <td style={{ fontSize: 13, color: 'var(--text-2)' }}>
                            {fee.resident ?? <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>{t('pmFees.noResident')}</span>}
                          </td>
                          <td className="t-right">
                            <span className="tnum" style={{ fontWeight: 700 }}>{fee.amount.toLocaleString()}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>UZS</span>
                          </td>
                          <td><Badge tone={STATUS_TONE[fee.status] ?? 'neutral'}>{t(STATUS_LABEL_KEYS[fee.status] ?? fee.status)}</Badge></td>
                          {canEdit && (
                            <td>
                              {fee.status !== 'paid' ? (
                                <Btn variant="soft" size="sm" icon={isUpdating ? RefreshCw : CheckCircle2} disabled={isUpdating} onClick={() => handleStatusChange(fee, 'paid')}>
                                  {t('pmFees.markPaid')}
                                </Btn>
                              ) : (
                                <Btn variant="danger-ghost" size="sm" icon={isUpdating ? RefreshCw : XCircle} disabled={isUpdating} onClick={() => handleStatusChange(fee, 'draft')}>
                                  {t('pmFees.markUnpaid')}
                                </Btn>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Footer summary row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)' }}>
                <span>{displayedFees.length} {t('pmFees.recordCount')}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                  {t('pmFees.totalSum')} {fmt(displayedFees.reduce((s, f) => s + f.amount, 0))}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
