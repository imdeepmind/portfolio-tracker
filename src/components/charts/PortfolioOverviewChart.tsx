'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import GlassCard from '@/components/bits/GlassCard';
import { formatCurrency, formatCurrencyNoDecimal } from '@/lib/constants';

interface DataPoint {
  month: string;
  totalInvestment: number;
  portfolioValue: number;
  monthlyInvestment: number;
}

interface PortfolioOverviewChartProps {
  data: DataPoint[];
}

export default function PortfolioOverviewChart({ data }: PortfolioOverviewChartProps) {
  // exclude the first item from the data array
  const cleanedData = data.slice(1);
  return (
    <GlassCard padding="md" className="w-full h-full flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-4">Portfolio Overview</h3>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cleanedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="rgba(255,255,255,0.4)"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#fff' }}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              stroke="rgba(255,255,255,0.4)"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#fff' }}
              tickFormatter={formatCurrencyNoDecimal}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(255,255,255,0.4)"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#fff' }}
              tickFormatter={formatCurrencyNoDecimal}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17, 17, 48, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
                backdropFilter: 'blur(8px)',
              }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(value: number | string | undefined, name: string | undefined) => [
                formatCurrency(Number(value || 0)),
                name || '',
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="portfolioValue"
              name="Portfolio Value"
              stroke="#818cf8"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorPortfolio)"
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="totalInvestment"
              name="Total Investment"
              stroke="#34d399"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorInvestment)"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="monthlyInvestment"
              name="Monthly Investment"
              stroke="#f87171"
              strokeWidth={2}
              fillOpacity={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
