'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/items/DashboardLayout';
import GlassCard from '@/components/bits/GlassCard';
import Input from '@/components/bits/Input';
import Button from '@/components/bits/Button';
import BackLink from '@/components/bits/BackLink';
import { PageSpinner } from '@/components/bits/Spinner';
import { toLocalDateTimeString, toTimezoneAwareString } from '@/lib/datetime';

export default function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string; txId: string }>;
}) {
  const { id: holdingId, txId } = use(params);
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [totalPortfolioSize, setTotalPortfolioSize] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const res = await fetch(`/api/holdings/${holdingId}/transactions/${txId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setAmount(data.amount.toString());
        setTotalPortfolioSize(data.totalPortfolioSize.toString());
        setDateTime(toLocalDateTimeString(new Date(data.dateTime)));
      } catch {
        toast.error('Failed to load transaction');
        router.push(`/holdings/${holdingId}/transactions`);
      } finally {
        setFetching(false);
      }
    };
    fetchTransaction();
  }, [holdingId, txId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/holdings/${holdingId}/transactions/${txId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          totalPortfolioSize: parseFloat(totalPortfolioSize),
          dateTime: toTimezoneAwareString(dateTime),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to update transaction');
        return;
      }

      toast.success('Transaction updated successfully');
      router.push(`/holdings/${holdingId}/transactions`);
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <DashboardLayout>
        <PageSpinner text="Loading transaction..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <BackLink href={`/holdings/${holdingId}/transactions`}>Back to Transactions</BackLink>
          <h1 className="text-3xl font-bold text-white">Edit Transaction</h1>
          <p className="text-gray-400 mt-1">Update transaction details</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              id="amount"
              label="Amount Investing"
              helperText="How much was invested in this transaction?"
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
              <Button type="submit" loading={loading} loadingText="Saving..." size="lg">
                Save Changes
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
