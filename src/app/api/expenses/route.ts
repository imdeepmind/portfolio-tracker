import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Expense from '@/models/Expense';
import mongoose from 'mongoose';

// GET all expenses for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // e.g. "2026-10"

    const query: Record<string, unknown> = {
      user: new mongoose.Types.ObjectId(userId),
    };

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 }).lean();

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create a new expense
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, date, category, source, note } = body;

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount greater than zero is required' },
        { status: 400 }
      );
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    if (!source || typeof source !== 'string' || source.trim().length === 0) {
      return NextResponse.json({ error: 'Payment source is required' }, { status: 400 });
    }

    const expenseDate = date ? new Date(date) : new Date();
    if (isNaN(expenseDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date provided' }, { status: 400 });
    }

    await dbConnect();

    const expense = await Expense.create({
      user: (session.user as { id: string }).id,
      amount: parsedAmount,
      date: expenseDate,
      category: category.trim(),
      source: source.trim(),
      note: typeof note === 'string' ? note.trim() : '',
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
