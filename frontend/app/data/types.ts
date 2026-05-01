// Compatibility layer - re-export types from correct locations
import { EventBudgetItem } from '../types/event';

export type { EventTaskRecord as Task } from '../types/event';
export type { EventScheduleItemRecord as ScheduleItem } from '../types/event';
export type { MarketplaceVendorRecord as Vendor } from '../types/marketplace';
export type { EventBudgetItem as Expense } from '../types/event';

export interface BudgetData {
  items: EventBudgetItem[];
  totalEstimated: number;
  totalActual: number;
}

export type TabType = 'details' | 'schedule' | 'vendors' | 'tasks' | 'budget' | 'publish';
