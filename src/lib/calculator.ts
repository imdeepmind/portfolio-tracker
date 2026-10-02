export interface CalculatorInputs {
  currentAge: number;
  targetRetirementAge: number;
  currentPortfolio: number;
  monthlyInvestment: number;
  stepUp: number; // 0 - 0.25
  expectedReturn: number; // 0.03 - 0.15
  inflation: number; // 0.02 - 0.10
  monthlySpending: number; // post-retirement spending in today's money (e.g. 50k)
  monthlyExpenseCurrent: number; // pre-retirement monthly expense in today's money (e.g. 80k)
  monthlyFreelance: number;
  withdrawalRate: number; // 0.03 - 0.05
  excludeEPF: boolean;
  excludeEmergency: boolean;
  freelanceDelayYears: number;
}

export interface ChartPoint {
  age: number;
  projected: number;
  required: number;
}

export interface CalculatorOutputs {
  yearsToRetirement: number;
  monthlyReturn: number;
  corpusAtRetirement: number;
  netMonthlySpendFuture: number;
  requiredCorpus: number;
  surplus: number;
  realReturn: number;
  earliestAge: number | null;
  safeBuffer: number;
  verdict: 'on track' | 'close' | 'short';
  chartData: ChartPoint[];
  sensitivity: { inflation: number[]; returns: number[]; surpluses: number[][] };
  freelanceCoversSpending: boolean;
}

export const EPF_AMOUNT = 597000;
export const EMERGENCY_AMOUNT = 560000;

export function monthlyReturnFromAnnual(r: number): number {
  return Math.pow(1 + r, 1 / 12) - 1;
}

export function realReturnNominal(r: number, inflation: number): number {
  return (1 + r) / (1 + inflation) - 1;
}

export function simulateCorpus(inputs: CalculatorInputs, targetAge: number): number {
  const n = Math.max(0, targetAge - inputs.currentAge);
  const i = monthlyReturnFromAnnual(inputs.expectedReturn);

  let corpus =
    inputs.currentPortfolio -
    (inputs.excludeEPF ? EPF_AMOUNT : 0) -
    (inputs.excludeEmergency ? EMERGENCY_AMOUNT : 0);
  if (corpus < 0) corpus = 0;

  let contribution = inputs.monthlyInvestment;
  const totalMonths = n * 12;

  for (let month = 1; month <= totalMonths; month++) {
    corpus = corpus * (1 + i) + contribution;
    if (month % 12 === 0) {
      contribution = contribution * (1 + inputs.stepUp);
    }
  }

  return corpus;
}

export function netMonthlySpendFuture(
  inputs: CalculatorInputs,
  yearsToRetirement: number,
  freelanceEffective?: number
): number {
  const freelance = freelanceEffective !== undefined ? freelanceEffective : inputs.monthlyFreelance;
  const netToday = inputs.monthlySpending - freelance;
  if (netToday <= 0) return 0;
  return netToday * Math.pow(1 + inputs.inflation, yearsToRetirement);
}

export function grossMonthlyExpense(
  inputs: CalculatorInputs,
  yearsSinceStart: number,
  isRetirement: boolean
): number {
  // Gross expense without subtracting freelance – for yellow line only
  if (isRetirement) {
    if (inputs.monthlySpending <= 0) return 0;
    return inputs.monthlySpending * Math.pow(1 + inputs.inflation, yearsSinceStart);
  }
  if (inputs.monthlyExpenseCurrent <= 0) return 0;
  return inputs.monthlyExpenseCurrent * Math.pow(1 + inputs.inflation, yearsSinceStart);
}

export function requiredCorpusForSpend(netMonthlyFuture: number, withdrawalRate: number): number {
  if (netMonthlyFuture <= 0) return 0;
  const rate = withdrawalRate <= 0 ? 0.001 : withdrawalRate;
  return (netMonthlyFuture * 12) / rate;
}

