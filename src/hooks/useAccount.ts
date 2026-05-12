import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Account } from '../types';

export function useAccount(userId: string | undefined) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [primaryAccount, setPrimaryAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('is_primary', { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setAccounts(data ?? []);
        setPrimaryAccount(data?.find((a) => a.is_primary) ?? data?.[0] ?? null);
      }
      setLoading(false);
    };

    fetch();
  }, [userId]);

  return { accounts, primaryAccount, loading, error };
}
