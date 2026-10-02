'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/items/DashboardLayout';
import GlassCard from '@/components/bits/GlassCard';
import Button from '@/components/bits/Button';
import { PageSpinner } from '@/components/bits/Spinner';
import {
  CalculatorInputs,
  calculateOutputs,
  runStressTests,
  formatIndianCurrency,
  simulateLifecycle,
} from '@/lib/calculator';
import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Legend,
} from 'recharts';

const DEFAULT_INPUTS: CalculatorInputs = {
  currentAge: 29,
  targetRetirementAge: 35,
  currentPortfolio: 0,
  monthlyInvestment: 0,
  stepUp: 0.1,
  expectedReturn: 0.08,
  inflation: 0.05,
  monthlySpending: 50000,
  monthlyExpenseCurrent: 80000,
  monthlyFreelance: 15000,
  withdrawalRate: 0.035,
  excludeEPF: false,
  excludeEmergency: false,
  freelanceDelayYears: 0,
};

function SliderField({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  helper,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">{label}</label>
        <span className="text-sm font-semibold text-white bg-white/[0.06] px-2.5 py-1 rounded-lg border border-white/[0.06]">
          {display}
        </span>
      </div>
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 accent-primary-500"
        />
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
          className="w-24 px-2 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-white text-sm focus:outline-none focus:border-primary-500"
        />
      </div>
    </div>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  helper?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
        <input
          type="number"
          value={value}
          min={0}
          step={1000}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 text-sm"
        />
      </div>
      <p className="text-xs text-primary-300">{formatIndianCurrency(value)}</p>
    </div>
  );
}

