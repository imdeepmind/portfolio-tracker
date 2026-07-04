'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/items/DashboardLayout';
import StatCard from '@/components/bits/StatCard';
import { PageSpinner } from '@/components/bits/Spinner';
import { formatCurrency } from '@/lib/constants';

// Import Charts
import PortfolioOverviewChart from '@/components/charts/PortfolioOverviewChart';
import HoldingsDistributionChart from '@/components/charts/HoldingsRiskDistributionChart';
import MonthlyPnLChart from '@/components/charts/MonthlyPnLChart';
import HoldingsPnLChart from '@/components/charts/HoldingsPnLChart';
import HoldingDetailChart from '@/components/charts/HoldingDetailChart';

interface DashboardData {
  totalAmountInvested: number;
  totalPortfolioSize: number;
  totalProfit: number;
  totalInvestmentCurrentMonth: number;
  currentMonthProfit: number;
  profitLastSixMonths: number;
  averageProfitLastSixMonths: number;
  totalProfitableMonths: number;
  totalMonths: number;
  monthlyTargetReturn: number;
  realisticMonthlyTargetReturn: number;
  monthlyData: {
    month: string;
    totalPortfolioSize: number;
    totalAmountInvested: number;
    totalProfit: number;
    totalMonthlyInvestment: number;
    holdings: {
      holdingId: string;
      name: string;
      risk: string;
      portfolioSize: number;
      amountInvested: number;
      monthlyInvestment: number;
      profit: number;
    }[];
  }[];
}

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        const json = await res.json();
        setData(json);
      } catch {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const profitTrend = (v: number): 'up' | 'down' | 'neutral' =>
    v > 0 ? 'up' : v < 0 ? 'down' : 'neutral';

  // --- Data Transformations ---

  // 1. Portfolio Overview
  const portfolioOverviewData =
    data?.monthlyData.map((m) => ({
      month: m.month,
      totalInvestment: m.totalAmountInvested,
      portfolioValue: m.totalPortfolioSize,
      monthlyInvestment: m.totalMonthlyInvestment,
    })) || [];

  // 2. Risk Distribution (from latest month)
  const latestMonth = data?.monthlyData[data.monthlyData.length - 1];
  const riskDistributionData = (() => {
    if (!latestMonth) return [];
    const riskTotals: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
    latestMonth.holdings.forEach((h) => {
      const risk = h.risk || 'high';
      const riskKey = risk.charAt(0).toUpperCase() + risk.slice(1);
      if (riskTotals[riskKey] !== undefined) {
        riskTotals[riskKey] += h.portfolioSize;
      }
    });
    const total = latestMonth.totalPortfolioSize || 1;
    return Object.entries(riskTotals).map(([name, value]) => ({
      name,
      value: Number(((value / total) * 100).toFixed(1)),
    }));
  })();

  // 3. Monthly P&L
  const monthlyPnlData =
    data?.monthlyData.map((m, i) => {
      const prev = i > 0 ? data.monthlyData[i - 1] : { totalPortfolioSize: 0, totalProfit: 0 };
      const pnl = m.totalProfit - prev.totalProfit;
      const pnlPercent = prev.totalPortfolioSize > 0 ? (pnl / prev.totalPortfolioSize) * 100 : 0;
      return {
        month: m.month,
        pnl,
        pnlPercent: Number(pnlPercent.toFixed(2)),
      };
    }) || [];

  // 4. Holdings P&L (latest month)
  const holdingsPnlData =
    latestMonth?.holdings
      .map((h) => ({
        name: h.name,
        pnlPercent:
          h.amountInvested > 0 ? Number(((h.profit / h.amountInvested) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.pnlPercent - a.pnlPercent) || [];

  // 5. Per-Holding History
  const holdingDetailData = (() => {
    if (!data) return {};
    interface HoldingHistoryEntry {
      month: string;
      totalInvestment: number;
      portfolioValue: number;
      monthlyInvestment: number;
    }
    const details: Record<string, HoldingHistoryEntry[]> = {};
    data.monthlyData.forEach((m) => {
      m.holdings.forEach((h) => {
        if (!details[h.name]) details[h.name] = [];
        details[h.name].push({
          month: m.month,
          totalInvestment: h.amountInvested,
          portfolioValue: h.portfolioSize,
          monthlyInvestment: h.monthlyInvestment,
        });
      });
    });
    return details;
  })();

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your portfolio performance</p>
      </div>

      {loading ? (
        <PageSpinner text="Loading dashboard..." />
      ) : !data ? (
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl p-16 text-center">
          <p className="text-gray-500">Unable to load dashboard data.</p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 relative z-10">
            <StatCard
              label="Total Amount Invested"
              value={formatCurrency(data.totalAmountInvested)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />

            <StatCard
              label="Total Portfolio Size"
              value={formatCurrency(data.totalPortfolioSize)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              }
            />

            <StatCard
              label="Total Profit"
              value={`${data.totalProfit >= 0 ? '+' : ''}${formatCurrency(data.totalProfit)}`}
              subValue={
                data.totalAmountInvested > 0
                  ? `${data.totalProfit >= 0 ? '+' : ''}${((data.totalProfit / data.totalAmountInvested) * 100).toFixed(1)}% return`
                  : undefined
              }
              trend={profitTrend(data.totalProfit)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              }
            />

            <StatCard
              label="Investment This Month"
              value={formatCurrency(data.totalInvestmentCurrentMonth)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
            />

            <StatCard
              label="Profit This Month"
              value={`${data.currentMonthProfit >= 0 ? '+' : ''}${formatCurrency(data.currentMonthProfit)}`}
              trend={profitTrend(data.currentMonthProfit)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              }
            />

            <StatCard
              label="Profit Last 6 Months"
              value={`${data.profitLastSixMonths >= 0 ? '+' : ''}${formatCurrency(data.profitLastSixMonths)}`}
              subValue={`Avg ${formatCurrency(data.averageProfitLastSixMonths)}/month`}
              trend={profitTrend(data.profitLastSixMonths)}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                  />
                </svg>
              }
            />

            <StatCard
              label="Profitable Months"
              value={`${data.totalProfitableMonths} / ${data.totalMonths}`}
              subValue={
                data.totalMonths > 0
                  ? `${((data.totalProfitableMonths / data.totalMonths) * 100).toFixed(0)}% win rate`
                  : undefined
              }
              trend={
                data.totalMonths > 0 && data.totalProfitableMonths / data.totalMonths >= 0.5
                  ? 'up'
                  : data.totalMonths > 0
                    ? 'down'
                    : 'neutral'
              }
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />

            <StatCard
              label="Monthly Target"
              value={formatCurrency(data.monthlyTargetReturn)}
              subValue={`Realistic: ${formatCurrency(data.realisticMonthlyTargetReturn)} (10%/yr)`}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              }
            />
          </div>

          {/* Charts Section */}
          <div className="mt-8 space-y-6 relative z-10 text-white">
            {/* Portfolio Overview */}
            <div className="h-[400px]">
              <PortfolioOverviewChart data={portfolioOverviewData} />
            </div>

            {/* Middle row: Risk Dist + Monthly PnL */}
            <div className="grid grid-cols-1 xl:grid-cols-[30%_70%] gap-6 h-auto xl:h-[400px]">
              <div className="h-[350px] xl:h-full">
                <HoldingsDistributionChart data={riskDistributionData} />
              </div>
              <div className="h-[350px] xl:h-full">
                <MonthlyPnLChart data={monthlyPnlData} />
              </div>
            </div>

            {/* Holdings PnL */}
            <div className="h-[400px]">
              <HoldingsPnLChart data={holdingsPnlData} />
            </div>

            {/* Individual Holding Overviews */}
            <div className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {Object.entries(holdingDetailData).map(([name, history]) => (
                  <div key={name} className="h-[400px]">
                    <HoldingDetailChart holdingName={name} data={history} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
