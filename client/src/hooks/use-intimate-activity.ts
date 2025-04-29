import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { SexRecord } from '@/hooks/use-symptoms';

interface UseIntimateActivityProps {
  userId: number;
  date: Date;
}

export function useIntimateActivity({ userId, date }: UseIntimateActivityProps) {
  const queryClient = useQueryClient();
  const formattedDate = format(date, 'yyyy-MM-dd');

  // Query for sex record for this date
  const { data: sexRecord, refetch } = useQuery<SexRecord | undefined>({
    queryKey: ['/api/sex-records/date', userId, formattedDate],
    queryFn: async () => {
      const res = await fetch(`/api/sex-records/date?userId=${userId}&date=${formattedDate}`);
      if (res.status === 404) return null; // No record for this date
      if (res.ok) return await res.json();
      return null;
    },
    enabled: !!userId && !!date,
  });

  // Mutation to create a sex record
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/sex-records', {
        userId,
        date: formattedDate,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sex-records'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sex-records/date', userId, formattedDate] });
      refetch();
    },
  });

  // Mutation to delete a sex record
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/sex-records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sex-records'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sex-records/date', userId, formattedDate] });
      refetch();
    },
  });

  const logIntimateActivity = useCallback(() => {
    if (!sexRecord) {
      createMutation.mutate();
    } else {
      deleteMutation.mutate(sexRecord.id);
    }
  }, [sexRecord, createMutation, deleteMutation]);

  const isLoading = createMutation.status === 'pending' || deleteMutation.status === 'pending';

  return {
    sexRecord,
    isLogged: !!sexRecord,
    logIntimateActivity,
    isLoading,
  };
}
