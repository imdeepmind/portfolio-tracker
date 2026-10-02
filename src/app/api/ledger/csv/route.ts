import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import mongoose from 'mongoose';

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = new mongoose.Types.ObjectId((session.user as { id: string }).id);

    await dbConnect();

    const rows = await Transaction.aggregate([
      { $match: { user: userId } },
      { $sort: { dateTime: 1 } },
      {
        $lookup: {
          from: 'holdings',
          localField: 'holding',
          foreignField: '_id',
          as: 'holdingDetails',
        },
      },
      {
        $unwind: {
          path: '$holdingDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          holdingName: { $ifNull: ['$holdingDetails.name', 'Unknown'] },
          amount: 1,
          totalAmountInvested: 1,
          totalPortfolioSize: 1,
          dateTime: 1,
        },
      },
    ]);

    const header = [
      'Holding Name',
      'Investment Amount',
      'Total Invested',
      'Total Portfolio',
      'Profit Amount',
      'Profit %',
      'Investment Date',
    ];

    const lines: string[] = [header.map(escapeCsv).join(',')];

    for (const r of rows as Array<{
      holdingName: string;
      amount: number;
      totalAmountInvested: number;
      totalPortfolioSize: number;
      dateTime: Date;
    }>) {
      const profit = r.totalPortfolioSize - r.totalAmountInvested;
      const profitPercent = r.totalAmountInvested > 0 ? (profit / r.totalAmountInvested) * 100 : 0;
      const dateStr = new Date(r.dateTime).toISOString().split('T')[0];

      const row = [
        escapeCsv(r.holdingName),
        String(r.amount ?? 0),
        String(r.totalAmountInvested ?? 0),
        String(r.totalPortfolioSize ?? 0),
        String(profit),
        profitPercent.toFixed(2),
        escapeCsv(dateStr),
      ].join(',');

      lines.push(row);
    }

    const csv = '\uFEFF' + lines.join('\n');
    const filename = `portfolio-ledger-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Ledger CSV API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
