import React from 'react';
import { useTranslation } from 'react-i18next';

const Planning: React.FC = () => {
  const { t } = useTranslation();
  return <main style={{ padding: '16px' }}><h1>{t('screens.planning')}</h1></main>;
};

export default Planning;
