// ─── Notification types ──────────────────────────────────────────────────────

export interface NotificationRecord {
  id: string;
  recipient_id: string;
  type: string;
  message: string;
  read_status: boolean;
  related_entity?: {
    type?: string;
    id?: string;
  } | null;
  created_at: string | null;
}

// ─── Analytics types ─────────────────────────────────────────────────────────

export interface RevenueByMethod {
  total: number;
  count: number;
}

export interface RevenueStream {
  total: number;
  by_payment_method: Record<string, RevenueByMethod>;
}

export interface EventRevenueAnalytics {
  event_id: string;
  event_title: string | null;
  currency: string;
  payment_method_filter: string | null;
  ticket_revenue: RevenueStream;
  vendor_fee_revenue: RevenueStream;
  sponsorship_revenue: RevenueStream;
  total_gross_revenue: number;
  generated_at: string;
}

export interface PlatformRevenueAnalytics {
  currency: string;
  payment_method_filter: string | null;
  date_range: { from: string | null; to: string | null };
  ticket_revenue: RevenueStream;
  vendor_fee_revenue: RevenueStream;
  payout_total: number;
  commission_income: number;
  total_gross_revenue: number;
  total_events: number;
  generated_at: string;
}
