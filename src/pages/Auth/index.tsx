import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import './auth.css';

type Mode = 'login' | 'signup';

const GoogleIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AuthPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const getSupabaseError = (message: string): string => {
    if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
      return t('auth.errors.invalid_credentials');
    }
    if (message.includes('User already registered') || message.includes('already been registered')) {
      return t('auth.errors.email_taken');
    }
    if (message.includes('Password should be at least')) {
      return t('auth.errors.password_too_short');
    }
    if (message.includes('identity is already linked') || message.includes('already linked')) {
      return t('auth.errors.email_exists_google');
    }
    return t('auth.errors.general');
  };

  const checkOnboardingAndNavigate = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('nickname')
      .eq('id', userId)
      .single();

    if (data?.nickname) {
      navigate('/', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error(t('auth.errors.email_required'));
      return;
    }
    if (!password) {
      toast.error(t('auth.errors.password_required'));
      return;
    }
    if (mode === 'signup') {
      if (password.length < 6) {
        toast.error(t('auth.errors.password_too_short'));
        return;
      }
      if (password !== confirmPassword) {
        toast.error(t('auth.errors.passwords_no_match'));
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          navigate('/onboarding', { replace: true });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await checkOnboardingAndNavigate(data.user.id);
        }
      }
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        toast.error(t('auth.errors.email_exists_google'));
      } else {
        toast.error(getSupabaseError(msg));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) throw error;
    } catch {
      toast.error(t('auth.errors.google_failed'));
      setGoogleLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(m => (m === 'login' ? 'signup' : 'login'));
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">₪</div>
          <span className="auth-logo-text">MyBudget</span>
        </div>

        {/* Title */}
        <h1 className="auth-title">
          {mode === 'login' ? t('auth.login_title') : t('auth.signup_title')}
        </h1>
        <p className="auth-subtitle">
          {mode === 'login' ? t('auth.login_subtitle') : t('auth.signup_subtitle')}
        </p>

        {/* Google OAuth */}
        <div className="auth-oauth">
          <button
            type="button"
            className="auth-oauth-btn"
            onClick={handleGoogleAuth}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <span className="auth-spinner" />
            ) : (
              <GoogleIcon />
            )}
            <span>{t('auth.google_btn')}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span>{t('auth.divider')}</span>
        </div>

        {/* Email Form */}
        <form className="auth-form" onSubmit={handleEmailAuth} noValidate>
          <div className="auth-field">
            <label htmlFor="auth-email">{t('auth.email')}</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.email_placeholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              dir="ltr"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">{t('auth.password')}</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={t('auth.password_placeholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              dir="ltr"
            />
          </div>

          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-confirm-password">{t('auth.confirm_password')}</label>
              <input
                id="auth-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder={t('auth.confirm_password_placeholder')}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                disabled={loading}
                dir="ltr"
              />
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || googleLoading}
          >
            {loading ? (
              <><span className="auth-spinner auth-spinner--white" />{t('auth.loading')}</>
            ) : (
              mode === 'login' ? t('auth.login_btn') : t('auth.signup_btn')
            )}
          </button>
        </form>

        {/* Switch mode */}
        <button type="button" className="auth-switch" onClick={toggleMode}>
          {mode === 'login' ? t('auth.switch_to_signup') : t('auth.switch_to_login')}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
