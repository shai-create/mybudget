import Dexie, { Table } from 'dexie';
import { PendingTransaction } from '../types';

export class MyBudgetDB extends Dexie {
  pendingTransactions!: Table<PendingTransaction, number>;

  constructor() {
    super('MyBudgetDB');

    this.version(1).stores({
      // id is auto-increment primary key
      // localId for deduplication, createdAt for age-based warning
      pendingTransactions: '++id, localId, table, operation, createdAt, syncedAt',
    });
  }
}

export const db = new MyBudgetDB();
