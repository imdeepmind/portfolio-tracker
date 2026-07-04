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

    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const sixMonthsAgoKey = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

    // --- Single Aggregation Pipeline ---
    // 1. Group by month and holding to get the last snapshot of each holding per month
    // 2. Lookup holding details
    // 3. Group by month to gather all holding snapshots for that month
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
      {
        $lookup: {
          from: 'holdings',
          localField: '_id.holding',
          foreignField: '_id',
          as: 'holdingDetails',
        },
      },
      { $unwind: '$holdingDetails' },
      {
        $group: {
          _id: '$_id.month',
          holdings: {
            $push: {
              holdingId: '$_id.holding',
              name: '$holdingDetails.name',
              risk: { $ifNull: ['$holdingDetails.risk', 'high'] },
              portfolioSize: '$lastPortfolio',
              amountInvested: '$lastInvested',
              monthlyInvestment: '$monthlyAmount',
              profit: { $subtract: ['$lastPortfolio', '$lastInvested'] },
            },
          },
          totalMonthlyInvestment: { $sum: '$monthlyAmount' },
        },
      },
      { $sort: { _id: 1 as const } },
    ]);

    // --- Post-processing for accurate carry-over and overall totals ---
    interface HoldingSnapshot {
      holdingId: string;
      name: string;
      risk: string;
      portfolioSize: number;
      amountInvested: number;
      monthlyInvestment: number;
      profit: number;
    }

    interface MonthlyStat {
      month: string;
      totalPortfolioSize: number;
      totalAmountInvested: number;
      totalProfit: number;
      totalMonthlyInvestment: number;
      holdings: HoldingSnapshot[];
    }

    const monthlyStats: MonthlyStat[] = [];
    const latestStates: Record<
      string,
      { portfolioSize: number; amountInvested: number; name: string; risk: string }
    > = {};

    for (const monthData of aggregatedData) {
      const monthKey = monthData._id;

      // Update latest states for holdings that had transactions this month
      monthData.holdings.forEach(
        (h: {
          holdingId: string;
          name: string;
          risk: string;
          portfolioSize: number;
          amountInvested: number;
          monthlyInvestment: number;
        }) => {
          latestStates[h.holdingId.toString()] = {
            name: h.name,
            risk: h.risk,
            portfolioSize: h.portfolioSize,
            amountInvested: h.amountInvested,
          };
        }
      );

      // Map monthly investments from current month's transactions
      const monthlyInvestmentsMap: Record<string, number> = {};
      monthData.holdings.forEach((h: { holdingId: string; monthlyInvestment: number }) => {
        monthlyInvestmentsMap[h.holdingId.toString()] = h.monthlyInvestment;
      });

      // Calculate overall cumulative totals at the end of this month
      let totalPortfolioSize = 0;
      let totalAmountInvested = 0;
      const allHoldingsSnapshot: HoldingSnapshot[] = [];

      Object.entries(latestStates).forEach(([id, state]) => {
        totalPortfolioSize += state.portfolioSize;
        totalAmountInvested += state.amountInvested;
        allHoldingsSnapshot.push({
          holdingId: id,
          ...state,
          monthlyInvestment: monthlyInvestmentsMap[id] || 0,
          profit: state.portfolioSize - state.amountInvested,
        });
      });

      monthlyStats.push({
        month: monthKey,
        totalPortfolioSize,
        totalAmountInvested,
        totalProfit: totalPortfolioSize - totalAmountInvested,
        totalMonthlyInvestment: monthData.totalMonthlyInvestment,
        holdings: allHoldingsSnapshot,
      });
    }

    // --- Derive dashboard overall statistics ---
    const lastMonth = monthlyStats[monthlyStats.length - 1] || {
      totalAmountInvested: 0,
      totalPortfolioSize: 0,
      totalProfit: 0,
    };

    const totalAmountInvested = lastMonth.totalAmountInvested;
    const totalPortfolioSize = lastMonth.totalPortfolioSize;
    const totalProfit = totalPortfolioSize - totalAmountInvested;

    // Current month investment
    const currentMonthEntry = monthlyStats.find((m) => m.month === currentMonthKey);
    const totalInvestmentCurrentMonth = currentMonthEntry?.totalMonthlyInvestment || 0;

    // Current month profit
    const currentMonthIndex = monthlyStats.findIndex((m) => m.month === currentMonthKey);
    const previousMonthProfit =
      currentMonthIndex > 0 ? monthlyStats[currentMonthIndex - 1].totalProfit : 0;
    const currentMonthProfit = totalProfit - previousMonthProfit;

    // Profit in last 6 months
    const sixMonthsAgoIndex = monthlyStats.findIndex((m) => m.month >= sixMonthsAgoKey);
    const profitBeforeSixMonths =
      sixMonthsAgoIndex > 0 ? monthlyStats[sixMonthsAgoIndex - 1].totalProfit : 0;
    const profitLastSixMonths = totalProfit - profitBeforeSixMonths;

    // Total profitable months (where cumulative profit increased)
    let totalProfitableMonths = 0;
    for (let i = 0; i < monthlyStats.length; i++) {
      const curr = monthlyStats[i].totalProfit;
      const prev = i > 0 ? monthlyStats[i - 1].totalProfit : 0;
      if (curr > prev) totalProfitableMonths++;
    }

    // Average profit per month (last 6 months)
    const averageProfitLastSixMonths = profitLastSixMonths / 6;

    // Target monthly return (yearly 22%)
    const yearlyTargetRate = 0.22;
    const monthlyTargetReturn = (totalPortfolioSize * yearlyTargetRate) / 12;

    // Realistic monthly target (10% yearly)
    const realisticYearlyTargetRate = 0.1;
    const realisticMonthlyTargetReturn = (totalPortfolioSize * realisticYearlyTargetRate) / 12;

    return NextResponse.json({
      totalAmountInvested,
      totalPortfolioSize,
      totalProfit,
      totalInvestmentCurrentMonth,
      currentMonthProfit,
      profitLastSixMonths,
      averageProfitLastSixMonths,
      totalProfitableMonths,
      totalMonths: monthlyStats.length,
      monthlyTargetReturn,
      realisticMonthlyTargetReturn,
      monthlyData: monthlyStats, // Include new detailed data for charts
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
