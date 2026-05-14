import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import './transactions.css';

// ── Icons ──────────────────────────────────────────────────────
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
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
  </svg>
);

// ── Types ──────────────────────────────────────────────────────
type TxType = 'expense' | 'income' | 'transfer' | 'investment';

interface Category {
  id: string;
  name: string;
  icon: string | null;
  type: string;
}

interface TxRow {
  id: string;
  name: string;
  amount: number;
  type: TxType;
  date: string;
  status: string;
  is_recurring: boolean | null;
  categories: { name: string; icon: string | null } | null;
}

interface Suggestion {
  name: string;
  category_id: string | null;
  type: string;
  categories: { icon: string | null; name: string } | null;
}

// ── Constants ──────────────────────────────────────────────────
const TX_TYPES: { id: TxType; label: string }[] = [
  { id: 'expense',    label: 'הוצאה'  },
  { id: 'income',     label: 'הכנסה'  },
  { id: 'transfer',   label: 'העברה'  },
  { id: 'investment', label: 'השקעה'  },
];

const INCOME_SUBTYPES = [
  { value: 'regular',  label: 'משכורת'   },
  { value: 'bonus',    label: 'בונוס'     },
  { value: 'gift',     label: 'מתנה'      },
  { value: 'refund',   label: 'החזר'      },
  { value: 'one_time', label: 'חד פעמי'  },
];

const NUMPAD_KEYS = ['7','8','9','4','5','6','1','2','3','.','0','⌫'];

const todayStr = () => new Date().toISOString().split('T')[0];

const fmt = (n: number) =>
  Number(n).toLocaleString('he-IL', { maximumFractionDigits: 2 });

const fmtDate = (dateStr: string, t: (k: string) => string) => {
  const [year, month, day] = dateStr.split('-');
  return `${parseInt(day)} ב${t(`months.${parseInt(month)}`)} ${year}`;
};

