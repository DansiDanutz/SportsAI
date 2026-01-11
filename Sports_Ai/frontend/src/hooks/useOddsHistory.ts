import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface OddsMovement {
  timestamp: string;
  bookmaker: string;
  outcome: string;
  odds: number;
}

export interface OddsHistory {
  eventId: string;
  event: string;
  market: string;
  movements: OddsMovement[];
}

export interface OddsHistoryResponse {
  history: OddsHistory[];
  total: number;
}

export function useOddsHistory(eventId?: string, marketId?: string) {
  return useQuery({
    queryKey: ['odds-history', eventId, marketId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (eventId) params.append('eventId', eventId);
      if (marketId) params.append('marketId', marketId);
      
      const response = await api.get<OddsHistoryResponse>(`/v1/odds/history?${params.toString()}`);
      return response.data;
    },
    enabled: !!eventId, // Only fetch if eventId is provided
    staleTime: 60000, // 1 minute
  });
}
