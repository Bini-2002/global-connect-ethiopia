import {
  ContractStatus,
  MarketplaceContractRecord,
  MarketplaceRequestRecord,
  NegotiationMessageType,
  RequestStatus,
  TransactionType,
} from '@/app/types/marketplace';

export function formatCurrency(value?: number | null, currency = 'ETB'): string {
  if (value === undefined || value === null) {
    return `${currency} -`;
  }

  return `${currency} ${new Intl.NumberFormat('en-ET', {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return 'Not recorded yet';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return 'Not recorded yet';
  }

  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getRequestHeadline(request: MarketplaceRequestRecord): string {
  return request.vendor_business_name || request.organizer_name || 'Marketplace request';
}

export function getRequestSubheadline(request: MarketplaceRequestRecord): string {
  if (request.messages.length === 0) {
    return 'Awaiting first quote from vendor';
  }

  const lastMessage = request.messages[request.messages.length - 1];
  const action = lastMessage.type === 'QUOTE' ? 'Latest quote' : 'Latest counter';
  return `${action}: ${formatCurrency(lastMessage.amount)}`;
}

export function getContractHeadline(contract: MarketplaceContractRecord): string {
  return contract.vendor_business_name || 'Vendor contract';
}

export function humanizeRequestStatus(status: RequestStatus): string {
  return {
    REQUESTED: 'Requested',
    QUOTED: 'Quoted',
    NEGOTIATING: 'Negotiating',
    ACCEPTED: 'Accepted',
  }[status];
}

export function humanizeContractStatus(status: ContractStatus): string {
  const map: Record<ContractStatus, string> = {
    draft: 'Draft',
    AGREED: 'Pending Signatures',
    FUNDED: 'Funded (Active)',
    COMPLETED: 'Work Completed',
    PAID: 'Paid & Settled',
    CANCELLED: 'Cancelled',
  };
  return map[status] ?? status;
}

export function humanizeNegotiationType(type: NegotiationMessageType): string {
  return {
    QUOTE: 'Quote',
    COUNTER: 'Counteroffer',
  }[type];
}

export function humanizeTransactionType(type: TransactionType): string {
  return {
    DEPOSIT: 'Deposit',
    ESCROW_LOCK: 'Escrow lock',
    RELEASE: 'Release',
    REFUND: 'Refund',
    COMMISSION: 'Commission',
  }[type];
}

export function requestNeedsVendorQuote(request: MarketplaceRequestRecord): boolean {
  return request.status === 'REQUESTED' && request.messages.length === 0;
}

export function requestCanCounter(request: MarketplaceRequestRecord): boolean {
  return request.status === 'QUOTED' || request.status === 'NEGOTIATING';
}

export function canAcceptRequest(request: MarketplaceRequestRecord): boolean {
  return request.status === 'QUOTED' || request.status === 'NEGOTIATING';
}

/** Phase 2: can fund only when active + escrow not yet locked */
export function canFundContract(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'AGREED' && contract.escrow_status === 'NONE' && isContractFullySigned(contract);
}

/** Phase 2: vendor marks work done when active + escrow locked */
export function canMarkContractCompleted(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'FUNDED' && contract.escrow_status === 'LOCKED';
}

/** Phase 2: organizer releases when active + escrow locked */
export function canReleaseContract(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'COMPLETED' && contract.escrow_status === 'LOCKED';
}

/** Phase 2: refund when active + escrow locked */
export function canRefundContract(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'FUNDED' && contract.escrow_status === 'LOCKED';
}

/** Phase 2: contract is fully signed when both parties have signed */
export function isContractFullySigned(contract: MarketplaceContractRecord): boolean {
  return contract.signed_by_organizer && contract.signed_by_vendor;
}
