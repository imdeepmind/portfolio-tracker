'use client';

import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/items/DashboardLayout';
import { PageSpinner } from '@/components/bits/Spinner';
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, EXPENSE_SOURCES } from '@/lib/constants';
import StatCard from '@/components/bits/StatCard';
import Button from '@/components/bits/Button';
import Input from '@/components/bits/Input';
import Select from '@/components/bits/Select';
import EmptyState from '@/components/bits/EmptyState';
import ConfirmationModal from '@/components/items/ConfirmationModal';
import ExpenseCategoryChart from '@/components/charts/ExpenseCategoryChart';
import ExpenseSourceChart from '@/components/charts/ExpenseSourceChart';

interface ExpenseItem {
  _id: string;
  amount: number;
  date: string;
  category: string;
  source: string;
  note?: string;
  createdAt: string;
}

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isCreditCard = (source: string) => source.toLowerCase().includes('credit');

const categoryBadgeStyles: Record<string, string> = {
  'Food & Dining': 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  Groceries: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  'Rent & Housing': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  'Utilities & Bills': 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  Shopping: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  Transportation: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  Travel: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  'Travel - Trekking': 'bg-lime-500/10 text-lime-300 border-lime-500/20',
  'Travel - Bike Ride': 'bg-orange-500/10 text-orange-300 border-orange-500/20',
  'Travel - Car': 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  'Entertainment & Leisure': 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  'Health & Medical': 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  'Investment & Savings': 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  Other: 'bg-gray-500/10 text-gray-300 border-gray-500/20',
};

