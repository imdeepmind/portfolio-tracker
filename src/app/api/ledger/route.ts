import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = new mongoose.Types.ObjectId((session.user as { id: string }).id);

    await dbConnect();

    // Aggregation pipeline to get monthly snapshots per holding
    const aggregatedData = await Transaction.aggregate([
      { $match: { user: userId } },
      { $sort: { dateTime: 1 } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: { $toDate: '$dateTime' } } },
            holding: '$holding',
          },
          lastPortfolio: { $last: '$totalPortfolioSize' },
          lastInvested: { $last: '$totalAmountInvested' },
          monthlyAmount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 as const } },
    ]);

    interface LedgerItem {
      month: string;
      totalAmountInvested: number;
      totalPortfolioSize: number;
      totalProfit: number;
      profitPercent: number;
      monthlyInvestment: number;
      monthlyIncome: number;
      monthlyIncomePercent: number;
    }

    const ledgerData: LedgerItem[] = [];
    const latestStates: Record<string, { portfolioSize: number; amountInvested: number }> = {};

    // Group by month
    const monthsMap: Record<string, (typeof aggregatedData)[0][]> = {};
    aggregatedData.forEach((item) => {
      const month = item._id.month;
      if (!monthsMap[month]) monthsMap[month] = [];
      monthsMap[month].push(item);
    });

    const sortedMonths = Object.keys(monthsMap).sort();
    let previousMonthProfit = 0;

    for (const monthKey of sortedMonths) {
      const monthItems = monthsMap[monthKey];

      // Update latest states
      monthItems.forEach((item) => {
        latestStates[item._id.holding.toString()] = {
          portfolioSize: item.lastPortfolio,
          amountInvested: item.lastInvested,
        };
      });

      // Calculate totals for the month
      let totalPortfolioSize = 0;
      let totalAmountInvested = 0;
      Object.values(latestStates).forEach((state) => {
        totalPortfolioSize += state.portfolioSize;
        totalAmountInvested += state.amountInvested;
      });

      const totalProfit = totalPortfolioSize - totalAmountInvested;
      const profitPercent = totalAmountInvested > 0 ? (totalProfit / totalAmountInvested) * 100 : 0;

      const monthlyIncome = totalProfit - previousMonthProfit;
      const monthlyIncomePercent =
        totalAmountInvested > 0 ? (monthlyIncome / totalAmountInvested) * 100 : 0;

      // Calculate total monthly investment amount (sum of transaction amounts for the month)
      const monthlyInvestment = monthItems.reduce((sum, i) => sum + (i.monthlyAmount || 0), 0);

      ledgerData.push({
        month: monthKey,
        totalAmountInvested,
        totalPortfolioSize,
        totalProfit,
        profitPercent: Number(profitPercent.toFixed(2)),
        monthlyInvestment,
        monthlyIncome,
        monthlyIncomePercent: Number(monthlyIncomePercent.toFixed(2)),
      });

      previousMonthProfit = totalProfit;
    }

    return NextResponse.json(ledgerData.reverse()); // Newest first
  } catch (error) {
    console.error('Ledger API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