export default function CalculatorPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);
  const [loadingData, setLoadingData] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        const totalPortfolioSize: number = json.totalPortfolioSize ?? 0;
        const monthlyData: Array<{ totalMonthlyInvestment: number }> = json.monthlyData ?? [];
        const last12 = monthlyData.slice(-12);
        const avgMonthly =
          last12.length > 0
            ? last12.reduce((sum, m) => sum + (m.totalMonthlyInvestment ?? 0), 0) / last12.length
            : 0;

        setInputs((prev) => ({
          ...prev,
          currentPortfolio: totalPortfolioSize,
          monthlyInvestment: Math.round(avgMonthly),
        }));
        setDataLoaded(true);
      } catch {
        toast.error('Failed to load investment data');
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const outputs = useMemo(() => calculateOutputs(inputs), [inputs]);
  const stress = useMemo(() => runStressTests(inputs), [inputs]);
  const lifecycle = useMemo(() => simulateLifecycle(inputs, 80), [inputs]);

  const validationError =
    inputs.targetRetirementAge <= inputs.currentAge
      ? 'Target retirement age must be greater than current age.'
      : null;
  const negativeReal = outputs.realReturn < 0;
  const withdrawalZero = inputs.withdrawalRate <= 0;

  const handleReset = () => {
    // Reset to defaults but keep live DB values if loaded
    setInputs((prev) => ({
      ...DEFAULT_INPUTS,
      currentPortfolio: dataLoaded ? prev.currentPortfolio : 0,
      monthlyInvestment: dataLoaded ? prev.monthlyInvestment : 0,
    }));
    toast.success('Reset to defaults');
  };

  const update = <K extends keyof CalculatorInputs>(key: K, value: CalculatorInputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Early Retirement Calculator</h1>
          <p className="text-gray-400 mt-1">
            Can you retire at age {inputs.targetRetirementAge}? What is the earliest age that works?
          </p>
          {loadingData && (
            <p className="text-xs text-gray-500 mt-1">Loading live portfolio data…</p>
          )}
          {!loadingData && dataLoaded && (
            <p className="text-xs text-emerald-400 mt-1">
              Live data: Corpus {formatIndianCurrency(inputs.currentPortfolio)} · Avg SIP{' '}
              {formatIndianCurrency(inputs.monthlyInvestment)}/mo (last 12m)
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>

      {validationError && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {validationError}
        </div>
      )}
      {negativeReal && !validationError && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          Warning: Expected return is below inflation – real return is negative (
          {(outputs.realReturn * 100).toFixed(2)}%).
        </div>
      )}
      {withdrawalZero && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Withdrawal rate must be greater than 0.
        </div>
      )}
      {outputs.freelanceCoversSpending && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Freelance income covers spending – required corpus is ₹0. Buffer still shown for safety.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Left – Inputs */}
        <div className="space-y-6">
          <GlassCard padding="md">
            <h3 className="text-base font-semibold text-white mb-4">Inputs</h3>
            <div className="space-y-5">
              <SliderField
                label="Current age"
                value={inputs.currentAge}
                min={18}
                max={60}
                step={1}
                display={`${inputs.currentAge} yrs`}
                onChange={(v) => update('currentAge', Math.round(v))}
              />
              <SliderField
                label="Target retirement age"
                value={inputs.targetRetirementAge}
                min={19}
                max={60}
                step={1}
                display={`${inputs.targetRetirementAge} yrs`}
                onChange={(v) => update('targetRetirementAge', Math.round(v))}
                helper="Must be greater than current age"
              />
              <CurrencyField
                label="Current portfolio value"
                value={inputs.currentPortfolio}
                onChange={(v) => update('currentPortfolio', v)}
                helper="From ledger – auto-filled, editable"
              />
              <CurrencyField
                label="Monthly investment today"
                value={inputs.monthlyInvestment}
                onChange={(v) => update('monthlyInvestment', v)}
                helper="Last-12-month average, auto-filled"
              />
              <SliderField
                label="Annual step-up in investment"
                value={inputs.stepUp * 100}
                min={0}
                max={25}
                step={1}
                display={`${(inputs.stepUp * 100).toFixed(0)}%`}
                onChange={(v) => update('stepUp', v / 100)}
              />
              <SliderField
                label="Expected return (nominal / yr)"
                value={inputs.expectedReturn * 100}
                min={3}
                max={15}
                step={0.5}
                display={`${(inputs.expectedReturn * 100).toFixed(1)}%`}
                onChange={(v) => update('expectedReturn', v / 100)}
              />
              <SliderField
                label="Inflation"
                value={inputs.inflation * 100}
                min={2}
                max={10}
                step={0.5}
                display={`${(inputs.inflation * 100).toFixed(1)}%`}
                onChange={(v) => update('inflation', v / 100)}
              />
              <CurrencyField
                label="Monthly expense today (pre-retirement)"
                value={inputs.monthlyExpenseCurrent}
                onChange={(v) => update('monthlyExpenseCurrent', v)}
                helper="Inflates yearly till retirement"
              />
              <CurrencyField
                label="Monthly spending after retiring (today's money)"
                value={inputs.monthlySpending}
                onChange={(v) => update('monthlySpending', v)}
                helper="Post-retirement spend, inflates yearly; net = spending – freelance"
              />
              <CurrencyField
                label="Monthly freelance income after retiring (today's money)"
                value={inputs.monthlyFreelance}
                onChange={(v) => update('monthlyFreelance', v)}
                helper="Can be 0"
              />
              <SliderField
                label="Withdrawal rate"
                value={inputs.withdrawalRate * 100}
                min={3}
                max={5}
                step={0.1}
                display={`${(inputs.withdrawalRate * 100).toFixed(1)}%`}
                onChange={(v) => update('withdrawalRate', v / 100)}
              />

              <div className="pt-4 border-t border-white/[0.06] space-y-3">
                <p className="text-sm font-medium text-gray-300">Optional toggles</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.excludeEPF}
                    onChange={(e) => update('excludeEPF', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-300">
                    Exclude EPF (₹5.97 lakh) – not available at 35-40
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inputs.excludeEmergency}
                    onChange={(e) => update('excludeEmergency', e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-300">
                    Exclude emergency layers (about ₹5.6 lakh)
                  </span>
                </label>
                <SliderField
                  label="Freelance starts late (years)"
                  value={inputs.freelanceDelayYears}
                  min={0}
                  max={10}
                  step={1}
                  display={
                    inputs.freelanceDelayYears === 0
                      ? 'Immediate'
                      : `${inputs.freelanceDelayYears} yrs`
                  }
                  onChange={(v) => update('freelanceDelayYears', Math.round(v))}
                  helper="Treat freelance as zero for first N retirement years"
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right – Results */}
        <div className="space-y-6">
          {/* Verdict */}
          <GlassCard
            padding="md"
            className={
              outputs.verdict === 'on track'
                ? 'border-emerald-500/30'
                : outputs.verdict === 'close'
                  ? 'border-amber-500/30'
                  : 'border-rose-500/30'
            }
          >
            <h3 className="text-lg font-semibold text-white mb-2">Verdict</h3>
            {validationError ? (
              <p className="text-amber-300 text-sm">Fix validation to see verdict.</p>
            ) : outputs.verdict === 'on track' ? (
              <p className="text-emerald-400 font-semibold">
                On track – surplus {formatIndianCurrency(outputs.surplus)}
              </p>
            ) : outputs.verdict === 'close' ? (
              <p className="text-amber-400 font-semibold">
                Close (within 15%) – short by {formatIndianCurrency(Math.abs(outputs.surplus))}
              </p>
            ) : (
              <p className="text-rose-400 font-semibold">
                Short by {formatIndianCurrency(Math.abs(outputs.surplus))}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Years to retirement: {outputs.yearsToRetirement} · Monthly return{' '}
              {(outputs.monthlyReturn * 100).toFixed(3)}% · Real return{' '}
              {(outputs.realReturn * 100).toFixed(2)}%
            </p>
          </GlassCard>

          {/* Key numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard padding="md">
              <p className="text-xs uppercase tracking-wider text-gray-500">Projected corpus</p>
              <p className="text-xl font-bold text-white mt-1">
                {formatIndianCurrency(outputs.corpusAtRetirement)}
              </p>
              <p className="text-xs text-gray-500 mt-1">At age {inputs.targetRetirementAge}</p>
            </GlassCard>
            <GlassCard padding="md">
              <p className="text-xs uppercase tracking-wider text-gray-500">Required corpus</p>
              <p className="text-xl font-bold text-white mt-1">
                {formatIndianCurrency(outputs.requiredCorpus)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Withdrawal {(inputs.withdrawalRate * 100).toFixed(1)}% · Net spend{' '}
                {formatIndianCurrency(outputs.netMonthlySpendFuture)}/mo future
              </p>
            </GlassCard>
            <GlassCard padding="md">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Net monthly spend (future)
              </p>
              <p className="text-xl font-bold text-white mt-1">
                {formatIndianCurrency(outputs.netMonthlySpendFuture)}
              </p>
              <p className="text-xs text-gray-500 mt-1">In retirement-year rupees</p>
            </GlassCard>
            <GlassCard padding="md">
              <p className="text-xs uppercase tracking-wider text-gray-500">
                Earliest feasible age
              </p>
              <p className="text-xl font-bold text-white mt-1">
                {outputs.earliestAge ? `${outputs.earliestAge} yrs` : '— (not by 60)'}
              </p>
              <p className="text-xs text-gray-500 mt-1">First age with surplus ≥ 0</p>
            </GlassCard>
            <GlassCard padding="md">
              <p className="text-xs uppercase tracking-wider text-gray-500">Real return</p>
              <p className="text-xl font-bold text-white mt-1">
                {(outputs.realReturn * 100).toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">(1+r)/(1+inf)-1</p>
            </GlassCard>
            <GlassCard padding="md">
              <p className="text-xs uppercase tracking-wider text-gray-500">Safe-asset buffer</p>
              <p className="text-xl font-bold text-white mt-1">
                {formatIndianCurrency(outputs.safeBuffer)}
              </p>
              <p className="text-xs text-gray-500 mt-1">2.5× annual net spend in FD/liquid/debt</p>
            </GlassCard>
          </div>

          {/* Portfolio lifecycle chart */}
          <GlassCard padding="md" className="w-full">
            <h3 className="text-base font-semibold text-white mb-1">Portfolio Lifecycle</h3>
            <p className="text-xs text-gray-500 mb-4">
              Till {inputs.targetRetirementAge}: portfolio + SIPs, expense ={' '}
              {formatIndianCurrency(inputs.monthlyExpenseCurrent)} inflated yearly. After{' '}
              {inputs.targetRetirementAge}: no SIPs, portfolio drains by net withdrawal, expense
              shown as gross {formatIndianCurrency(inputs.monthlySpending)} inflated (freelance not
              subtracted from yellow line). Vertical line = retirement.
            </p>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lifecycle} margin={{ top: 24, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={[inputs.currentAge, 80]}
                    stroke="rgba(255,255,255,0.4)"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#fff' }}
                    tickCount={8}
                    label={{ value: 'Age', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="rgba(255,255,255,0.4)"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#fff' }}
                    tickFormatter={(v: number) => formatIndianCurrency(v)}
                    width={110}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="rgba(255,255,255,0.4)"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#fbbf24' }}
                    tickFormatter={(v: number) => formatIndianCurrency(v)}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(17, 17, 48, 0.9)',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                    formatter={(value: number | undefined, name: string | undefined) => [
                      formatIndianCurrency(Number(value ?? 0)),
                      name?.toLowerCase().includes('expense') ? 'Monthly Expense' : 'Portfolio',
                    ]}
                    labelFormatter={(l) => `Age ${l}`}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <ReferenceLine
                    x={inputs.targetRetirementAge}
                    stroke="rgba(255,255,255,0.35)"
                    strokeDasharray="6 4"
                    label={{
                      value: `Retire ${inputs.targetRetirementAge}`,
                      position: 'insideTop',
                      fill: '#9ca3af',
                      fontSize: 11,
                      dy: 10,
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="portfolio"
                    name="Portfolio"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="monthlyExpense"
                    name="Monthly Expense"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={false}
                    strokeDasharray="4 3"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {lifecycle[lifecycle.length - 1]?.portfolio === 0 && (
              <p className="text-xs text-amber-400 mt-2">
                Portfolio depletes around age {lifecycle.find((p) => p.portfolio === 0)?.age} –
                consider lower spending or later retirement.
              </p>
            )}
          </GlassCard>

          {/* Sensitivity grid */}
          <GlassCard padding="md">
            <h3 className="text-base font-semibold text-white mb-2">
              Sensitivity: Surplus by Return × Inflation
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Green = surplus, red = shortfall. Values in ₹
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 border border-white/[0.06] bg-white/[0.03]">
                      Inflation ↓ / Return →
                    </th>
                    {outputs.sensitivity.returns.map((r) => (
                      <th
                        key={r}
                        className="px-3 py-2 text-center text-xs text-gray-400 border border-white/[0.06] bg-white/[0.03]"
                      >
                        {(r * 100).toFixed(0)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {outputs.sensitivity.inflation.map((inf, i) => (
                    <tr key={inf}>
                      <td className="px-3 py-2 text-xs font-medium text-gray-300 border border-white/[0.06] bg-white/[0.03]">
                        {(inf * 100).toFixed(0)}%
                      </td>
                      {outputs.sensitivity.surpluses[i].map((s, j) => (
                        <td
                          key={j}
                          className={`px-2 py-2 text-center text-xs font-medium border border-white/[0.06] ${
                            s >= 0
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-rose-500/15 text-rose-400'
                          }`}
                          title={formatIndianCurrency(s)}
                        >
                          {s >= 0 ? '+' : ''}
                          {new Intl.NumberFormat('en-IN', {
                            notation: 'compact',
                            maximumFractionDigits: 1,
                          }).format(s)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Stress tests */}
          <GlassCard padding="md">
            <h3 className="text-base font-semibold text-white mb-3">Stress Tests</h3>
            <div className="space-y-2">
              {stress.map((t) => (
                <div
                  key={t.label}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                    t.surplus >= 0
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-sm font-semibold">
                    {t.surplus >= 0 ? '+' : ''}
                    {formatIndianCurrency(t.surplus)}{' '}
                    <span className="text-xs opacity-70">
                      ({t.surplus >= 0 ? 'surplus' : 'shortfall'})
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Each test re-runs the calculation with the modified assumption. Combined = lower
              returns + half freelance + bad final year.
            </p>
          </GlassCard>

          {loadingData && (
            <div className="flex justify-center py-4">
              <PageSpinner text="Loading live data..." />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