type PaymentTypeFilter = 'ALL' | 'DIRECT' | 'CREDIT';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [source, setSource] = useState<string>(EXPENSE_SOURCES[0]);
  const [note, setNote] = useState('');

  // Delete State
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null);

  // Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<PaymentTypeFilter>('ALL');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (!res.ok) throw new Error('Failed to load expenses');
      const data = await res.json();
      setExpenses(data);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingExpense(null);
    setAmount('');
    setDate(getTodayDateString());
    setCategory(EXPENSE_CATEGORIES[0]);
    setSource(EXPENSE_SOURCES[0]);
    setNote('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (expenseToEdit: ExpenseItem) => {
    setEditingExpense(expenseToEdit);
    setAmount(expenseToEdit.amount.toString());
    setDate(expenseToEdit.date.split('T')[0]);
    setCategory(expenseToEdit.category);
    setSource(expenseToEdit.source);
    setNote(expenseToEdit.note || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!submitting) {
      setIsModalOpen(false);
      setEditingExpense(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = Boolean(editingExpense);
      const endpoint = isEdit ? `/api/expenses/${editingExpense?._id}` : '/api/expenses';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount,
          date,
          category,
          source,
          note,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${isEdit ? 'update' : 'record'} expense`);
      }

      const saved = await res.json();
      if (isEdit) {
        setExpenses((prev) => prev.map((item) => (item._id === saved._id ? saved : item)));
        toast.success('Expense updated successfully');
      } else {
        setExpenses((prev) => [saved, ...prev]);
        toast.success('Expense recorded successfully');
      }
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    try {
      const res = await fetch(`/api/expenses/${expenseToDelete._id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete expense');

      setExpenses((prev) => prev.filter((item) => item._id !== expenseToDelete._id));
      toast.success('Expense deleted');
      setExpenseToDelete(null);
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  // Computations
  // Credit card spends are debt/liabilities. They are kept separate from settled direct cash outflow
  // so next month when the user pays the CC bill from their bank account, it is not double counted!
  const stats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayStr = getTodayDateString();

    let thisMonthDirect = 0;
    let todayDirect = 0;
    let totalDirect = 0;
    let totalCreditDebt = 0;
    let thisMonthCreditDebt = 0;

    expenses.forEach((item) => {
      const isCC = isCreditCard(item.source);
      const itemDate = new Date(item.date);
      const isThisMonth =
        itemDate.getFullYear() === currentYear && itemDate.getMonth() === currentMonth;
      const isToday = item.date.split('T')[0] === todayStr;

      if (isCC) {
        totalCreditDebt += item.amount;
        if (isThisMonth) thisMonthCreditDebt += item.amount;
      } else {
        totalDirect += item.amount;
        if (isThisMonth) thisMonthDirect += item.amount;
        if (isToday) todayDirect += item.amount;
      }
    });

    return {
      thisMonthDirect,
      todayDirect,
      totalDirect,
      totalCreditDebt,
      thisMonthCreditDebt,
      count: expenses.length,
    };
  }, [expenses]);

  // Chart data
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + item.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const sourceChartData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((item) => {
      map[item.source] = (map[item.source] || 0) + item.amount;
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      isDebt: isCreditCard(name),
    }));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // Payment type filter (All, Direct/Settled, Credit/Debt)
      const isCC = isCreditCard(item.source);
      if (paymentTypeFilter === 'DIRECT' && isCC) return false;
      if (paymentTypeFilter === 'CREDIT' && !isCC) return false;
      return true;
    });
  }, [expenses, selectedCategory, paymentTypeFilter]);

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Expense Tracker
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Track daily expenditures and separate direct cash outflows from credit card debt
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleOpenCreateModal}
          className="w-full sm:w-auto"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          }
        >
          Add Expense
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard
          label="This Month Outflow"
          value={formatCurrency(stats.thisMonthDirect)}
          trend="down"
          subValue="Direct bank/cash spent"
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        />
        <StatCard
          label="Today's Outflow"
          value={formatCurrency(stats.todayDirect)}
          trend="neutral"
          subValue="Direct spent today"
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Total Settled Outflow"
          value={formatCurrency(stats.totalDirect)}
          trend="neutral"
          subValue="Bank, UPI & Cash (No CC)"
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />
        <StatCard
          label="Credit Card Debt"
          value={formatCurrency(stats.totalCreditDebt)}
          trend="down"
          subValue="Pending bill settlement"
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
        />
      </div>

      {/* Visual Analytics / Pie Charts */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <ExpenseCategoryChart data={categoryChartData} />
          <ExpenseSourceChart data={sourceChartData} />
        </div>
      )}

      {/* Filters (Touch-friendly & Responsive) */}
      {expenses.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* Payment Type / Debt Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap mr-1">Type:</span>
            <button
              onClick={() => setPaymentTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                paymentTypeFilter === 'ALL'
                  ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40'
                  : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              All Types ({expenses.length})
            </button>
            <button
              onClick={() => setPaymentTypeFilter('DIRECT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                paymentTypeFilter === 'DIRECT'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              Direct Cash Outflow ({expenses.filter((e) => !isCreditCard(e.source)).length})
            </button>
            <button
              onClick={() => setPaymentTypeFilter('CREDIT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                paymentTypeFilter === 'CREDIT'
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                  : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              Credit Card Debt ({expenses.filter((e) => isCreditCard(e.source)).length})
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap mr-1">
              Category:
            </span>
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40'
                  : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              All ({expenses.length})
            </button>
            {EXPENSE_CATEGORIES.map((cat) => {
              const count = expenses.filter((e) => e.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-primary-500/25 text-primary-300 border border-primary-500/40'
                      : 'bg-white/[0.04] text-gray-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <PageSpinner text="Loading expenses..." />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={
            <svg
              className="w-10 h-10 text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
          title="No expenses recorded yet"
          description="Start tracking your daily expenses by adding your first transaction."
          action={
            <Button variant="primary" onClick={handleOpenCreateModal}>
              + Add First Expense
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/[0.06] backdrop-blur-md bg-white/[0.02]">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.03]">
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Category
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Source
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Note
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredExpenses.map((expense) => {
                  const badgeClass =
                    categoryBadgeStyles[expense.category] ||
                    'bg-gray-500/10 text-gray-300 border-gray-500/20';
                  const isCC = isCreditCard(expense.source);

                  return (
                    <tr key={expense._id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-white whitespace-nowrap">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${badgeClass}`}
                        >
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
                            isCC
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 font-medium'
                              : 'bg-white/[0.04] border-white/[0.08] text-gray-300'
                          }`}
                        >
                          {isCC && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          )}
                          {expense.source}
                          {isCC && <span className="text-[10px] opacity-75">(Debt)</span>}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                        {expense.note || <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-right whitespace-nowrap">
                        <span className={isCC ? 'text-amber-400' : 'text-rose-400'}>
                          -{formatCurrency(expense.amount)}
                        </span>
                        {isCC && (
                          <span className="block text-[10px] font-normal text-amber-500/80">
                            Unsettled Debt
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(expense)}
                            title="Edit expense"
                            className="p-1.5 text-gray-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => setExpenseToDelete(expense)}
                            title="Delete expense"
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.8}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Optimized for small screens) */}
          <div className="block md:hidden space-y-3">
            {filteredExpenses.map((expense) => {
              const badgeClass =
                categoryBadgeStyles[expense.category] ||
                'bg-gray-500/10 text-gray-300 border-gray-500/20';
              const isCC = isCreditCard(expense.source);

              return (
                <div
                  key={expense._id}
                  className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${badgeClass}`}
                    >
                      {expense.category}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {formatDate(expense.date)}
                    </span>
                  </div>

                  {expense.note && (
                    <p className="text-sm text-gray-200 font-medium mb-3 line-clamp-2">
                      {expense.note}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] mt-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] border ${
                          isCC
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/25'
                            : 'bg-white/[0.04] border-white/[0.08] text-gray-400'
                        }`}
                      >
                        {expense.source}
                        {isCC && <span className="text-[9px] font-bold">(Debt)</span>}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span
                          className={`text-base font-bold ${isCC ? 'text-amber-400' : 'text-rose-400'}`}
                        >
                          -{formatCurrency(expense.amount)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(expense)}
                          title="Edit expense"
                          className="p-1.5 text-gray-400 hover:text-primary-300 rounded transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(expense)}
                          title="Delete expense"
                          className="p-1.5 text-gray-400 hover:text-red-400 rounded transition-colors"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal} />
          <div className="relative w-full max-w-lg backdrop-blur-xl bg-[#141424]/95 border border-white/[0.1] rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/50 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="amount"
                label="Amount"
                type="number"
                step="any"
                min="0.01"
                placeholder="e.g. 500"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <Input
                id="date"
                label="Date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />

              <Select
                id="category"
                label="Category"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={EXPENSE_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
              />

              <div>
                <Select
                  id="source"
                  label="Source (Payment Method)"
                  required
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  options={EXPENSE_SOURCES.map((src) => ({ value: src, label: src }))}
                />
                {isCreditCard(source) && (
                  <p className="text-xs text-amber-400/90 mt-1.5 flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Credit card spends are tracked as debt liability (not double-counted when paying
                    the bill).
                  </p>
                )}
              </div>

              <Input
                id="note"
                label="Note / Memo"
                placeholder="Optional description (e.g. Weekly grocery shopping)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  loading={submitting}
                  loadingText={editingExpense ? 'Updating...' : 'Saving...'}
                >
                  {editingExpense ? 'Update Expense' : 'Save Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(expenseToDelete)}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense of ${expenseToDelete ? formatCurrency(expenseToDelete.amount) : ''} (${expenseToDelete?.category})? This action cannot be undone.`}
        confirmLabel="Delete Expense"
        onConfirm={handleDelete}
        onCancel={() => setExpenseToDelete(null)}
      />
    </DashboardLayout>
  );
}
