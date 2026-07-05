'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/items/DashboardLayout';
import GlassCard from '@/components/bits/GlassCard';
import Input from '@/components/bits/Input';
import Button from '@/components/bits/Button';
import BackLink from '@/components/bits/BackLink';
import { toLocalDateTimeString, toTimezoneAwareString } from '@/lib/datetime';

interface Holding {
  _id: string;
  name: string;
}

export default function BulkInsertTransactionPage() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [amount, setAmount] = useState('');
  const [totalPortfolioSize, setTotalPortfolioSize] = useState('');
  const [dateTime, setDateTime] = useState(toLocalDateTimeString(new Date()));
  const [sameAsPrevious, setSameAsPrevious] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingHoldings, setFetchingHoldings] = useState(true);

  useEffect(() => {
    const fetchHoldings = async () => {
      try {
        const res = await fetch('/api/holdings');
        if (!res.ok) throw new Error('Failed to fetch holdings');
        const data = await res.json();
        setHoldings(data);
      } catch {
        toast.error('Failed to load holdings');
      } finally {
        setFetchingHoldings(false);
      }
    };

    fetchHoldings();
  }, []);

  const currentHolding = holdings[currentIndex];

  const handleSameAsPreviousChange = async (checked: boolean) => {
    setSameAsPrevious(checked);
    if (checked && currentHolding) {
      try {
        const res = await fetch(`/api/holdings/${currentHolding._id}/transactions`);
        if (!res.ok) throw new Error('Failed to fetch previous transactions');
        const data = await res.json();
        const transactions = data.transactions || [];

        if (transactions.length > 0) {
          const latest = transactions[0];
          setAmount('0');
          setTotalPortfolioSize(latest.totalPortfolioSize.toString());
          toast.success('Applied previous transaction values');
        } else {
          toast.error('No previous transactions found for this holding');
          setSameAsPrevious(false);
        }
      } catch {
        toast.error('Failed to fetch previous transaction');
        setSameAsPrevious(false);
      }
    } else if (!checked) {
      setAmount('');
      setTotalPortfolioSize('');
    }
  };

  const moveToNext = () => {
    if (currentIndex < holdings.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAmount('');
      setTotalPortfolioSize('');
      setSameAsPrevious(false);
      setDateTime(toLocalDateTimeString(new Date()));
    } else {
      toast.success('All holdings processed');
      router.push('/holdings');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/holdings/${currentHolding._id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          totalPortfolioSize: parseFloat(totalPortfolioSize),
          dateTime: toTimezoneAwareString(dateTime),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to record transaction');
        return;
      }

      toast.success(`Transaction recorded for ${currentHolding.name}`);
      moveToNext();
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingHoldings) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (holdings.length === 0) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <h1 className="text-2xl font-bold text-white mb-4">No Holdings Found</h1>
          <p className="text-gray-400 mb-8">
            You need to add holdings before you can record transactions.
          </p>
          <Button href="/holdings/new">Add Holding</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <BackLink href="/holdings">Back to Holdings</BackLink>
            <h1 className="text-3xl font-bold text-white">Bulk Insert</h1>
            <p className="text-gray-400 mt-1">
              Currently processing:{' '}
              <span className="text-primary-400 font-semibold">{currentHolding.name}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest block mb-1">
              Progress
            </span>
            <div className="text-2xl font-bold text-white">
              {currentIndex + 1} <span className="text-gray-600">/</span> {holdings.length}
            </div>
          </div>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
              <div>
                <p className="text-sm font-medium text-white">Same as previous transaction</p>
                <p className="text-xs text-gray-500">Auto-fill with last known portfolio value</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={sameAsPrevious}
                  onChange={(e) => handleSameAsPreviousChange(e.target.checked)}
                />
                <div className="w-11 h-6 bg-white/[0.1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            <Input
              id="amount"
              label="Amount Investing"
              helperText="How much are you investing in this transaction?"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />

            <Input
              id="totalPortfolioSize"
              label="Total Portfolio Value"
              helperText="Total value of this holding (total invested + capital gains received)"
              type="number"
              step="0.01"
              value={totalPortfolioSize}
              onChange={(e) => setTotalPortfolioSize(e.target.value)}
              placeholder="0.00"
              required
            />

            <Input
              id="dateTime"
              label="Date & Time"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />

            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-3">
                <Button type="submit" loading={loading} loadingText="Recording..." size="lg">
                  {currentIndex === holdings.length - 1 ? 'Finish' : 'Record & Next'}
                </Button>
                <Button type="button" onClick={moveToNext} variant="secondary" size="lg">
                  Skip
                </Button>
              </div>
              <Button
                href="/holdings"
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-white"
              >
                Cancel All
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
