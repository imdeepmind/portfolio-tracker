'use client';

import React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import GlassCard from '@/components/bits/GlassCard';
import { formatCurrency } from '@/lib/constants';

interface CategoryData {
  name: string;
  value: number;
}

interface ExpenseCategoryChartProps {
  data: CategoryData[];
}

const CATEGORY_COLORS = [
  '#f59e0b', // Amber (Food & Dining)
  '#10b981', // Emerald (Groceries)
  '#3b82f6', // Blue (Rent & Housing)
  '#06b6d4', // Cyan (Utilities & Bills)
  '#a855f7', // Purple (Shopping)
  '#6366f1', // Indigo (Transportation)
  '#0ea5e9', // Sky (Travel)
  '#84cc16', // Lime (Travel - Trekking)
  '#f97316', // Orange (Travel - Bike Ride)
  '#2563eb', // Royal Blue (Travel - Car)
  '#ec4899', // Pink (Entertainment & Leisure)
  '#f43f5e', // Rose (Health & Medical)
  '#14b8a6', // Teal (Investment & Savings)
  '#64748b', // Slate (Other)
];

export default function ExpenseCategoryChart({ data }: ExpenseCategoryChartProps) {
  const filteredData = data.filter((d) => d.value > 0);
  const total = filteredData.reduce((acc, d) => acc + d.value, 0);

  return (
    <GlassCard padding="md" className="w-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base sm:text-lg font-semibold text-white">Expenses by Category</h3>
        <span className="text-xs text-gray-400 font-medium">Total: {formatCurrency(total)}</span>
      </div>
      <p className="text-xs text-gray-500 mb-4">Breakdown across expense categories</p>

      {filteredData.length === 0 ? (
        <div className="flex-1 min-h-[260px] flex items-center justify-center text-sm text-gray-500">
          No category data to display
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
                {filteredData.map((_, index) => (
                  <Cell
                    key={`cat-cell-${index}`}
                    fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  />
                ))}
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
                  return [`${formatCurrency(num)} (${pct}%)`, name || 'Category'];
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
