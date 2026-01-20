import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isOnline } from "@/lib/pwa";
import { useOnlineStatus } from "./use-online-status";
import {
  getCachedOrders,
  getCachedCommerciaux,
  getCachedClients,
  getCachedFournisseurs,
  getCachedThemes,
  getCachedDataCommerciaux,
  getCachedDataClients,
  getCachedDataSuppliers,
  getCachedDataThemes,
  cacheOrders,
  cacheDataCommerciaux,
  cacheDataClients,
  cacheDataSuppliers,
  cacheDataThemes,
} from "@/lib/localDataCache";
import type { OrderDb, Commercial, Client, Fournisseur, Theme } from "@shared/schema";

interface UseOfflineDataOptions {
  enabled?: boolean;
}

export function useOfflineOrders(options: UseOfflineDataOptions = {}) {
  const online = useOnlineStatus();
  const [cachedData, setCachedData] = useState<OrderDb[] | null>(null);
  const { enabled = true } = options;

  useEffect(() => {
    getCachedOrders().then(setCachedData);
  }, []);

  const query = useQuery<{ data: OrderDb[] }>({
    queryKey: ["/api/orders"],
    enabled: enabled && online,
  });

  useEffect(() => {
    if (query.data?.data) {
      cacheOrders(query.data.data);
      setCachedData(query.data.data);
    }
  }, [query.data]);

  return {
    data: online && query.data?.data ? query.data.data : cachedData,
    isLoading: online ? query.isLoading : !cachedData,
    isOffline: !online,
    fromCache: !online || !query.data,
    refetch: query.refetch,
  };
}

export function useOfflineDataCommerciaux(options: UseOfflineDataOptions = {}) {
  const online = useOnlineStatus();
  const [cachedData, setCachedData] = useState<string[] | null>(null);
  const { enabled = true } = options;

  useEffect(() => {
    getCachedDataCommerciaux().then(setCachedData);
  }, []);

  const query = useQuery<string[]>({
    queryKey: ["/api/data/commerciaux"],
    enabled: enabled && online,
  });

  useEffect(() => {
    if (query.data) {
      cacheDataCommerciaux(query.data);
      setCachedData(query.data);
    }
  }, [query.data]);

  return {
    data: online && query.data ? query.data : cachedData || [],
    isLoading: online ? query.isLoading : !cachedData,
    isOffline: !online,
    fromCache: !online || !query.data,
  };
}

interface ClientData {
  id?: string | number;
  code: string;
  nom: string;
  adresse1?: string;
  adresse2?: string;
  codePostal?: string;
  ville?: string;
  pays?: string;
  interloc?: string;
  tel?: string;
  portable?: string;
  fax?: string;
  mail?: string;
  displayName?: string;
  isFromDb?: boolean;
}

export function useOfflineDataClients(options: UseOfflineDataOptions = {}) {
  const online = useOnlineStatus();
  const [cachedData, setCachedData] = useState<ClientData[] | null>(null);
  const { enabled = true } = options;

  useEffect(() => {
    getCachedDataClients().then((data) => {
      if (data) {
        const enriched = data.map(c => ({
          ...c,
          id: c.code,
          displayName: `${c.code} - ${c.nom}`,
        }));
        setCachedData(enriched as ClientData[]);
      }
    });
  }, []);

  const query = useQuery<Array<{ code: string; nom: string }>>({
    queryKey: ["/api/data/clients"],
    enabled: enabled && online,
  });

  useEffect(() => {
    if (query.data) {
      cacheDataClients(query.data);
      const enriched = query.data.map(c => ({
        ...c,
        id: c.code,
        displayName: `${c.code} - ${c.nom}`,
      }));
      setCachedData(enriched as ClientData[]);
    }
  }, [query.data]);

  return {
    data: online && query.data ? query.data.map(c => ({ ...c, id: c.code, displayName: `${c.code} - ${c.nom}` })) as ClientData[] : cachedData || [],
    isLoading: online ? query.isLoading : !cachedData,
    isOffline: !online,
    fromCache: !online || !query.data,
  };
}

interface FournisseurData {
  id: number;
  nom: string;
  nomCourt: string;
}

export function useOfflineDataSuppliers(options: UseOfflineDataOptions = {}) {
  const online = useOnlineStatus();
  const [cachedData, setCachedData] = useState<FournisseurData[] | null>(null);
  const { enabled = true } = options;

  useEffect(() => {
    getCachedDataSuppliers().then(setCachedData);
  }, []);

  const query = useQuery<FournisseurData[]>({
    queryKey: ["/api/data/fournisseurs"],
    enabled: enabled && online,
  });

  useEffect(() => {
    if (query.data) {
      cacheDataSuppliers(query.data);
      setCachedData(query.data);
    }
  }, [query.data]);

  return {
    data: online && query.data ? query.data : cachedData || [],
    isLoading: online ? query.isLoading : !cachedData,
    isOffline: !online,
    fromCache: !online || !query.data,
  };
}

export function useOfflineDataThemes(options: UseOfflineDataOptions = {}) {
  const online = useOnlineStatus();
  const [cachedData, setCachedData] = useState<Array<{ theme: string; fournisseur: string; categorie: string }> | null>(null);
  const { enabled = true } = options;

  useEffect(() => {
    getCachedDataThemes().then(setCachedData);
  }, []);

  const query = useQuery<Array<{ theme: string; fournisseur: string; categorie: string }>>({
    queryKey: ["/api/data/themes"],
    enabled: enabled && online,
  });

  useEffect(() => {
    if (query.data) {
      cacheDataThemes(query.data);
      setCachedData(query.data);
    }
  }, [query.data]);

  return {
    data: online && query.data ? query.data : cachedData || [],
    isLoading: online ? query.isLoading : !cachedData,
    isOffline: !online,
    fromCache: !online || !query.data,
  };
}

export function useDataSyncStatus() {
  const [status, setStatus] = useState({
    syncing: false,
    lastSync: null as string | null,
    error: null as string | null,
  });

  useEffect(() => {
    import("@/lib/offlineDataSync").then(({ addDataSyncListener }) => {
      const unsubscribe = addDataSyncListener(setStatus);
      return () => unsubscribe();
    });
  }, []);

  return status;
}
