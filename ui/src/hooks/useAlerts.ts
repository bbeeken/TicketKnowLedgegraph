import { z } from 'zod';
import useSWR from 'swr';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Alert, AlertFilters } from '@/lib/api/alerts';
import useStore from '@/lib/store';

export const useAlerts = (filters: AlertFilters = {}) => {
  const queryClient = useQueryClient();
  const selectedSiteId = useStore((state) => state.selectedSiteId);

  const { data, error, mutate } = useSWR(
    ['alerts', selectedSiteId, filters],
    () => getAlerts({ ...filters, siteId: selectedSiteId || undefined })
  );

  const createAlert = useMutation({
    mutationFn: (newAlert: Omit<Alert, 'id'>) => 
      fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlert)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to create alert');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      mutate();
    }
  });

  const updateAlert = useMutation({
    mutationFn: ({ id, ...updates }: { id: number } & Partial<Alert>) =>
      fetch(`/api/alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).then(res => {
        if (!res.ok) throw new Error('Failed to update alert');
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      mutate();
    }
  });

  const deleteAlert = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/alerts/${id}`, { method: 'DELETE' }).then(res => {
        if (!res.ok) throw new Error('Failed to delete alert');
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts']);
      mutate();
    }
  });

  return {
    alerts: data,
    error,
    loading: !data && !error,
    mutate,
    createAlert,
    updateAlert,
    deleteAlert
  };
};

export const useAlert = (id: number) => {
  const queryClient = useQueryClient();
  const selectedSiteId = useStore((state) => state.selectedSiteId);

  const { data, error, mutate } = useSWR(
    ['alert', id],
    () => getAlert(id)
  );

  const acknowledge = useMutation({
    mutationFn: () => acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alert', id]);
      queryClient.invalidateQueries(['alerts']);
      mutate();
    }
  });

  const resolve = useMutation({
    mutationFn: (resolution?: string) => resolveAlert(id, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries(['alert', id]);
      queryClient.invalidateQueries(['alerts']);
      mutate();
    }
  });

  return {
    alert: data,
    error,
    loading: !data && !error,
    mutate,
    acknowledge,
    resolve
  };
};
