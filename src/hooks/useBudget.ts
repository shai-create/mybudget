import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Budget } from '../types';

export function useBudget(accountId: string | undefined, month: number, year: number) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accountId) return;

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('account_id', accountId)
        .eq('month', month)
        .eq('year', year);

      if (error) {
        setError(error.message);
      } else {
        setBudgets(data ?? []);
      }
      setLoading(false);
    };

    fetch();
  }, [accountId, month, year]);

  return { budgets, loading, error };
}
