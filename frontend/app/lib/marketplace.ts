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
  return {
    AGREED: 'Agreed',
    FUNDED: 'Funded',
    COMPLETED: 'Completed',
    PAID: 'Paid',
  }[status];
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

export function canFundContract(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'AGREED';
}

export function canMarkContractCompleted(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'FUNDED';
}

export function canReleaseContract(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'COMPLETED';
}

export function canRefundContract(contract: MarketplaceContractRecord): boolean {
  return contract.status === 'FUNDED';
}