export function calculateOutputs(inputs: CalculatorInputs): CalculatorOutputs {
  const yearsToRetirement = Math.max(0, inputs.targetRetirementAge - inputs.currentAge);
  const monthlyReturn = monthlyReturnFromAnnual(inputs.expectedReturn);
  const realReturn = realReturnNominal(inputs.expectedReturn, inputs.inflation);

  const corpusAtRetirement = simulateCorpus(inputs, inputs.targetRetirementAge);

  const freelanceForRequired = inputs.freelanceDelayYears > 0 ? 0 : inputs.monthlyFreelance;
  const netMonthlySpendFutureVal = netMonthlySpendFuture(
    inputs,
    yearsToRetirement,
    freelanceForRequired
  );
  const requiredCorpus = requiredCorpusForSpend(netMonthlySpendFutureVal, inputs.withdrawalRate);
  const surplus = corpusAtRetirement - requiredCorpus;

  const freelanceCoversSpending =
    inputs.monthlySpending <= inputs.monthlyFreelance && inputs.monthlySpending > 0;

  // Verdict
  let verdict: CalculatorOutputs['verdict'] = 'short';
  if (surplus >= 0) verdict = 'on track';
  else if (requiredCorpus > 0 && surplus >= -0.15 * requiredCorpus) verdict = 'close';
  else verdict = 'short';

  // Earliest feasible age
  let earliestAge: number | null = null;
  const chartData: ChartPoint[] = [];
  for (let age = inputs.currentAge + 1; age <= 60; age++) {
    const proj = simulateCorpus(inputs, age);
    const n = age - inputs.currentAge;
    const net = netMonthlySpendFuture(inputs, n, freelanceForRequired);
    const req = requiredCorpusForSpend(net, inputs.withdrawalRate);
    chartData.push({ age, projected: proj, required: req });
    if (earliestAge === null && proj - req >= 0) {
      earliestAge = age;
    }
  }

  // Safe buffer
  const safeBuffer = 2.5 * netMonthlySpendFutureVal * 12;

  // Sensitivity grid: returns 6-12% (7 values), inflation 4-7% (4 values)
  const returnValues = [0.06, 0.07, 0.08, 0.09, 0.1, 0.11, 0.12];
  const inflationValues = [0.04, 0.05, 0.06, 0.07];
  const surpluses: number[][] = [];

  for (const inf of inflationValues) {
    const row: number[] = [];
    for (const ret of returnValues) {
      const tempInputs = { ...inputs, expectedReturn: ret, inflation: inf };
      const proj = simulateCorpus(tempInputs, inputs.targetRetirementAge);
      const n = yearsToRetirement;
      const freelanceEff = tempInputs.freelanceDelayYears > 0 ? 0 : tempInputs.monthlyFreelance;
      const net = netMonthlySpendFuture(tempInputs, n, freelanceEff);
      const req = requiredCorpusForSpend(net, tempInputs.withdrawalRate);
      row.push(proj - req);
    }
    surpluses.push(row);
  }

  return {
    yearsToRetirement,
    monthlyReturn,
    corpusAtRetirement,
    netMonthlySpendFuture: netMonthlySpendFutureVal,
    requiredCorpus,
    surplus,
    realReturn,
    earliestAge,
    safeBuffer,
    verdict,
    chartData,
    sensitivity: {
      inflation: inflationValues,
      returns: returnValues,
      surpluses,
    },
    freelanceCoversSpending,
  };
}

export interface StressTestResult {
  label: string;
  surplus: number;
  corpus: number;
  required: number;
}

