import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import './onboarding.css';

type Gender = 'male' | 'female' | 'plural';

const TOTAL_STEPS = 6;

const GOALS = [
  { id: 'travel',    emoji: '✈️', key: 'goal_travel' },
  { id: 'wedding',   emoji: '💍', key: 'goal_wedding' },
  { id: 'debt',      emoji: '📊', key: 'goal_debt' },
  { id: 'savings',   emoji: '🌱', key: 'goal_savings' },
  { id: 'apartment', emoji: '🏠', key: 'goal_apartment' },
  { id: 'order',     emoji: '⚡', key: 'goal_order' },
];

const Onboarding: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]                   = useState(1);
  const [nickname, setNickname]           = useState('');
  const [gender, setGender]               = useState<Gender | null>(null);
  const [goal, setGoal]                   = useState('');
  const [customGoal, setCustomGoal]       = useState('');
  const [showCustomGoal, setShowCustomGoal] = useState(false);
  const [balance, setBalance]             = useState('');
  const [notifications, setNotifications] = useState({
    dailyReminder:   true,
    dailyTime:       '20:00',
    monthlyPlanning: true,
    overBudget:      true,
  });
  const [saving, setSaving]   = useState(false);
  const [showPWA, setShowPWA] = useState(false);

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));

  const getFinishTitle = () => {
    if (gender === 'female') return t('onboarding.finish_title_female');
    if (gender === 'plural')  return t('onboarding.finish_title_plural');
    return t('onboarding.finish_title_male');
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const finalGoal  = showCustomGoal ? customGoal : goal;
      const balanceNum = parseFloat(balance) || 0;

      // 1 — update users row
      await supabase
        .from('users')
        .update({ nickname: nickname || null, gender, goal: finalGoal || null })
        .eq('id', user.id);

      // 2 — create primary account
      await supabase.from('accounts').insert({
        user_id:    user.id,
        name:       'חשבון ראשי',
        type:       'personal',
        balance:    balanceNum,
        is_primary: true,
        currency:   'ILS',
      });

      // 3 — save notification preferences
      await supabase.from('notification_settings').upsert({
        user_id:              user.id,
        daily_reminder:       notifications.dailyReminder,
        daily_reminder_time:  notifications.dailyTime,
        monthly_planning:     notifications.monthlyPlanning,
        over_budget_alert:    notifications.overBudget,
      }, { onConflict: 'user_id' });

      // 4 — PWA prompt or navigate
      const isStandalone =
        (window.navigator as any).standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;

      if (isStandalone) {
        navigate('/', { replace: true });
      } else {
        setShowPWA(true);
      }
    } catch {
      toast.error(t('errors.general'));
    } finally {
      setSaving(false);
    }
  };

  const getPlatform = (): 'ios' | 'android' | 'other' => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua))           return 'android';
    return 'other';
  };

  /* ─── Progress Bar ─────────────────────────────────── */
  const renderProgressBar = () => (
    <div className="ob-progress-container">
      <div className="ob-progress-track">
        <div className="ob-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <span className="ob-progress-label">
        {t('onboarding.step_of', { current: step, total: TOTAL_STEPS })}
      </span>
    </div>
  );

  /* ─── Step 1 — Welcome ──────────────────────────────── */
  const renderStep1 = () => (
    <div className="ob-step ob-step--welcome">
      <div className="ob-welcome-icon">💰</div>
      <h1 className="ob-welcome-title">
        {t('onboarding.welcome_title')}
        <span className="ob-welcome-title-accent">{t('onboarding.welcome_title2')}</span>
      </h1>
      <p className="ob-welcome-subtitle">{t('onboarding.welcome_subtitle')}</p>
      <button className="ob-btn ob-btn--primary ob-btn--large" onClick={next}>
        {t('onboarding.start_male')}
      </button>
    </div>
  );

  /* ─── Step 2 — Nickname & Gender ────────────────────── */
  const renderStep2 = () => (
    <div className="ob-step">
      <h2 className="ob-step-title">{t('onboarding.nickname_question')}</h2>
      <input
        className="ob-text-input"
        type="text"
        placeholder={t('onboarding.nickname_placeholder')}
        value={nickname}
        onChange={e => setNickname(e.target.value)}
        autoFocus
        dir="rtl"
      />

      <p className="ob-step-subtitle">{t('onboarding.gender_question')}</p>
      <div className="ob-gender-btns">
        {(['male', 'female', 'plural'] as Gender[]).map(g => (
          <button
            key={g}
            className={`ob-gender-btn${gender === g ? ' ob-gender-btn--active' : ''}`}
            onClick={() => setGender(g)}
          >
            {t(`onboarding.gender_${g}`)}
          </button>
        ))}
      </div>

      <button
        className="ob-btn ob-btn--primary"
        onClick={next}
        disabled={!nickname.trim() || !gender}
      >
        {t('onboarding.next')}
      </button>
    </div>
  );

  /* ─── Step 3 — Goal ─────────────────────────────────── */
  const renderStep3 = () => (
    <div className="ob-step">
      <h2 className="ob-step-title">{t('onboarding.goal_question')}</h2>
      <div className="ob-goal-grid">
        {GOALS.map(g => (
          <button
            key={g.id}
            className={`ob-goal-card${goal === g.id && !showCustomGoal ? ' ob-goal-card--selected' : ''}`}
            onClick={() => { setGoal(g.id); setShowCustomGoal(false); }}
          >
            <span className="ob-goal-emoji">{g.emoji}</span>
            <span className="ob-goal-label">{t(`onboarding.${g.key}`)}</span>
          </button>
        ))}
      </div>

      <button
        className={`ob-other-btn${showCustomGoal ? ' ob-other-btn--active' : ''}`}
        onClick={() => { setShowCustomGoal(true); setGoal(''); }}
      >
        {t('onboarding.goal_other')}
      </button>

      {showCustomGoal && (
        <input
          className="ob-text-input"
          type="text"
          placeholder={t('onboarding.goal_other_placeholder')}
          value={customGoal}
          onChange={e => setCustomGoal(e.target.value)}
          autoFocus
          dir="rtl"
        />
      )}

      <button
        className="ob-btn ob-btn--primary"
        onClick={next}
        disabled={!goal && !(showCustomGoal && customGoal.trim())}
      >
        {t('onboarding.next')}
      </button>
    </div>
  );

  /* ─── Step 4 — Balance ──────────────────────────────── */
  const renderStep4 = () => (
    <div className="ob-step">
      <h2 className="ob-step-title">{t('onboarding.balance_title')}</h2>
      <p className="ob-step-subtitle ob-step-subtitle--note">
        {t('onboarding.balance_subtitle')}
      </p>

      <div className="ob-balance-wrap">
        <span className="ob-balance-symbol">₪</span>
        <input
          className="ob-balance-input"
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={balance}
          onChange={e => setBalance(e.target.value)}
          autoFocus
        />
      </div>

      <button
        className="ob-btn ob-btn--primary"
        onClick={next}
        disabled={!balance}
      >
        {t('onboarding.next')}
      </button>

      <button
        className="ob-skip-btn"
        onClick={() => { setBalance('0'); next(); }}
      >
        {t('onboarding.balance_skip')}
      </button>
    </div>
  );

  /* ─── Step 5 — Notifications ────────────────────────── */
  const renderStep5 = () => (
    <div className="ob-step">
      <h2 className="ob-step-title">{t('onboarding.notifications_title')}</h2>

      <div className="ob-notif-list">
        {/* Daily reminder */}
        <div className="ob-notif-row">
          <div className="ob-notif-info">
            <span className="ob-notif-name">{t('onboarding.notif_daily')}</span>
            {notifications.dailyReminder && (
              <div className="ob-notif-time-wrap">
                <span className="ob-notif-detail">{t('onboarding.notif_daily_time')}</span>
                <input
                  type="time"
                  className="ob-time-input"
                  value={notifications.dailyTime}
                  onChange={e =>
                    setNotifications(n => ({ ...n, dailyTime: e.target.value }))
                  }
                />
              </div>
            )}
          </div>
          <button
            className={`ob-toggle${notifications.dailyReminder ? ' ob-toggle--on' : ''}`}
            onClick={() =>
              setNotifications(n => ({ ...n, dailyReminder: !n.dailyReminder }))
            }
            aria-label="toggle daily reminder"
          >
            <span className="ob-toggle-thumb" />
          </button>
        </div>

        {/* Monthly planning */}
        <div className="ob-notif-row">
          <div className="ob-notif-info">
            <span className="ob-notif-name">{t('onboarding.notif_monthly')}</span>
            <span className="ob-notif-detail">{t('onboarding.notif_monthly_detail')}</span>
          </div>
          <button
            className={`ob-toggle${notifications.monthlyPlanning ? ' ob-toggle--on' : ''}`}
            onClick={() =>
              setNotifications(n => ({ ...n, monthlyPlanning: !n.monthlyPlanning }))
            }
            aria-label="toggle monthly planning"
          >
            <span className="ob-toggle-thumb" />
          </button>
        </div>

        {/* Over budget */}
        <div className="ob-notif-row">
          <div className="ob-notif-info">
            <span className="ob-notif-name">{t('onboarding.notif_budget')}</span>
          </div>
          <button
            className={`ob-toggle${notifications.overBudget ? ' ob-toggle--on' : ''}`}
            onClick={() =>
              setNotifications(n => ({ ...n, overBudget: !n.overBudget }))
            }
            aria-label="toggle over budget alert"
          >
            <span className="ob-toggle-thumb" />
          </button>
        </div>
      </div>

      <button className="ob-btn ob-btn--primary" onClick={next}>
        {t('onboarding.next')}
      </button>
    </div>
  );

  /* ─── Step 6 — Finish ───────────────────────────────── */
  const renderStep6 = () => {
    const balanceNum = parseFloat(balance) || 0;
    const formatted  = balanceNum.toLocaleString('he-IL');

    return (
      <div className="ob-step ob-step--finish">
        <div className="ob-finish-icon">🎉</div>
        <h2 className="ob-step-title">{getFinishTitle()}</h2>
        {nickname && (
          <p className="ob-finish-greeting">
            היי {nickname}!
          </p>
        )}

        <div className="ob-balance-preview">
          <span>{t('onboarding.balance_preview')}</span>
          <strong>₪{formatted}</strong>
        </div>

        <button
          className="ob-btn ob-btn--primary ob-btn--large"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><span className="ob-spinner" />{t('onboarding.saving')}</>
          ) : (
            t('onboarding.to_dashboard')
          )}
        </button>

        <div className="ob-upgrade-card">
          <div className="ob-upgrade-header">
            <span className="ob-upgrade-title">{t('onboarding.upgrade_title')}</span>
            <span className="ob-upgrade-subtitle">{t('onboarding.upgrade_subtitle')}</span>
          </div>
          <div className="ob-upgrade-tiers">
            <div className="ob-upgrade-tier">
              <span className="ob-tier-badge ob-tier-badge--free">
                {t('profile.plan_free')}
              </span>
              <span>{t('onboarding.upgrade_free')}</span>
            </div>
            <div className="ob-upgrade-tier ob-upgrade-tier--premium">
              <span className="ob-tier-badge ob-tier-badge--premium">
                {t('profile.plan_premium')}
              </span>
              <span>{t('onboarding.upgrade_premium')}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─── PWA Prompt ────────────────────────────────────── */
  const renderPWA = () => {
    const platform = getPlatform();
    const isIOS    = platform === 'ios';

    return (
      <div className="ob-pwa-overlay">
        <div className="ob-pwa-card">
          <div className="ob-pwa-icon">📲</div>
          <h3 className="ob-pwa-title">
            {isIOS ? t('onboarding.pwa_ios_title') : t('onboarding.pwa_android_title')}
          </h3>

          <div className="ob-pwa-steps">
            {isIOS ? (
              <>
                <div className="ob-pwa-step">
                  <span className="ob-pwa-step-num">1</span>
                  <span>לחץ על אייקון השיתוף</span>
                  <span className="ob-pwa-step-icon">⬆️</span>
                </div>
                <div className="ob-pwa-step">
                  <span className="ob-pwa-step-num">2</span>
                  <span>בחר "הוסף למסך הבית"</span>
                </div>
              </>
            ) : (
              <>
                <div className="ob-pwa-step">
                  <span className="ob-pwa-step-num">1</span>
                  <span>לחץ על שלוש הנקודות</span>
                  <span className="ob-pwa-step-icon">⋮</span>
                </div>
                <div className="ob-pwa-step">
                  <span className="ob-pwa-step-num">2</span>
                  <span>בחר "התקן אפליקציה"</span>
                </div>
              </>
            )}
          </div>

          <button
            className="ob-btn ob-btn--primary"
            onClick={() => navigate('/', { replace: true })}
          >
            {t('onboarding.pwa_understood')}
          </button>
          <button
            className="ob-skip-btn"
            onClick={() => navigate('/', { replace: true })}
          >
            {t('onboarding.pwa_later')}
          </button>
        </div>
      </div>
    );
  };

  /* ─── Render ────────────────────────────────────────── */
  if (showPWA) return renderPWA();

  return (
    <div className="ob-page">
      {renderProgressBar()}
      <div className="ob-container">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderStep6()}
      </div>
    </div>
  );
};

export default Onboarding;
