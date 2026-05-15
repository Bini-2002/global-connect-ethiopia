'use client';

import { useEffect, useState } from 'react';

import marketplaceService from '@/app/services/marketplaceService';
import {
  MarketplaceContractRecord,
  MarketplaceRequestRecord,
  MarketplaceVendorRecord,
  WalletRecord,
  WalletTransactionRecord,
  WithdrawalRecord,
} from '@/app/types/marketplace';

interface ResourceState<T> {
  data: T;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

function createErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useMarketplaceVendors(): ResourceState<MarketplaceVendorRecord[]> {
  const [data, setData] = useState<MarketplaceVendorRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketplaceService.listVendors();
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load vendors.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useMarketplaceVendor(vendorId: string | null): ResourceState<MarketplaceVendorRecord | null> {
  const [data, setData] = useState<MarketplaceVendorRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!vendorId) {
      setData(null);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketplaceService.getVendorById(vendorId);
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load vendor details.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [vendorId, reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useMarketplaceRequests(): ResourceState<MarketplaceRequestRecord[]> {
  const [data, setData] = useState<MarketplaceRequestRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketplaceService.listRequests();
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load requests.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useMarketplaceRequest(requestId: string | null): ResourceState<MarketplaceRequestRecord | null> {
  const [data, setData] = useState<MarketplaceRequestRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!requestId) {
      setData(null);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketplaceService.getRequestById(requestId);
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load request details.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [requestId, reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useMarketplaceContracts(): ResourceState<MarketplaceContractRecord[]> {
  const [data, setData] = useState<MarketplaceContractRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketplaceService.listContracts();
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load contracts.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useMarketplaceContract(contractId: string | null): ResourceState<MarketplaceContractRecord | null> {
  const [data, setData] = useState<MarketplaceContractRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!contractId) {
      setData(null);
      setLoading(false);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketplaceService.getContractById(contractId);
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load contract details.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [contractId, reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useWallet(): ResourceState<WalletRecord | null> {
  const [data, setData] = useState<WalletRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketplaceService.getWallet();
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load wallet.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useWalletTransactions(): ResourceState<WalletTransactionRecord[]> {
  const [data, setData] = useState<WalletTransactionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketplaceService.listWalletTransactions();
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load wallet transactions.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}

export function useWalletWithdrawals(): ResourceState<WithdrawalRecord[]> {
  const [data, setData] = useState<WithdrawalRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await marketplaceService.listWithdrawals();
        if (active) {
          setData(response);
        }
      } catch (nextError) {
        if (active) {
          setError(createErrorMessage(nextError, 'Unable to load wallet withdrawals.'));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return { data, error, loading, refresh: () => setReloadKey((value) => value + 1) };
}