const groupByMonth = (txs: TxRow[], t: (k: string) => string) => {
  const groups: Map<string, TxRow[]> = new Map();
  txs.forEach(tx => {
    const [year, month] = tx.date.split('-');
    const key = `${year}-${month}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  });
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, rows]) => {
      const [year, month] = key.split('-');
      return { label: `${t(`months.${parseInt(month)}`)} ${year}`, rows };
    });
};

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
const Transactions: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ── List state
  const [txList, setTxList]         = useState<TxRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [primaryAccountId, setPrimaryAccountId] = useState<string | null>(null);

  // ── Form visibility
  // NOTE: useState initializer alone is unreliable here because ProtectedRoute
  // starts with loading:true, so Transactions mounts AFTER auth resolves —
  // by that point useState has already captured false. useLayoutEffect runs
  // synchronously before the first paint, so it sets the state with no flash.
  const [showForm, setShowForm] = useState(false);
  const cameFromDashboard = useRef(false);

  useLayoutEffect(() => {
    if ((location.state as any)?.showForm === true) {
      setShowForm(true);
      cameFromDashboard.current = true;
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Form state
  const [amount,             setAmount]             = useState('0');
  const [txName,             setTxName]             = useState('');
  const [txType,             setTxType]             = useState<TxType>('expense');
  const [categoryId,         setCategoryId]         = useState<string | null>(null);
  const [txDate,             setTxDate]             = useState(todayStr());
  const [isRecurring,        setIsRecurring]        = useState(false);
  const [showInstallments,   setShowInstallments]   = useState(false);
  const [installmentsTotal,  setInstallmentsTotal]  = useState(2);
  const [installmentNumber,  setInstallmentNumber]  = useState(1);
  const [incomeSubtype,      setIncomeSubtype]      = useState('regular');
  const [categories,         setCategories]         = useState<Category[]>([]);
  const [suggestions,        setSuggestions]        = useState<Suggestion[]>([]);
  const [saving,             setSaving]             = useState(false);

  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFuture = txDate > todayStr();

  // ── Grouped list
  const grouped = useMemo(() => groupByMonth(txList, t), [txList, t]);

  // ══════════════════════════════════════════════════════════════
  // Data fetching
  // ══════════════════════════════════════════════════════════════
  const fetchList = useCallback(async (accId: string) => {
    const { data } = await supabase
      .from('transactions')
      .select('id, name, amount, type, date, status, is_recurring, categories(name, icon)')
      .eq('account_id', accId)
      .order('date', { ascending: false })
      .limit(100);

    setTxList((data as any[]) ?? []);
    setLoadingList(false);
  }, []);

  const fetchAccountAndList = useCallback(async () => {
    if (!user) return;

    // 1. Try primary account
    let accId: string | null = null;
    const { data: primary } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();                    // ← no 406 when 0 rows

    if (primary?.id) {
      accId = primary.id;
    } else {
      // 2. Fall back to any account for this user
      const { data: any_ } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (any_?.id) {
        accId = any_.id;
      } else {
        // 3. No account at all — create one automatically
        const { data: created } = await supabase
          .from('accounts')
          .insert({
            user_id:    user.id,
            name:       'חשבון ראשי',
            type:       'personal',
            balance:    0,
            is_primary: true,
            currency:   'ILS',
          })
          .select('id')
          .maybeSingle();
        accId = created?.id ?? null;
      }
    }

    setPrimaryAccountId(accId);
    if (accId) await fetchList(accId);
    else setLoadingList(false);
  }, [user, fetchList]);

  useEffect(() => { fetchAccountAndList(); }, [fetchAccountAndList]);

  const fetchCategories = useCallback(async (type: TxType) => {
    if (!user || type === 'transfer') { setCategories([]); return; }
    const { data } = await supabase
      .from('categories')
      .select('id, name, icon, type')
      .eq('user_id', user.id)
      .eq('type', type)
      .order('name');
    setCategories((data as any[]) ?? []);
  }, [user]);

  useEffect(() => {
    if (showForm) fetchCategories(txType);
  }, [txType, showForm, fetchCategories]);

  // ══════════════════════════════════════════════════════════════
  // Numpad
  // ══════════════════════════════════════════════════════════════
  const handleKey = (key: string) => {
    setAmount(prev => {
      if (key === '⌫') {
        if (prev.length <= 1) return '0';
        const next = prev.slice(0, -1);
        return next === '' ? '0' : next;
      }
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev === '0' ? '0.' : prev + '.';
      }
      // digit
      if (prev === '0') return key;
      if (prev.length >= 9) return prev;
      const dot = prev.indexOf('.');
      if (dot !== -1 && prev.length - dot >= 3) return prev; // max 2 decimals
      return prev + key;
    });
  };

  // ══════════════════════════════════════════════════════════════
  // Smart memory (suggestions)
  // ══════════════════════════════════════════════════════════════
  const handleNameChange = (val: string) => {
    setTxName(val);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (val.length < 2 || !primaryAccountId) { setSuggestions([]); return; }

    suggestTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('transactions')
        .select('name, category_id, type, categories(icon, name)')
        .eq('account_id', primaryAccountId)
        .ilike('name', `%${val}%`)
        .order('date', { ascending: false })
        .limit(10);

      // Deduplicate by name
      const seen = new Map<string, any>();
      (data ?? []).forEach((tx: any) => {
        if (!seen.has(tx.name)) seen.set(tx.name, tx);
      });
      setSuggestions(Array.from(seen.values()).slice(0, 3));
    }, 300);
  };

  const applySuggestion = (s: Suggestion) => {
    setTxName(s.name);
    if (s.category_id) setCategoryId(s.category_id);
    if (s.type) setTxType(s.type as TxType);
    setSuggestions([]);
  };

  // ══════════════════════════════════════════════════════════════
  // Save
  // ══════════════════════════════════════════════════════════════
  const handleSave = async () => {
    if (!user || !primaryAccountId) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('נא להזין סכום תקין');
      return;
    }

    setSaving(true);
    try {
      const status    = txDate > todayStr() ? 'pending' : 'completed';
      const finalName = txName.trim() || (txType === 'income' ? 'הכנסה' : txType === 'investment' ? 'השקעה' : 'הוצאה');

      // DB TransactionType = 'income' | 'expense' | 'transfer' — no 'investment'
      // Investment is stored as expense; category type distinguishes it on read
      const dbType = txType === 'investment' ? 'expense' : txType;

      const payload: Record<string, any> = {
        user_id:      user.id,
        account_id:   primaryAccountId,
        amount:       numAmount,
        name:         finalName,
        date:         txDate,
        type:         dbType,       // ← mapped, never 'investment'
        status,
        is_recurring: isRecurring,  // ← correct column name (was 'recurring')
      };

      if (categoryId)           payload.category_id      = categoryId;
      if (txType === 'income')  payload.income_subtype   = incomeSubtype;
      if (showInstallments) {
        payload.installments_total  = installmentsTotal;
        payload.installment_number  = installmentNumber;
      }

      console.log('[Save] payload =', JSON.stringify(payload, null, 2));
      console.log('[Save] user.id =', user.id, '| account =', primaryAccountId);

      const { error } = await supabase.from('transactions').insert(payload);
      console.log('[Save] insert result — error:', error);
      if (error) throw error;

      toast.success(t('success.transaction_added'));
      closeForm(true);
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(t('errors.general'));
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // Delete with 5-second undo
  // ══════════════════════════════════════════════════════════════
  const handleDelete = (tx: TxRow) => {
    // Optimistically remove
    setTxList(prev => prev.filter(r => r.id !== tx.id));

    let cancelled = false;

    toast(
      (toastObj) => (
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span>{t('transactions.delete_msg')}</span>
          <button
            style={{
              padding:'4px 10px',
              background:'rgba(255,255,255,0.2)',
              border:'1px solid rgba(255,255,255,0.5)',
              borderRadius:6,
              color:'#fff',
              cursor:'pointer',
              fontFamily:'inherit',
              fontSize:13,
            }}
            onClick={() => {
              cancelled = true;
              toast.dismiss(toastObj.id);
              // Restore
              setTxList(prev => {
                if (prev.find(r => r.id === tx.id)) return prev;
                return [tx, ...prev].sort((a, b) => b.date.localeCompare(a.date));
              });
            }}
          >
            {t('transactions.delete_undo')}
          </button>
        </div>
      ),
      {
        duration: 5000,
        style: { background: 'var(--color-danger)', color: '#fff' },
      }
    );

    setTimeout(() => {
      if (!cancelled) {
        supabase.from('transactions').delete().eq('id', tx.id).then();
      }
    }, 5100);
  };

  // ══════════════════════════════════════════════════════════════
  // Form open / close / reset
  // ══════════════════════════════════════════════════════════════
  const resetForm = () => {
    setAmount('0');
    setTxName('');
    setTxType('expense');
    setCategoryId(null);
    setTxDate(todayStr());
    setIsRecurring(false);
    setShowInstallments(false);
    setInstallmentsTotal(2);
    setInstallmentNumber(1);
    setIncomeSubtype('regular');
    setSuggestions([]);
  };

  const openForm = () => {
    resetForm();
    setShowForm(true);
  };

  const closeForm = (saved = false) => {
    setShowForm(false);
    resetForm();
    if (cameFromDashboard.current) {
      cameFromDashboard.current = false;
      navigate('/', { replace: true });
    } else if (saved && primaryAccountId) {
      fetchList(primaryAccountId);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // Render: Form Overlay
  // ══════════════════════════════════════════════════════════════
  const renderForm = () => (
    <div className="tx-form-overlay">
      {/* Header */}
      <div className="tx-form-header">
        <button className="tx-form-close" onClick={() => closeForm(false)} aria-label="סגור">✕</button>
        <h2 className="tx-form-title">{t('transactions.add')}</h2>
      </div>

      {/* Scrollable body */}
      <div className="tx-form-body">

        {/* Amount display */}
        <div className="tx-amount-section">
          <span className="tx-amount-symbol">₪</span>
          <span className={`tx-amount-value${amount === '0' ? ' tx-amount-value--zero' : ''}`}>
            {amount}
          </span>
        </div>

        {/* Numpad */}
        <div className="tx-numpad">
          {NUMPAD_KEYS.map(k => (
            <button
              key={k}
              className={`tx-numpad-btn${k === '⌫' ? ' tx-numpad-btn--backspace' : k === '.' ? ' tx-numpad-btn--dot' : ''}`}
              onClick={() => handleKey(k)}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Name input + suggestions */}
        <div className="tx-name-wrap">
          <input
            className="tx-name-input"
            type="text"
            placeholder={t('transactions.search_placeholder')}
            value={txName}
            onChange={e => handleNameChange(e.target.value)}
            dir="rtl"
          />
          {suggestions.length > 0 && (
            <div className="tx-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="tx-suggestion-btn"
                  onClick={() => applySuggestion(s)}
                >
                  <span className="tx-suggestion-icon">
                    {s.categories?.icon ?? '🔍'}
                  </span>
                  <span className="tx-suggestion-name">{s.name}</span>
                  {s.categories?.name && (
                    <span className="tx-suggestion-hint">{s.categories.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type selector + Date row — always visible, no scrolling needed */}
        <div className="tx-type-date-row">
          <div className="tx-type-pills">
            {TX_TYPES.map(type => (
              <button
                key={type.id}
                className={`tx-type-btn tx-type-btn--${type.id}${txType === type.id ? ' tx-type-active' : ''}`}
                onClick={() => { setTxType(type.id); setCategoryId(null); }}
              >
                {type.label}
              </button>
            ))}
          </div>
          <input
            type="date"
            className="tx-date-input"
            value={txDate}
            onChange={e => setTxDate(e.target.value)}
          />
        </div>

        {/* Category grid */}
        {categories.length > 0 && (
          <div className="tx-cat-section">
            <span className="tx-cat-label">{t('transactions.category')}</span>
            <div className="tx-cat-grid">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`tx-cat-btn${categoryId === cat.id ? ' tx-cat-btn--selected' : ''}`}
                  onClick={() => setCategoryId(prev => prev === cat.id ? null : cat.id)}
                >
                  <span className="tx-cat-icon">{cat.icon ?? '🏷️'}</span>
                  <span className="tx-cat-name">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Income subtype */}
        {txType === 'income' && (
          <div className="tx-subtype-section">
            <span className="tx-subtype-label">{t('transactions.income_subtype')}</span>
            <select
              className="tx-subtype-select"
              value={incomeSubtype}
              onChange={e => setIncomeSubtype(e.target.value)}
            >
              {INCOME_SUBTYPES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Toggles card (installments + recurring) */}
        <div className="tx-details-card">
          {/* Installments toggle */}
          <div className="tx-detail-row">
            <span className="tx-detail-label">{t('transactions.installments')}</span>
            <button
              className={`tx-toggle${showInstallments ? ' tx-toggle--on' : ''}`}
              onClick={() => setShowInstallments(v => !v)}
              aria-label="toggle installments"
            >
              <span className="tx-toggle-thumb" />
            </button>
          </div>

          {/* Installments sub-fields */}
          {showInstallments && (
            <div className="tx-installments-sub">
              <div className="tx-install-field">
                <label>{t('transactions.installments_total')}</label>
                <input
                  type="number"
                  min={2}
                  max={120}
                  value={installmentsTotal}
                  onChange={e => setInstallmentsTotal(Math.max(2, parseInt(e.target.value) || 2))}
                />
              </div>
              <div className="tx-install-field">
                <label>{t('transactions.installment_number')}</label>
                <input
                  type="number"
                  min={1}
                  max={installmentsTotal}
                  value={installmentNumber}
                  onChange={e => setInstallmentNumber(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
          )}

          {/* Recurring toggle (only for expense/transfer/investment) */}
          {txType !== 'income' && (
            <div className="tx-detail-row">
              <span className="tx-detail-label">{t('transactions.is_recurring')}</span>
              <button
                className={`tx-toggle${isRecurring ? ' tx-toggle--on' : ''}`}
                onClick={() => setIsRecurring(v => !v)}
                aria-label="toggle recurring"
              >
                <span className="tx-toggle-thumb" />
              </button>
            </div>
          )}
        </div>

        {/* Future date note */}
        {isFuture && (
          <div className="tx-future-note">{t('transactions.future_date_note')}</div>
        )}

        {/* Save */}
        <button
          className="tx-save-btn"
          onClick={handleSave}
          disabled={saving || amount === '0' || parseFloat(amount) <= 0}
        >
          {saving ? (
            <><span className="tx-spinner" />{t('buttons.save')}</>
          ) : (
            t('transactions.save')
          )}
        </button>

      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════
  // Render: List Page
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="tx-page">
      {showForm && renderForm()}

      {/* Page header */}
      <header className="tx-page-header">
        <h1 className="tx-page-title">{t('transactions.title')}</h1>
        <button className="tx-page-add-btn" onClick={openForm} aria-label={t('transactions.add')}>+</button>
      </header>

      {/* List */}
      {loadingList ? (
        <div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="tx-skeleton-item">
              <div className="tx-skeleton" style={{ width:42, height:42, borderRadius:'50%', flexShrink:0 }} />
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                <div className="tx-skeleton" style={{ height:14, width:'60%' }} />
                <div className="tx-skeleton" style={{ height:11, width:'35%' }} />
              </div>
              <div className="tx-skeleton" style={{ width:60, height:16 }} />
            </div>
          ))}
        </div>
      ) : txList.length === 0 ? (
        <div className="tx-empty">
          <div className="tx-empty-icon">📋</div>
          <p className="tx-empty-text">{t('transactions.no_transactions')}</p>
          <button className="tx-empty-btn" onClick={openForm}>
            {t('transactions.add_first')}
          </button>
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.label}>
            <div className="tx-month-title">{group.label}</div>
            {group.rows.map(tx => (
              <div key={tx.id} className="tx-item">
                <div className="tx-item-icon">
                  {tx.categories?.icon ?? (
                    tx.type === 'income' ? '💰' :
                    tx.type === 'investment' ? '📈' : '💳'
                  )}
                </div>
                <div className="tx-item-info">
                  <span className="tx-item-name">{tx.name}</span>
                  <div className="tx-item-meta">
                    <span>{fmtDate(tx.date, t)}</span>
                    {tx.categories?.name && <span>· {tx.categories.name}</span>}
                    {tx.status === 'pending' && (
                      <span className="tx-item-badge tx-item-badge--pending">
                        {t('transactions.status_pending')}
                      </span>
                    )}
                    {tx.is_recurring && (
                      <span className="tx-item-badge tx-item-badge--recurring">
                        {t('transactions.recurring')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="tx-item-right">
                  <span className={`tx-item-amount tx-item-amount--${tx.type}`}>
                    {tx.type === 'income' ? '+' : '-'}₪{fmt(tx.amount)}
                  </span>
                  <button
                    className="tx-item-delete"
                    onClick={() => handleDelete(tx)}
                    aria-label="מחק פעולה"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* FAB */}
      <button className="tx-fab" onClick={openForm} aria-label={t('transactions.add')}>+</button>

      {/* Bottom nav */}
      <nav className="tx-bottom-nav">
        <button className="tx-nav-item" onClick={() => navigate('/')}>
          <span className="tx-nav-icon"><HomeIcon /></span>
          <span>{t('nav.home')}</span>
        </button>
        <button className="tx-nav-item tx-nav-item--active" onClick={() => {}}>
          <span className="tx-nav-icon"><TxIcon /></span>
          <span>{t('nav.transactions')}</span>
        </button>
        <button className="tx-nav-item" onClick={() => navigate('/planning')}>
          <span className="tx-nav-icon"><PlanIcon /></span>
          <span>{t('nav.planning')}</span>
        </button>
        <button className="tx-nav-item" onClick={() => navigate('/categories')}>
          <span className="tx-nav-icon"><CatIcon /></span>
          <span>{t('nav.categories')}</span>
        </button>
      </nav>
    </div>
  );
};

export default Transactions;
