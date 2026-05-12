import React from 'react';
import { useTranslation } from 'react-i18next';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();

  return (
    <main style={{ padding: '16px' }}>
      <h1>{t('screens.dashboard')}</h1>
    </main>
  );
};

export default Dashboard;
