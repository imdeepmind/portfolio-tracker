'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/items/DashboardLayout';
import GlassCard from '@/components/bits/GlassCard';
import Input from '@/components/bits/Input';
import Button from '@/components/bits/Button';
import BackLink from '@/components/bits/BackLink';
import { toLocalDateTimeString, toTimezoneAwareString } from '@/lib/datetime';

export default function NewTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: holdingId } = use(params);
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [totalPortfolioSize, setTotalPortfolioSize] = useState('');
  const [dateTime, setDateTime] = useState(toLocalDateTimeString(new Date()));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/holdings/${holdingId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          totalPortfolioSize: parseFloat(totalPortfolioSize),
          dateTime: toTimezoneAwareString(dateTime),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create transaction');
        return;
      }

      toast.success('Transaction recorded successfully');
      router.push(`/holdings/${holdingId}/transactions`);
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <BackLink href={`/holdings/${holdingId}/transactions`}>Back to Transactions</BackLink>
          <h1 className="text-3xl font-bold text-white">New Transaction</h1>
          <p className="text-gray-400 mt-1">Record a new investment transaction</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={loading} loadingText="Recording..." size="lg">
                Record Transaction
              </Button>
              <Button href={`/holdings/${holdingId}/transactions`} variant="secondary" size="lg">
                Cancel
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
}
