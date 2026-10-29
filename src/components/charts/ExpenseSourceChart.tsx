'use client';

import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import GlassCard from '@/components/bits/GlassCard';
import { formatCurrency } from '@/lib/constants';

interface SourceData {
  name: string;
  value: number;
  isDebt?: boolean;
}

interface ExpenseSourceChartProps {
  data: SourceData[];
}

const DEFAULT_SOURCE_COLORS: Record<string, string> = {
  'Bank Account': '#3b82f6', // Blue
  'Credit Card': '#f59e0b', // Amber / Debt liability
  'Debit Card': '#10b981', // Emerald
  'UPI / Digital Wallet': '#8b5cf6', // Purple
  Cash: '#14b8a6', // Teal
  Other: '#64748b', // Slate
};

const FALLBACK_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#14b8a6', '#64748b'];

export default function ExpenseSourceChart({ data }: ExpenseSourceChartProps) {
  const filteredData = data.filter((d) => d.value > 0);
  const total = filteredData.reduce((acc, d) => acc + d.value, 0);

  return (
    <GlassCard padding="md" className="w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base sm:text-lg font-semibold text-white">Expenses by Source</h3>
        <span className="text-xs text-gray-400 font-medium">Total: {formatCurrency(total)}</span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <p className="text-xs text-gray-500">Breakdown by payment source & debt liability</p>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex-1 min-h-[260px] flex items-center justify-center text-sm text-gray-500">
          No payment source data to display
        </div>
      ) : (
        <div className="flex-1 min-h-[260px] sm:min-h-[280px]">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <Pie
                data={filteredData}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              >
                {filteredData.map((entry, index) => {
                  const color =
                    DEFAULT_SOURCE_COLORS[entry.name] ||
                    FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                  return <Cell key={`source-cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 15, 30, 0.95)',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}
                itemStyle={{ color: '#e2e8f0' }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => {
                  const num = Number(value) || 0;
                  const pct = total > 0 ? ((num / total) * 100).toFixed(1) : '0';
                  const isCredit = String(name).toLowerCase().includes('credit');
                  const suffix = isCredit ? ' [Liability / Debt]' : ' [Direct Outflow]';
                  return [`${formatCurrency(num)} (${pct}%)`, `${name}${suffix}`];
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                wrapperStyle={{
                  fontSize: '11px',
                  paddingTop: '10px',
                  maxHeight: '70px',
                  overflowY: 'auto',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
}
