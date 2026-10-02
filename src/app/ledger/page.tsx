'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/items/DashboardLayout';
import { PageSpinner } from '@/components/bits/Spinner';
import { formatCurrency } from '@/lib/constants';
import GlassCard from '@/components/bits/GlassCard';
import Button from '@/components/bits/Button';

interface LedgerEntry {
  month: string;
  totalAmountInvested: number;
  monthlyInvestment: number;
  totalPortfolioSize: number;
  totalProfit: number;
  profitPercent: number;
  monthlyIncome: number;
  monthlyIncomePercent: number;
}

export default function LedgerPage() {
  const [data, setData] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        const res = await fetch('/api/ledger');
        if (!res.ok) throw new Error('Failed to fetch ledger data');
        const json = await res.json();
        setData(json);
      } catch {
        toast.error('Failed to load ledger data');
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, []);

  const formatDate = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDownloadCsv = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/ledger/csv');
      if (!res.ok) throw new Error('Failed to download CSV');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="(.+)"/);
      a.download = match?.[1] ?? `portfolio-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch {
      toast.error('Failed to download CSV');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Portfolio Ledger</h1>
          <p className="text-gray-400 mt-1">Historical monthly performance breakdown</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          loading={downloading}
          loadingText="Downloading..."
          disabled={loading || data.length === 0}
          onClick={handleDownloadCsv}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          }
        >
          Download CSV
        </Button>
      </div>

      {loading ? (
        <PageSpinner text="Loading ledger..." />
      ) : data.length === 0 ? (
        <GlassCard padding="lg" className="text-center py-16">
          <p className="text-gray-500">No transaction history found.</p>
        </GlassCard>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] backdrop-blur-md bg-white/[0.02]">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Month
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Total Investment
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Monthly Investment
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Portfolio Size
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">
                  Total Profit
                </th>
                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">
                  Monthly Income
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {data.map((entry) => (
                <tr key={entry.month} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-5">
                    <span className="text-sm font-medium text-white">
                      {formatDate(entry.month)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm text-gray-300">
                      {formatCurrency(entry.totalAmountInvested)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm text-gray-300">
                      {formatCurrency(entry.monthlyInvestment)}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-sm text-gray-300">
                      {formatCurrency(entry.totalPortfolioSize)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-sm font-semibold ${entry.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {entry.totalProfit >= 0 ? '+' : ''}
                        {formatCurrency(entry.totalProfit)}
                      </span>
                      <span
                        className={`text-[11px] font-medium opacity-80 ${entry.profitPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        {entry.profitPercent >= 0 ? '▲' : '▼'} {Math.abs(entry.profitPercent)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-sm font-semibold ${entry.monthlyIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {entry.monthlyIncome >= 0 ? '+' : ''}
                        {formatCurrency(entry.monthlyIncome)}
                      </span>
                      <span
                        className={`text-[11px] font-medium opacity-80 ${entry.monthlyIncomePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                      >
                        {entry.monthlyIncomePercent >= 0 ? '▲' : '▼'}{' '}
                        {Math.abs(entry.monthlyIncomePercent)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
