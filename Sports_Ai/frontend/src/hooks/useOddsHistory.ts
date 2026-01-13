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
      try {
        const params = new URLSearchParams();
        if (eventId) params.append('eventId', eventId);
        if (marketId) params.append('marketId', marketId);
        
        const response = await api.get<OddsHistoryResponse>(`/v1/odds/history?${params.toString()}`);
        
        // Validate response structure
        if (!response.data) {
          return { history: [], total: 0 };
        }
        
        // Ensure history is an array
        const history = Array.isArray(response.data.history) 
          ? response.data.history 
          : [];
        
        // Ensure each history entry has movements array
        const validatedHistory = history.map((h: any) => ({
          ...h,
          movements: Array.isArray(h?.movements) ? h.movements : [],
        }));
        
        return {
          history: validatedHistory,
          total: response.data.total || validatedHistory.length,
        };
      } catch (error) {
        console.error('Error fetching odds history:', error);
        // Return empty structure on error
        return { history: [], total: 0 };
      }
    },
    enabled: !!eventId, // Only fetch if eventId is provided
    staleTime: 60000, // 1 minute
    retry: 1, // Only retry once on failure
  });
}
