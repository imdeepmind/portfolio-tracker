import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { EXPENSE_CATEGORIES, EXPENSE_SOURCES } from '@/lib/constants';

export { EXPENSE_CATEGORIES, EXPENSE_SOURCES };
export type { ExpenseCategory, ExpenseSource } from '@/lib/constants';

export interface IExpense extends Document {
  user: Types.ObjectId;
  amount: number;
  date: Date;
  category: string;
  source: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema<IExpense> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'Other',
    },
    source: {
      type: String,
      required: [true, 'Payment source is required'],
      trim: true,
      default: 'Bank Account',
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, 'Note must be at most 300 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

ExpenseSchema.index({ user: 1, date: -1 });

const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;
