export interface ScheduleItem {
  id: string;
  day: string;
  time: string;
  title: string;
  description: string;
  location: string;
}

export interface FeaturedSpeaker {
  id: string;
  name: string;
  title: string;
  bio?: string;
  company?: string;
}

export interface Detail {
  id: string;
  title: string;
  content: string;
  order?: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  status: string;
  rating: number;
  contact_email?: string;
  contact_phone?: string;
  contract_value?: number;
}

export interface Task {
  id: string;
  task: string;
  assignee: string;
  status: 'completed' | 'in-progress' | 'pending';
  due: string;
  description?: string;
}

export interface Expense {
  id: string;
  item: string;
  category: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  due_date?: string;
  paid_date?: string;
}

export interface BudgetData {
  total: number;
  spent: number;
  pending: number;
  remaining: number;
}

export interface Event {
  id: string;
  title: string;
  location: string;
  status: string;
  event_type?: string;
  start_date?: string;
  end_date?: string;
  expected_attendees?: number;
  
  about: string;
  featuredSpeakers: FeaturedSpeaker[];
  details: Detail[];
  vendors: Vendor[];
  tasks: Task[];
  budget: BudgetData;
  expenses: Expense[];
  schedule: ScheduleItem[];
  
  created_at?: string;
  updated_at?: string;
}

export type TabType = 'details' | 'vendors' | 'tasks' | 'budget' | 'publish' | 'schedule';
