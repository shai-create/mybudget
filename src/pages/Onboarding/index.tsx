import React from 'react';
import { useTranslation } from 'react-i18next';

const Onboarding: React.FC = () => {
  const { t } = useTranslation();
  return (
    <main style={{ padding: '32px', textAlign: 'center' }}>
      <h1>{t('onboarding.welcome')}</h1>
      <p style={{ color: 'var(--color-text-muted)', marginTop: '8px' }}>
        {t('onboarding.subtitle')}
      </p>
    </main>
  );
};

export default Onboarding;