export function runStressTests(inputs: CalculatorInputs): StressTestResult[] {
  const base = calculateOutputs(inputs);
  const baseRequired = base.requiredCorpus;

  // 1. Flat savings
  const flatInputs = { ...inputs, stepUp: 0 };
  const flatCorpus = simulateCorpus(flatInputs, inputs.targetRetirementAge);
  const freelanceForRequired = inputs.freelanceDelayYears > 0 ? 0 : inputs.monthlyFreelance;
  const netFlat = netMonthlySpendFuture(flatInputs, base.yearsToRetirement, freelanceForRequired);
  const reqFlat = requiredCorpusForSpend(netFlat, flatInputs.withdrawalRate);

  // 2. Lower returns -2pp
  const lowerInputs = { ...inputs, expectedReturn: Math.max(0, inputs.expectedReturn - 0.02) };
  const lowerCorpus = simulateCorpus(lowerInputs, inputs.targetRetirementAge);
  const netLower = netMonthlySpendFuture(
    lowerInputs,
    base.yearsToRetirement,
    lowerInputs.freelanceDelayYears > 0 ? 0 : lowerInputs.monthlyFreelance
  );
  const reqLower = requiredCorpusForSpend(netLower, lowerInputs.withdrawalRate);

  // 3. Freelance at 50%
  const halfFreelanceInputs = { ...inputs, monthlyFreelance: inputs.monthlyFreelance * 0.5 };
  const halfFreelanceEffective =
    halfFreelanceInputs.freelanceDelayYears > 0 ? 0 : halfFreelanceInputs.monthlyFreelance;
  const halfNet = netMonthlySpendFuture(
    halfFreelanceInputs,
    base.yearsToRetirement,
    halfFreelanceEffective
  );
  const reqHalf = requiredCorpusForSpend(halfNet, halfFreelanceInputs.withdrawalRate);
  const corpusHalf = simulateCorpus(halfFreelanceInputs, inputs.targetRetirementAge);

  // 4. Bad final year -25%
  const badFinalCorpus = base.corpusAtRetirement * 0.75;

  // 5. Combined: lower returns + half freelance + bad final year
  const combinedInputs = {
    ...lowerInputs,
    monthlyFreelance: inputs.monthlyFreelance * 0.5,
  };
  const combinedNet = netMonthlySpendFuture(
    combinedInputs,
    base.yearsToRetirement,
    combinedInputs.freelanceDelayYears > 0 ? 0 : combinedInputs.monthlyFreelance
  );
  const reqCombined = requiredCorpusForSpend(combinedNet, combinedInputs.withdrawalRate);
  const combinedCorpusRaw = simulateCorpus(combinedInputs, inputs.targetRetirementAge);
  const combinedCorpus = combinedCorpusRaw * 0.75;

  return [
    {
      label: 'Flat savings (step-up 0%)',
      surplus: flatCorpus - reqFlat,
      corpus: flatCorpus,
      required: reqFlat,
    },
    {
      label: 'Lower returns (-2 pp)',
      surplus: lowerCorpus - reqLower,
      corpus: lowerCorpus,
      required: reqLower,
    },
    {
      label: 'Freelance at 50%',
      surplus: corpusHalf - reqHalf,
      corpus: corpusHalf,
      required: reqHalf,
    },
    {
      label: 'Bad final year (-25% corpus)',
      surplus: badFinalCorpus - baseRequired,
      corpus: badFinalCorpus,
      required: baseRequired,
    },
    {
      label: 'Combined (2+3+4)',
      surplus: combinedCorpus - reqCombined,
      corpus: combinedCorpus,
      required: reqCombined,
    },
  ];
}

export interface LifecyclePoint {
  age: number;
  month: number;
  portfolio: number;
  monthlyExpense: number;
  phase: 'accumulation' | 'retirement';
}

