import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { arbitrageApi, ArbitrageResponse } from '../services/api';

export function useArbitrage(fullDetails: boolean = false) {
  return useQuery({
    queryKey: ['arbitrage', fullDetails],
    queryFn: () => arbitrageApi.getOpportunities(fullDetails),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useUnlockArbitrage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (opportunityId: string) => arbitrageApi.unlock(opportunityId),
    onSuccess: () => {
      // Invalidate both full and summary views
      queryClient.invalidateQueries({ queryKey: ['arbitrage'] });
      // Also invalidate user profile to update credit balance
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
