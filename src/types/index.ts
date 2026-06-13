export type MarketGrade = 1 | 2 | 3 | 4;

export interface GradeConfig {
  grade: MarketGrade;
  name: string;
  basePER: number;
  gMultiplier: number;
  marketShareRange: string;
  description: string;
  examples: string[];
  characteristics: string;
  gradientClass: string;
  borderClass: string;
  ringClass: string;
  textAccentClass: string;
}

export const GRADE_CONFIGS: GradeConfig[] = [
  {
    grade: 1,
    name: '압도적 지배자',
    basePER: 18.0,
    gMultiplier: 1.75,
    marketShareRange: '글로벌 시장 점유율 70% 이상',
    description: '대체 불가능한 인프라 독점',
    examples: ['MSFT (클라우드+OS)', 'GOOGL (검색광고)'],
    characteristics: '고객이 떠날 수 없는 락인 구조, 네트워크 효과 극대화',
    gradientClass: 'from-yellow-950/60 to-amber-950/30',
    borderClass: 'border-yellow-600/40',
    ringClass: 'ring-yellow-500',
    textAccentClass: 'text-yellow-400',
  },
  {
    grade: 2,
    name: '강력한 과점 주도자',
    basePER: 17.5,
    gMultiplier: 0.75,
    marketShareRange: '글로벌 시장 점유율 30~70%',
    description: '강력한 생태계 보유',
    examples: ['META (SNS)', 'NVDA (GPU)', 'AAPL (스마트폰)'],
    characteristics: '강한 브랜드력과 네트워크 효과, 진입장벽 높음',
    gradientClass: 'from-blue-950/60 to-cyan-950/30',
    borderClass: 'border-blue-600/40',
    ringClass: 'ring-blue-500',
    textAccentClass: 'text-blue-400',
  },
  {
    grade: 3,
    name: '유력한 경쟁자',
    basePER: 4.5,
    gMultiplier: 0.50,
    marketShareRange: '글로벌 시장 점유율 10~30%',
    description: '자기 영역은 있으나 경쟁 노출',
    examples: ['005930.KS (삼성전자)', 'WDC', 'AMD'],
    characteristics: '업황 사이클에 따라 실적 변동, 경쟁사 압박 상존',
    gradientClass: 'from-green-950/60 to-emerald-950/30',
    borderClass: 'border-green-600/40',
    ringClass: 'ring-green-500',
    textAccentClass: 'text-green-400',
  },
  {
    grade: 4,
    name: '취약한 추격자',
    basePER: 4.0,
    gMultiplier: 1.0,
    marketShareRange: '시장 점유율 10% 미만',
    description: '가격 결정권 부재',
    examples: ['로컬 소형주', '하청 제조업체'],
    characteristics: '원가 상승을 고객에게 전가 불가, 트렌드 변화에 취약',
    gradientClass: 'from-red-950/60 to-rose-950/30',
    borderClass: 'border-red-600/40',
    ringClass: 'ring-red-500',
    textAccentClass: 'text-red-400',
  },
];

export interface StockData {
  ticker: string;
  companyName: string;
  currentPrice: number;
  forwardEPS: number;
  ttmEPS: number;
  marketCap?: number;
  netCashPerShare: number;
  totalCash: number;
  totalDebt: number;
  debtRatio: number;
  revenue: number;
  revenueGrowth: number;
  epsCAGR: number | null;
  epsCAGRYears: number;
  capexGrowth: number | null;
  receivablesGrowth: number | null;
  inventoryGrowth: number | null;
  grossMargin: number;
  operatingMargin: number;
  returnOnEquity: number;
  sharesOutstanding: number;
  currency: string;
  sector: string;
  industry: string;
  exchange: string;
  beta?: number;
}

export const G_CAP_BY_GRADE: Record<MarketGrade, number> = {
  1: 15,
  2: 12,
  3: 10,
  4: 8,
};

export interface IVInputs {
  eps: number;
  basePER: number;
  gMultiplier: number;
  g: number;
  cp: number;
  roeFactor: number;
  y: number;
  df: number;
  netCashPerShare: number;
}

export interface IVResult {
  iv: number;
  currentPrice: number;
  deviation: number;
  isUndervalued: boolean;
  marginOfSafety: number;
  inputs: IVInputs;
  steps: {
    adjustedPER: number;
    step1: number;
    step2: number;
    step3: number;
    step4: number;
  };
}

export interface AISignal {
  type: 'warning' | 'positive';
  title: string;
  description: string;
  metric?: string;
  value?: string;
}
