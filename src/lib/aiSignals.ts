import { StockData, AISignal } from '@/types';

export function generateAISignals(data: StockData): AISignal[] {
  const signals: AISignal[] = [];
  const isKRW = data.currency === 'KRW';
  const billionUnit = isKRW ? 1e12 : 1e9;
  const billionLabel = isKRW ? '조' : 'B';

  // --- Positive signals ---
  if (data.grossMargin > 0.5) {
    signals.push({
      type: 'positive',
      title: '높은 매출총이익률',
      description: `매출총이익률이 ${(data.grossMargin * 100).toFixed(1)}%로 매우 높습니다. 강력한 가격결정력과 경쟁적 해자를 보유하고 있음을 시사합니다.`,
      metric: '매출총이익률',
      value: `${(data.grossMargin * 100).toFixed(1)}%`,
    });
  } else if (data.grossMargin > 0.3) {
    signals.push({
      type: 'positive',
      title: '양호한 매출총이익률',
      description: `매출총이익률 ${(data.grossMargin * 100).toFixed(1)}%는 업계 평균 이상으로 원가 경쟁력이 있습니다.`,
      metric: '매출총이익률',
      value: `${(data.grossMargin * 100).toFixed(1)}%`,
    });
  }

  if (data.totalCash > data.totalDebt) {
    const netCash = (data.totalCash - data.totalDebt) / billionUnit;
    signals.push({
      type: 'positive',
      title: '순현금 보유 기업',
      description: `순현금 ${netCash.toFixed(1)}${billionLabel} 보유로 재무 안정성이 매우 높습니다. 금리 상승기에도 이자 부담이 없으며, 주주 환원 여력이 풍부합니다.`,
      metric: '순현금',
      value: `${netCash.toFixed(1)}${billionLabel}`,
    });
  }

  if (data.revenueGrowth > 0.2) {
    signals.push({
      type: 'positive',
      title: '강한 매출 성장세',
      description: `매출 성장률 ${(data.revenueGrowth * 100).toFixed(1)}%는 시장 평균을 크게 상회합니다. 신규 시장 진출 또는 기존 시장 점유율 확대가 진행 중일 가능성이 높습니다.`,
      metric: '매출 성장률',
      value: `+${(data.revenueGrowth * 100).toFixed(1)}%`,
    });
  } else if (data.revenueGrowth > 0.08) {
    signals.push({
      type: 'positive',
      title: '안정적 매출 성장',
      description: `매출 성장률 ${(data.revenueGrowth * 100).toFixed(1)}%는 성숙한 사업 구조에서 꾸준한 확장이 이루어지고 있음을 보여줍니다.`,
      metric: '매출 성장률',
      value: `+${(data.revenueGrowth * 100).toFixed(1)}%`,
    });
  }

  if (data.operatingMargin > 0.25) {
    signals.push({
      type: 'positive',
      title: '탁월한 영업이익률',
      description: `영업이익률 ${(data.operatingMargin * 100).toFixed(1)}%는 업계 최고 수준입니다. 강력한 운영 레버리지와 규모의 경제가 실현되고 있습니다.`,
      metric: '영업이익률',
      value: `${(data.operatingMargin * 100).toFixed(1)}%`,
    });
  }

  if (data.returnOnEquity > 0.2) {
    signals.push({
      type: 'positive',
      title: '높은 자기자본이익률',
      description: `ROE ${(data.returnOnEquity * 100).toFixed(1)}%는 자본을 매우 효율적으로 활용하고 있음을 의미합니다. Buffett이 선호하는 특성 중 하나입니다.`,
      metric: 'ROE',
      value: `${(data.returnOnEquity * 100).toFixed(1)}%`,
    });
  }

  if (data.debtRatio < 0.2 && data.debtRatio > 0) {
    signals.push({
      type: 'positive',
      title: '낮은 부채 수준',
      description: `부채비율 ${(data.debtRatio * 100).toFixed(0)}%는 매우 보수적인 재무 구조입니다. 경기 침체 시 생존 가능성이 높습니다.`,
      metric: '부채비율',
      value: `${(data.debtRatio * 100).toFixed(0)}%`,
    });
  }

  // --- Warning signals ---
  if (data.forwardEPS <= 0 || data.ttmEPS <= 0) {
    signals.push({
      type: 'warning',
      title: '마이너스 EPS',
      description: '현재 적자 상태입니다. 내재가치 계산의 신뢰도가 낮으며, 턴어라운드 가능성과 현금 소각 속도를 별도로 검토해야 합니다.',
      metric: 'EPS 상태',
      value: '적자',
    });
  }

  if (data.forwardEPS > 0 && data.ttmEPS > 0 && data.forwardEPS < data.ttmEPS * 0.85) {
    signals.push({
      type: 'warning',
      title: '실적 감소 전망',
      description: `Forward EPS(${data.forwardEPS.toFixed(2)})가 TTM EPS(${data.ttmEPS.toFixed(2)}) 대비 낮습니다. 애널리스트들이 실적 하락을 전망하고 있습니다.`,
      metric: 'EPS 추세',
      value: '감소 전망',
    });
  }

  if (data.forwardEPS > 0 && data.ttmEPS > 0 && data.forwardEPS > data.ttmEPS * 1.3) {
    signals.push({
      type: 'warning',
      title: 'Forward EPS 급증 전망',
      description: `Forward EPS(${data.forwardEPS.toFixed(0)})가 TTM EPS(${data.ttmEPS.toFixed(0)}) 대비 ${(((data.forwardEPS / data.ttmEPS) - 1) * 100).toFixed(0)}% 높게 추정되고 있습니다. 업황 사이클의 정점 부근일 가능성이 있으며, 추정치가 실현되지 않을 경우 내재가치가 과대평가될 위험이 있습니다.`,
      metric: 'Forward/TTM EPS 비율',
      value: `${(data.forwardEPS / data.ttmEPS).toFixed(1)}배`,
    });
  }

  if (data.debtRatio > 0.6) {
    signals.push({
      type: 'warning',
      title: '높은 부채비율',
      description: `부채비율 ${(data.debtRatio * 100).toFixed(0)}%는 금리 상승 시 이자 부담이 급증할 수 있습니다. 신용등급 하락 및 차환 리스크를 주시해야 합니다.`,
      metric: '부채비율',
      value: `${(data.debtRatio * 100).toFixed(0)}%`,
    });
  }

  if (data.totalDebt > data.totalCash * 2) {
    const netDebt = (data.totalDebt - data.totalCash) / billionUnit;
    signals.push({
      type: 'warning',
      title: '순부채 포지션',
      description: `순부채 ${netDebt.toFixed(1)}${billionLabel} 상태입니다. 경기 침체 또는 금리 상승 시 유동성 리스크가 발생할 수 있습니다.`,
      metric: '순부채',
      value: `${netDebt.toFixed(1)}${billionLabel}`,
    });
  }

  if (data.revenueGrowth < -0.05) {
    signals.push({
      type: 'warning',
      title: '매출 감소 추세',
      description: `매출이 전년 대비 ${(data.revenueGrowth * 100).toFixed(1)}% 감소했습니다. 시장 축소, 경쟁사 점유율 잠식, 또는 제품 수명주기 하강 국면일 수 있습니다.`,
      metric: '매출 성장률',
      value: `${(data.revenueGrowth * 100).toFixed(1)}%`,
    });
  }

  if (data.operatingMargin < 0.05 && data.operatingMargin >= 0) {
    signals.push({
      type: 'warning',
      title: '낮은 영업이익률',
      description: `영업이익률 ${(data.operatingMargin * 100).toFixed(1)}%는 원가 관리에 어려움이 있음을 시사합니다. 비용 구조 개선 없이는 수익성 회복이 어려울 수 있습니다.`,
      metric: '영업이익률',
      value: `${(data.operatingMargin * 100).toFixed(1)}%`,
    });
  }

  if (data.beta && data.beta > 1.5) {
    signals.push({
      type: 'warning',
      title: '높은 시장 변동성 (베타)',
      description: `베타 ${data.beta.toFixed(2)}는 시장 대비 변동성이 ${((data.beta - 1) * 100).toFixed(0)}% 높음을 의미합니다. 하락장에서 더 큰 손실이 발생할 수 있습니다.`,
      metric: '베타',
      value: data.beta.toFixed(2),
    });
  }

  if (
    data.capexGrowth !== null &&
    data.revenueGrowth > 0 &&
    data.capexGrowth > data.revenueGrowth * 1.5 &&
    data.capexGrowth > 0.1
  ) {
    signals.push({
      type: 'warning',
      title: 'CapEx 급증',
      description: `최근 CapEx가 전년 대비 ${(data.capexGrowth * 100).toFixed(1)}% 증가했습니다. 매출 성장률(${(data.revenueGrowth * 100).toFixed(1)}%) 대비 과도한 투자 집행으로, 단기 FCF 악화 요인이 될 수 있습니다.`,
      metric: 'CapEx 증가율',
      value: `+${(data.capexGrowth * 100).toFixed(1)}%`,
    });
  }

  if (
    data.receivablesGrowth !== null &&
    data.revenueGrowth > 0 &&
    data.receivablesGrowth > data.revenueGrowth * 1.5 &&
    data.receivablesGrowth > 0.1
  ) {
    signals.push({
      type: 'warning',
      title: '매출채권 급증',
      description: `매출채권이 전년 대비 ${(data.receivablesGrowth * 100).toFixed(1)}% 증가하여 매출 성장률(${(data.revenueGrowth * 100).toFixed(1)}%)을 크게 초과했습니다. 매출 인식 시점 또는 고객사 결제 지연 가능성을 점검해야 합니다.`,
      metric: '매출채권 증가율',
      value: `+${(data.receivablesGrowth * 100).toFixed(1)}%`,
    });
  }

  if (
    data.inventoryGrowth !== null &&
    data.revenueGrowth > 0 &&
    data.inventoryGrowth > data.revenueGrowth * 1.5 &&
    data.inventoryGrowth > 0.1
  ) {
    signals.push({
      type: 'warning',
      title: '재고 급증',
      description: `재고가 전년 대비 ${(data.inventoryGrowth * 100).toFixed(1)}% 증가하여 매출 성장률(${(data.revenueGrowth * 100).toFixed(1)}%)을 크게 초과했습니다. 수요 둔화 또는 재고 적체 가능성을 시사할 수 있습니다.`,
      metric: '재고 증가율',
      value: `+${(data.inventoryGrowth * 100).toFixed(1)}%`,
    });
  }

  if (signals.length === 0) {
    signals.push({
      type: 'positive',
      title: '균형 잡힌 재무 구조',
      description: '주요 재무 지표들이 안정적인 범위에 있습니다. 업종 내 경쟁 환경과 장기 성장 동력을 추가로 검토하세요.',
    });
  }

  return signals;
}