export function simulateLifecycle(inputs: CalculatorInputs, untilAge = 80): LifecyclePoint[] {
  const i = monthlyReturnFromAnnual(inputs.expectedReturn);
  const nRetireMonths = Math.max(0, (inputs.targetRetirementAge - inputs.currentAge) * 12);
  const totalMonths = Math.max(0, (untilAge - inputs.currentAge) * 12);

  let corpus =
    inputs.currentPortfolio -
    (inputs.excludeEPF ? EPF_AMOUNT : 0) -
    (inputs.excludeEmergency ? EMERGENCY_AMOUNT : 0);
  if (corpus < 0) corpus = 0;
  if (untilAge <= inputs.currentAge)
    return [
      {
        age: inputs.currentAge,
        month: 0,
        portfolio: corpus,
        monthlyExpense: inputs.monthlyExpenseCurrent,
        phase: 'accumulation',
      },
    ];

  let contribution = inputs.monthlyInvestment;

  const points: LifecyclePoint[] = [];
  // initial point at current age
  points.push({
    age: inputs.currentAge,
    month: 0,
    portfolio: corpus,
    monthlyExpense: inputs.monthlyExpenseCurrent,
    phase: 'accumulation',
  });

  for (let month = 1; month <= totalMonths; month++) {
    const ageExact = inputs.currentAge + month / 12;
    // yearly step-up for contribution (only during accumulation)
    const isAccumulation = month <= nRetireMonths;

    if (isAccumulation) {
      corpus = corpus * (1 + i) + contribution;
    } else {
      // retirement phase: no contribution, subtract net spend (expense - freelance)
      const monthsSinceRetire = month - nRetireMonths;
      const yearsSinceRetire = Math.floor((monthsSinceRetire - 1) / 12);
      const totalYearsAtThisMonth =
        inputs.targetRetirementAge - inputs.currentAge + yearsSinceRetire;
      const yearsPostRetire = Math.floor((monthsSinceRetire - 1) / 12);
      const freelanceEff =
        inputs.freelanceDelayYears > yearsPostRetire ? 0 : inputs.monthlyFreelance;
      const netMonthly = netMonthlySpendFuture(inputs, totalYearsAtThisMonth, freelanceEff);
      corpus = corpus * (1 + i) - netMonthly;
      if (corpus < 0) corpus = 0;
    }

    // Apply step-up at end of each year during accumulation only
    if (month % 12 === 0 && month <= nRetireMonths) {
      contribution = contribution * (1 + inputs.stepUp);
    }

    // Push yearly points (every 12 months) for clean chart, plus final month
    if (month % 12 === 0 || month === totalMonths) {
      const age = Math.round(ageExact * 10) / 10;
      const yearsSinceStart = Math.floor((month - 1) / 12);
      // monthly expense for this point: pre-retirement = inflated spending, post-retirement = net spend
      let monthlyExpense: number;
      if (isAccumulation) {
        const totalYearsAtThisPoint = Math.floor((month - 1) / 12);
        monthlyExpense =
          inputs.monthlyExpenseCurrent * Math.pow(1 + inputs.inflation, totalYearsAtThisPoint);
      } else {
        const monthsSinceRetire = month - nRetireMonths;
        const yearsSinceRetire = Math.floor((monthsSinceRetire - 1) / 12);
        const totalYearsAtThisPoint =
          inputs.targetRetirementAge - inputs.currentAge + yearsSinceRetire;
        // Yellow line: gross expense only, no freelance subtraction
        monthlyExpense = grossMonthlyExpense(inputs, totalYearsAtThisPoint, true);
      }
      // keep expense non-negative
      if (monthlyExpense < 0) monthlyExpense = 0;

      points.push({
        age,
        month,
        portfolio: corpus,
        monthlyExpense,
        phase: isAccumulation ? 'accumulation' : 'retirement',
      });
      if (corpus <= 0 && month > nRetireMonths) {
        // fill remaining years with 0 portfolio but still show expense
        const remainingYears = untilAge - age;
        for (let y = 1; y <= remainingYears; y++) {
          const futureTotalYears =
            inputs.targetRetirementAge - inputs.currentAge + yearsSinceStart + y;
          let futureExpense: number;
          if (futureTotalYears < inputs.targetRetirementAge - inputs.currentAge) {
            futureExpense =
              inputs.monthlyExpenseCurrent * Math.pow(1 + inputs.inflation, yearsSinceStart + y);
          } else {
            futureExpense = grossMonthlyExpense(inputs, futureTotalYears, true);
          }
          points.push({
            age: age + y,
            month: month + y * 12,
            portfolio: 0,
            monthlyExpense: futureExpense,
            phase: 'retirement',
          });
        }
        break;
      }
    }
  }

  return points;
}

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatIndianNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(amount);
}
