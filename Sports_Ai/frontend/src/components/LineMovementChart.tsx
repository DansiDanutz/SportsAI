import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { OddsMovement } from '../hooks/useOddsHistory';

interface LineMovementChartProps {
  movements?: OddsMovement[];
  title?: string;
}

export const LineMovementChart: React.FC<LineMovementChartProps> = ({ movements, title }) => {
  // Defensive check: ensure movements is an array
  const safeMovements = Array.isArray(movements) ? movements : [];
  
  if (!safeMovements || safeMovements.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-800/50 rounded-lg border border-gray-700">
        No movement data available
      </div>
    );
  }

  // Transform data for Recharts: group by timestamp
  const dataMap: Record<string, any> = {};
  const bookmakers = new Set<string>();

  try {
    // Additional safety check before forEach
    if (!Array.isArray(safeMovements)) {
      console.warn('LineMovementChart: movements is not an array', safeMovements);
      return (
        <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-800/50 rounded-lg border border-gray-700">
          No movement data available
        </div>
      );
    }

    safeMovements.forEach((m) => {
      try {
        if (!m || typeof m !== 'object') {
          return; // Skip invalid entries
        }
        if (!m.timestamp || !m.bookmaker || typeof m.odds !== 'number') {
          return; // Skip invalid entries
        }
        const time = format(new Date(m.timestamp), 'HH:mm');
        if (!dataMap[time]) {
          dataMap[time] = { time };
        }
        const key = `${m.bookmaker} (${m.outcome || 'unknown'})`;
        dataMap[time][key] = m.odds;
        bookmakers.add(key);
      } catch (entryError) {
        // Skip individual invalid entries, don't break the whole loop
        console.warn('LineMovementChart: Skipping invalid movement entry', entryError);
      }
    });
  } catch (error) {
    console.error('LineMovementChart: Error processing movements data:', error);
    return (
      <div className="h-64 flex items-center justify-center text-red-500 bg-gray-800/50 rounded-lg border border-red-700">
        Error loading movement data
      </div>
    );
  }

  const chartData = Object.values(dataMap).sort((a, b) => a.time.localeCompare(b.time));
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="w-full">
      {title && <h3 className="text-white font-medium mb-4">{title}</h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            {Array.from(bookmakers).map((bm, index) => (
              <Line
                key={bm}
                type="monotone"
                dataKey={bm}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
