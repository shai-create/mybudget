// =====================================================================
// TypeScript Types — Budget App
// Mirrors the Supabase database schema exactly
// =====================================================================

// ---------- Enums ----------

export type GenderType = 'male' | 'female' | 'neutral';
export type ExperienceLevelType = 'beginner' | 'intermediate' | 'advanced';
export type DisplayStyleType = 'numbers' | 'visual';
export type AccountType = 'personal' | 'business' | 'joint';
export type MemberRole = 'owner' | 'member';
export type CategoryType = 'income' | 'expense' | 'investment';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type IncomeSubtype = 'regular' | 'bonus' | 'gift' | 'refund' | 'one_time';
export type TransactionStatus = 'completed' | 'pending';
export type RecurringType = 'income' | 'expense';
export type SubscriptionPlan = 'free' | 'lite' | 'premium';
export type SubscriptionStatus = 'active' | 'trial' | 'cancelled' | 'expired';
export type DiscountType = 'percent' | 'fixed' | 'trial_days';

// ---------- Table 1: User ----------

export interface User {
  id: string;
  email: string;
  nickname: string | null;
  gender: GenderType | null;
  goal: string | null;
  family_type: string | null;
  experience_level: ExperienceLevelType | null;
  month_start_day: number;
  salary_day: number | null;
  display_style: DisplayStyleType;
  currency: string;
  locale: string;
  timezone: string;
  created_at: string;
}

// ---------- Table 2: Account ----------

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType | null;
  balance: number;
  currency: string;
  is_primary: boolean;
  calibrated_at: string | null;
  created_at: string;
}

// ---------- Table 3: AccountMember ----------

export interface AccountMember {
  account_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
}

// ---------- Table 4: Category ----------

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType | null;
  parent_id: string | null;
  level: 1 | 2 | 3;
  icon: string | null;
  color: string | null;
  is_default: boolean;
  sort_order: number;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
}

// ---------- Table 5: Budget ----------

export interface Budget {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  month: number;
  year: number;
  planned_amount: number;
  copied_from_previous: boolean;
  created_at: string;
}

// ---------- Table 6: Transaction ----------

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  entered_by: string | null;
  amount: number;
  name: string;
  note: string | null;
  date: string;
  type: TransactionType;
  income_subtype: IncomeSubtype | null;
  is_recurring: boolean;
  installments_total: number | null;
  installment_number: number | null;
  recurring_item_id: string | null;
  split_of: string | null;
  /** completed = executed; pending = future date, affects balance only on scheduled date */
  status: TransactionStatus;
  created_at: string;
}

// ---------- Table 7: RecurringItem ----------

export interface RecurringItem {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  name: string;
  amount: number;
  day_of_month: number;
  type: RecurringType;
  is_active: boolean;
  end_date: string | null;
  alert_before_days: number;
  created_at: string;
}

// ---------- Table 8: Goal ----------

export interface Goal {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  /** Free plan limited to 1 goal with is_primary=true */
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

// ---------- Table 9: MonthlySummary ----------

export interface MonthlySummary {
  id: string;
  user_id: string;
  account_id: string;
  month: number;
  year: number;
  stars: 1 | 2 | 3 | null;
  note: string | null;
  balance_end: number | null;
  total_income: number | null;
  total_expenses: number | null;
  /** Auto-updated by DB trigger on transactions/budgets changes */
  forecast_amount: number | null;
  forecast_updated_at: string | null;
  created_at: string;
}

// ---------- Table 10: Gamification ----------

export interface Gamification {
  id: string;
  user_id: string;
  /** Never resets */
  streak_days: number;
  streak_max: number;
  last_entry_date: string | null;
  badges: Badge[];
  total_months: number;
  challenges_completed: number;
  current_year: number;
  /** Format: { "2026": { "1": 3, "2": 2 } } */
  yearly_stars: Record<string, Record<string, number>>;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  earned_at: string;
  icon: string;
}

// ---------- Table 11: NotificationSettings ----------

export interface NotificationSettings {
  id: string;
  user_id: string;
  daily_reminder: boolean;
  daily_reminder_time: string;
  planning_reminder: boolean;
  planning_reminder_day: number;
  overage_alert: boolean;
  overage_threshold: number;
  fixed_expense_alert: boolean;
  fixed_expense_days: number;
  weekly_summary: boolean;
  weekly_summary_day: number;
  low_balance_alert: boolean;
  low_balance_amount: number;
  retainer_alert: boolean;
  retainer_days_before: number;
  push_token: string | null;
  /** true = user denied push; app switches to in-app notifications */
  push_denied: boolean;
  updated_at: string;
}

// ---------- Table 12: Subscription ----------

export interface Subscription {
  id: string;
  user_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  /** Trial = 7 days full premium; after 7 days drops to free */
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Table 13: Coupon ----------

export interface Coupon {
  id: string;
  code: string;
  discount_type: DiscountType | null;
  value: number | null;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
}

// ---------- Table 14: Referral ----------

export interface Referral {
  id: string;
  referrer_id: string | null;
  referred_id: string | null;
  reward_given_at: string | null;
  created_at: string;
}

// ---------- UI / App helpers ----------

export interface PendingTransaction {
  id?: number;
  localId: string;
  data: Partial<Transaction>;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  createdAt: string;
  syncedAt: string | null;
}

export interface ForecastInput {
  currentBalance: number;
  plannedIncome: number;
  plannedExpenses: number;
  actualIncomeToDate: number;
  actualExpensesToDate: number;
  pendingTransactionsTotal: number;
}
