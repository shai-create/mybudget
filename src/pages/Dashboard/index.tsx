import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import './dashboard.css';

// ── Inline SVG icons ──────────────────────────────────────────
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const TxIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
  </svg>
);
const PlanIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5C3.9 5 3 5.9 3 7v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
  </svg>
);
const CatIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
  </svg>
);
const BellIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.93 6 11v5l-2 2v1h16v-1l-2-2z" />
  </svg>
);

// ── Dashboard ─────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);

  // ── Month navigation
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear]   = useState(today.getFullYear());

  // ── User
  const [nickname, setNickname] = useState('');

  // ── Financial
  const [balance,          setBalance]          = useState(0);
  const [forecastAmount,   setForecastAmount]   = useState(0);
  const [totalIncome,      setTotalIncome]      = useState(0);
  const [fixedExpenses,    setFixedExpenses]    = useState(0);
  const [variableExpenses, setVariableExpenses] = useState(0);
  const [investments,      setInvestments]      = useState(0);

  // ── Budget
  const [incomeBudget,     setIncomeBudget]     = useState(0);
  const [fixedBudget,      setFixedBudget]      = useState(0);
  const [variableBudget,   setVariableBudget]   = useState(0);
  const [investmentBudget, setInvestmentBudget] = useState(0);

  // ── Gamification
  const [streakDays, setStreakDays] = useState(0);

  // ── UI
  const [loading,         setLoading]         = useState(true);
  const [hasTransactions, setHasTransactions] = useState(false);
  const [hasBudget,       setHasBudget]       = useState(false);

  // ── Computed helpers
  const daysInMonth    = new Date(viewYear, viewMonth, 0).getDate();
  const isCurrentMonth = viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();
  const daysLeft       = isCurrentMonth ? daysInMonth - today.getDate() : 0;

  const fmt = (n: number) =>
    Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });

  const getGreeting = useCallback(() => {
    const h = today.getHours();
    const word =
      h < 5  ? 'לילה טוב'    :
      h < 12 ? 'בוקר טוב'    :
      h < 17 ? 'צהריים טובים':
      h < 21 ? 'ערב טוב'     : 'לילה טוב';
    return nickname ? `${word}, ${nickname}!` : `${word}!`;
  }, [today, nickname]);

  const hebrewDate = useMemo(() => {
    const dayNames  = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
    const monthKey  = String(today.getMonth() + 1);
    return `יום ${dayNames[today.getDay()]}, ${today.getDate()} ב${t(`months.${monthKey}`)} ${today.getFullYear()}`;
  }, [today, t]);

  const monthLabel = `${t(`months.${viewMonth}`)} ${viewYear}`;

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Fetch all dashboard data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1 — user profile
      const { data: ud } = await supabase
        .from('users')
        .select('nickname, gender')
        .eq('id', user.id)
        .single();
      if (ud) setNickname(ud.nickname ?? '');

      // 2 — primary account (balance + id); maybeSingle avoids 406 if missing
      const { data: acc } = await supabase
        .from('accounts')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      const accountId  = acc?.id   ?? null;
      const bal        = Number(acc?.balance ?? 0);
      setBalance(bal);

      // 3 — monthly summary (forecast_amount)
      let dbForecast: number | null = null;
      if (accountId) {
        const { data: sm } = await supabase
          .from('monthly_summaries')
          .select('forecast_amount')
          .eq('account_id', accountId)
          .eq('month', viewMonth)
          .eq('year', viewYear)
          .maybeSingle();
        if (sm?.forecast_amount != null) dbForecast = Number(sm.forecast_amount);
      }

      // 4 — transactions for the month
      const startDate = `${viewYear}-${String(viewMonth).padStart(2,'0')}-01`;
      const endDate   = `${viewYear}-${String(viewMonth).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;

      let inc = 0, fix = 0, varr = 0, inv = 0, txCount = 0;

      if (accountId) {
        const { data: txs } = await supabase
          .from('transactions')
          .select('amount, type, recurring, categories(type, is_fixed)')
          .eq('account_id', accountId)
          .eq('status', 'completed')
          .gte('date', startDate)
          .lte('date', endDate);

        txCount = txs?.length ?? 0;

        txs?.forEach((tx: any) => {
          const amt     = Number(tx.amount ?? 0);
          const catType = tx.categories?.type ?? '';
          const isFixed = tx.recurring === true || tx.categories?.is_fixed === true;

          if (tx.type === 'income' || catType === 'income') {
            inc += amt;
          } else if (catType === 'investment' || tx.type === 'investment') {
            inv += amt;
          } else if (tx.type === 'expense') {
            if (isFixed) fix += amt;
            else          varr += amt;
          }
        });
      }

      setTotalIncome(inc);
      setFixedExpenses(fix);
      setVariableExpenses(varr);
      setInvestments(inv);
      setHasTransactions(txCount > 0);

      // 5 — calculate forecast if not in DB
      if (dbForecast !== null) {
        setForecastAmount(dbForecast);
      } else {
        const totalExp   = fix + varr + inv;
        const net        = inc - totalExp;
        const daysPassed = Math.max(isCurrentMonth ? today.getDate() : daysInMonth, 1);
        const netPerDay  = net / daysPassed;
        const projected  = isCurrentMonth ? bal + netPerDay * daysLeft : bal + net;
        setForecastAmount(projected);
      }

      // 6 — budgets for the month
      let bInc = 0, bFix = 0, bVar = 0, bInv = 0;
      if (accountId) {
        const { data: bgets } = await supabase
          .from('budgets')
          .select('planned_amount, categories(type, is_fixed)')
          .eq('account_id', accountId)
          .eq('month', viewMonth)
          .eq('year', viewYear);

        setHasBudget((bgets?.length ?? 0) > 0);
        bgets?.forEach((b: any) => {
          const amt     = Number(b.planned_amount ?? 0);
          const catType = b.categories?.type ?? '';
          const isFixed = b.categories?.is_fixed === true;
          if      (catType === 'income')     bInc += amt;
          else if (catType === 'investment') bInv += amt;
          else if (isFixed)                  bFix += amt;
          else                               bVar += amt;
        });
      }
      setIncomeBudget(bInc);
      setFixedBudget(bFix);
      setVariableBudget(bVar);
      setInvestmentBudget(bInv);

      // 7 — gamification
      const { data: gam } = await supabase
        .from('gamification')
        .select('streak_days')
        .eq('user_id', user.id)
        .maybeSingle();
      setStreakDays(gam?.streak_days ?? 0);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, viewMonth, viewYear, daysInMonth, isCurrentMonth, daysLeft, today]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── 3-status indicators
  const statuses = useMemo(() => {
    const totalExp = fixedExpenses + variableExpenses + investments;
    const totalBudget = fixedBudget + variableBudget + investmentBudget;
    const budgetPct = totalBudget > 0 ? totalExp / totalBudget : -1;
    const hasOverspend =
      (fixedBudget    > 0 && fixedExpenses    > fixedBudget)    ||
      (variableBudget > 0 && variableExpenses > variableBudget) ||
      (investmentBudget > 0 && investments    > investmentBudget);

    const forecastStatus = forecastAmount >= 0 ? 'good' : 'danger';
    const forecastLabel  = forecastAmount >= 0
      ? t('dashboard.status_forecast')
      : t('dashboard.status_forecast_danger');

    let budgetStatus: 'good' | 'warning' | 'danger' = 'good';
    let budgetLabel = t('dashboard.status_budget');
    if (budgetPct > 1)         { budgetStatus = 'danger';  budgetLabel = t('dashboard.status_danger'); }
    else if (budgetPct > 0.9)  { budgetStatus = 'warning'; budgetLabel = t('dashboard.status_budget_warning'); }

    const overspendStatus: 'good' | 'danger' = hasOverspend ? 'danger' : 'good';
    const overspendLabel  = hasOverspend
      ? t('dashboard.status_overspend_danger')
      : t('dashboard.status_overspend');

    return [
      { status: forecastStatus,  label: forecastLabel  },
      { status: budgetStatus,    label: budgetLabel     },
      { status: overspendStatus, label: overspendLabel  },
    ];
  }, [forecastAmount, fixedExpenses, variableExpenses, investments,
      fixedBudget, variableBudget, investmentBudget, t]);

  // ── Progress bar helper
  const pct = (actual: number, budget: number) =>
    budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;

  // ── Loading skeleton
  if (loading) {
    return (
      <div className="db-page">
        <header className="db-header">
          <div className="db-skeleton" style={{ width: 180, height: 42, borderRadius: 8 }} />
          <div className="db-skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
        </header>
        <div className="db-month-nav">
          <div className="db-skeleton" style={{ width: 150, height: 22, borderRadius: 6 }} />
        </div>
        <div className="db-skeleton db-skeleton--hero" />
        <div className="db-status-row">
          {[1,2,3].map(i => (
            <div key={i} className="db-skeleton" style={{ flex: 1, height: 36, borderRadius: 8 }} />
          ))}
        </div>
        <div className="db-cards-grid">
          {[1,2,3,4].map(i => (
            <div key={i} className="db-skeleton db-skeleton--card" />
          ))}
        </div>
        <nav className="db-bottom-nav" />
      </div>
    );
  }

  // ── Main render
  return (
    <div className="db-page">

      {/* ── Header ── */}
      <header className="db-header">
        <div className="db-greeting">
          <span className="db-greeting-name">{getGreeting()}</span>
          <span className="db-greeting-date">{hebrewDate}</span>
        </div>
        <button className="db-bell-btn" aria-label={t('dashboard.notifications_empty')}>
          <BellIcon />
        </button>
      </header>

      {/* ── Month Navigator ── */}
      <div className="db-month-nav" dir="ltr">
        <button className="db-month-btn" onClick={prevMonth} aria-label="חודש קודם">‹</button>
        <span className="db-month-label">{monthLabel}</span>
        <button className="db-month-btn" onClick={nextMonth} aria-label="חודש הבא">›</button>
      </div>

      {/* ── No Budget Banner ── */}
      {!hasBudget && hasTransactions && (
        <div className="db-no-budget-banner">
          <div className="db-no-budget-text">
            <span className="db-no-budget-title">{t('dashboard.no_budget')}</span>
            <span className="db-no-budget-sub">{t('dashboard.no_budget_prev')}</span>
          </div>
          <button className="db-no-budget-btn" onClick={() => navigate('/planning')}>
            {t('dashboard.set_budget')}
          </button>
        </div>
      )}

      {/* ── Hero Card ── */}
      <div className="db-hero">
        {streakDays > 0 && (
          <div className="db-streak-badge">
            🔥 {streakDays} {t('dashboard.streak_days')}
          </div>
        )}

        <div className="db-hero-label">{t('dashboard.forecast_label')}</div>
        <div className={`db-hero-forecast${forecastAmount < 0 ? ' db-hero-forecast--negative' : ''}`}>
          {forecastAmount < 0 ? '-' : ''}₪{fmt(forecastAmount)}
        </div>

        <div className="db-hero-sub">
          <span>{t('dashboard.balance_label')}: ₪{fmt(balance)}</span>
          {isCurrentMonth && (
            <span>{t('dashboard.days_left', { days: daysLeft })}</span>
          )}
        </div>
      </div>

      {/* ── Status Row ── */}
      {hasTransactions && (
        <div className="db-status-row">
          {statuses.map((s, i) => (
            <div key={i} className={`db-status-item db-status-item--${s.status}`}>
              <div className="db-status-dot" />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!hasTransactions ? (
        <div className="db-empty">
          <div className="db-empty-icon">📊</div>
          <p className="db-empty-text">{t('dashboard.no_data')}</p>
          <button className="db-empty-btn" onClick={() => navigate('/transactions')}>
            {t('dashboard.no_data_action')}
          </button>
        </div>
      ) : (
        /* ── 4 Category Cards ── */
        <div className="db-cards-grid">

          {/* הכנסות */}
          <div className="db-card db-card--income">
            <div className="db-card-header">
              <span className="db-card-icon">💰</span>
              {incomeBudget > 0 && totalIncome < incomeBudget * 0.7 && (
                <span className="db-card-over-badge">נמוך</span>
              )}
            </div>
            <div className="db-card-label">{t('dashboard.card_income')}</div>
            <div className="db-card-amount">₪{fmt(totalIncome)}</div>
            {incomeBudget > 0 && (
              <>
                <div className="db-card-planned">{t('dashboard.card_planned')}: ₪{fmt(incomeBudget)}</div>
                <div className="db-card-bar">
                  <div className="db-card-bar-fill" style={{ width: `${pct(totalIncome, incomeBudget)}%` }} />
                </div>
              </>
            )}
          </div>

          {/* הוצאות קבועות */}
          <div className="db-card db-card--fixed">
            <div className="db-card-header">
              <span className="db-card-icon">🏠</span>
              {fixedBudget > 0 && fixedExpenses > fixedBudget && (
                <span className="db-card-over-badge">{t('dashboard.card_over')}</span>
              )}
            </div>
            <div className="db-card-label">{t('dashboard.card_fixed')}</div>
            <div className="db-card-amount">₪{fmt(fixedExpenses)}</div>
            {fixedBudget > 0 && (
              <>
                <div className="db-card-planned">{t('dashboard.card_planned')}: ₪{fmt(fixedBudget)}</div>
                <div className="db-card-bar">
                  <div className="db-card-bar-fill" style={{ width: `${pct(fixedExpenses, fixedBudget)}%` }} />
                </div>
              </>
            )}
          </div>

          {/* הוצאות משתנות */}
          <div className="db-card db-card--variable">
            <div className="db-card-header">
              <span className="db-card-icon">🛍️</span>
              {variableBudget > 0 && variableExpenses > variableBudget && (
                <span className="db-card-over-badge">{t('dashboard.card_over')}</span>
              )}
            </div>
            <div className="db-card-label">{t('dashboard.card_variable')}</div>
            <div className="db-card-amount">₪{fmt(variableExpenses)}</div>
            {variableBudget > 0 && (
              <>
                <div className="db-card-planned">{t('dashboard.card_planned')}: ₪{fmt(variableBudget)}</div>
                <div className="db-card-bar">
                  <div className="db-card-bar-fill" style={{ width: `${pct(variableExpenses, variableBudget)}%` }} />
                </div>
              </>
            )}
          </div>

          {/* השקעות */}
          <div className="db-card db-card--investment">
            <div className="db-card-header">
              <span className="db-card-icon">📈</span>
              {investmentBudget > 0 && investments > investmentBudget && (
                <span className="db-card-over-badge">{t('dashboard.card_over')}</span>
              )}
            </div>
            <div className="db-card-label">{t('dashboard.card_investment')}</div>
            <div className="db-card-amount">₪{fmt(investments)}</div>
            {investmentBudget > 0 && (
              <>
                <div className="db-card-planned">{t('dashboard.card_planned')}: ₪{fmt(investmentBudget)}</div>
                <div className="db-card-bar">
                  <div className="db-card-bar-fill" style={{ width: `${pct(investments, investmentBudget)}%` }} />
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* ── FAB ── */}
      <button
        className="db-fab"
        onClick={() => navigate('/transactions', { state: { showForm: true } })}
        aria-label={t('dashboard.add_transaction')}
      >
        +
      </button>

      {/* ── Bottom Nav ── */}
      <nav className="db-bottom-nav">
        <button className="db-nav-item db-nav-item--active" onClick={() => navigate('/')}>
          <span className="db-nav-icon"><HomeIcon /></span>
          <span>{t('nav.home')}</span>
        </button>
        <button className="db-nav-item" onClick={() => navigate('/transactions')}>
          <span className="db-nav-icon"><TxIcon /></span>
          <span>{t('nav.transactions')}</span>
        </button>
        <button className="db-nav-item" onClick={() => navigate('/planning')}>
          <span className="db-nav-icon"><PlanIcon /></span>
          <span>{t('nav.planning')}</span>
        </button>
        <button className="db-nav-item" onClick={() => navigate('/categories')}>
          <span className="db-nav-icon"><CatIcon /></span>
          <span>{t('nav.categories')}</span>
        </button>
      </nav>

    </div>
  );
};

export default Dashboard;
