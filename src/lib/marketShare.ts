import { MarketGrade } from '@/types';

export interface MarketShareSegment {
  market: string;       // 시장명
  share: number;        // 점유율 (%)
  scope: string;        // 글로벌 / 북미 / 아시아 등
  note?: string;
}

export interface MarketShareData {
  ticker: string;
  segments: MarketShareSegment[];
  suggestedGrade: MarketGrade;
  gradingReason: string;
  asOf: string;         // 기준 연도
}

// 점유율 데이터 출처: Statcounter, IDC, Gartner, Counterpoint Research 등 공개 리포트 기준
const DB: MarketShareData[] = [
  {
    ticker: 'MSFT',
    segments: [
      { market: 'PC 운영체제 (Windows)', share: 73, scope: '글로벌' },
      { market: '퍼블릭 클라우드 (Azure)', share: 22, scope: '글로벌' },
      { market: '기업 오피스 (M365)', share: 48, scope: '글로벌' },
    ],
    suggestedGrade: 1,
    gradingReason: 'OS·클라우드·오피스 전방위 락인, 엔터프라이즈 전환 비용 극히 높음',
    asOf: '2024',
  },
  {
    ticker: 'GOOGL',
    segments: [
      { market: '검색 엔진', share: 90, scope: '글로벌' },
      { market: '모바일 OS (Android)', share: 72, scope: '글로벌' },
      { market: '퍼블릭 클라우드 (GCP)', share: 11, scope: '글로벌' },
    ],
    suggestedGrade: 1,
    gradingReason: '검색 광고 독점에 가까운 점유율, 안드로이드 생태계 락인',
    asOf: '2024',
  },
  {
    ticker: 'GOOG',
    segments: [
      { market: '검색 엔진', share: 90, scope: '글로벌' },
      { market: '모바일 OS (Android)', share: 72, scope: '글로벌' },
      { market: '퍼블릭 클라우드 (GCP)', share: 11, scope: '글로벌' },
    ],
    suggestedGrade: 1,
    gradingReason: '검색 광고 독점에 가까운 점유율, 안드로이드 생태계 락인',
    asOf: '2024',
  },
  {
    ticker: 'AAPL',
    segments: [
      { market: '스마트폰', share: 17, scope: '글로벌' },
      { market: '스마트폰', share: 55, scope: '북미' },
      { market: '태블릿', share: 36, scope: '글로벌' },
      { market: '스마트워치', share: 30, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: '글로벌 점유율은 17%이나 프리미엄 시장 지배력·생태계 락인 강도가 2등급에 해당',
    asOf: '2024',
  },
  {
    ticker: 'META',
    segments: [
      { market: 'SNS 월간활성이용자 (FB+IG+WA)', share: 60, scope: '글로벌', note: '약 40억 MAU' },
      { market: '디지털 광고', share: 19, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: '소셜미디어 생태계 지배, 광고주 이탈 장벽 높음',
    asOf: '2024',
  },
  {
    ticker: 'NVDA',
    segments: [
      { market: '독립형 GPU (dGPU)', share: 88, scope: '글로벌' },
      { market: 'AI 가속기 (데이터센터 GPU)', share: 70, scope: '글로벌', note: 'H100/H200 기준' },
    ],
    suggestedGrade: 2,
    gradingReason: 'AI 가속기 시장 압도적 지위이나 AMD·인텔 추격 진행 중',
    asOf: '2024',
  },
  {
    ticker: 'AMZN',
    segments: [
      { market: '퍼블릭 클라우드 (AWS)', share: 31, scope: '글로벌' },
      { market: 'e커머스', share: 40, scope: '미국' },
      { market: 'e커머스', share: 6, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: 'AWS 클라우드 1위, 미국 이커머스 압도적 1위',
    asOf: '2024',
  },
  {
    ticker: 'TSM',
    segments: [
      { market: '반도체 위탁생산 (파운드리)', share: 61, scope: '글로벌' },
      { market: '최첨단 공정 (3nm 이하)', share: 90, scope: '글로벌', note: '사실상 독점' },
    ],
    suggestedGrade: 1,
    gradingReason: '최첨단 공정 사실상 독점, 주요 팹리스 모두 TSMC 의존',
    asOf: '2024',
  },
  {
    ticker: '005930.KS',
    segments: [
      { market: 'DRAM', share: 43, scope: '글로벌' },
      { market: 'NAND 플래시', share: 33, scope: '글로벌' },
      { market: '스마트폰', share: 20, scope: '글로벌' },
      { market: 'OLED 패널', share: 40, scope: '글로벌' },
    ],
    suggestedGrade: 3,
    gradingReason: '메모리 과점이지만 업황 사이클 의존도 높고 SK하이닉스·마이크론 경쟁 강함',
    asOf: '2024',
  },
  {
    ticker: 'AMD',
    segments: [
      { market: 'x86 CPU (서버)', share: 24, scope: '글로벌' },
      { market: 'x86 CPU (PC)', share: 22, scope: '글로벌' },
      { market: '독립형 GPU', share: 12, scope: '글로벌' },
    ],
    suggestedGrade: 3,
    gradingReason: '인텔·NVIDIA 대비 추격자 위치, 점유율 확대 중이나 경쟁 압박 지속',
    asOf: '2024',
  },
  {
    ticker: 'INTC',
    segments: [
      { market: 'x86 CPU (PC)', share: 60, scope: '글로벌' },
      { market: 'x86 CPU (서버)', share: 70, scope: '글로벌' },
      { market: '파운드리', share: 1, scope: '글로벌', note: '진입 초기' },
    ],
    suggestedGrade: 3,
    gradingReason: 'CPU 점유율은 높으나 AMD·ARM 추격으로 지위 약화 중, 파운드리 전환 리스크',
    asOf: '2024',
  },
  {
    ticker: 'WDC',
    segments: [
      { market: 'HDD', share: 42, scope: '글로벌' },
      { market: 'NAND 플래시', share: 13, scope: '글로벌' },
    ],
    suggestedGrade: 3,
    gradingReason: 'HDD 과점이지만 시장 자체가 SSD로 전환 중, NAND 점유율 하위권',
    asOf: '2024',
  },
  {
    ticker: 'MU',
    segments: [
      { market: 'DRAM', share: 24, scope: '글로벌' },
      { market: 'NAND 플래시', share: 11, scope: '글로벌' },
    ],
    suggestedGrade: 3,
    gradingReason: '메모리 3위 사업자, 업황 사이클 의존도 높음',
    asOf: '2024',
  },
  {
    ticker: 'QCOM',
    segments: [
      { market: '스마트폰 AP (안드로이드 프리미엄)', share: 55, scope: '글로벌' },
      { market: 'RF 부품', share: 25, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: '안드로이드 프리미엄 AP 시장 지배, 특허 포트폴리오 강력',
    asOf: '2024',
  },
  {
    ticker: 'AVGO',
    segments: [
      { market: 'AI ASIC (커스텀 칩)', share: 35, scope: '글로벌', note: 'Google·Meta TPU/MTIA 공급' },
      { market: '네트워킹 반도체', share: 30, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: '하이퍼스케일러 AI ASIC 핵심 파트너, 네트워킹 반도체 강자',
    asOf: '2024',
  },
  {
    ticker: 'NFLX',
    segments: [
      { market: 'SVOD (구독형 스트리밍)', share: 38, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: '스트리밍 1위이나 디즈니+·아마존프라임 등 경쟁 심화',
    asOf: '2024',
  },
  {
    ticker: 'TSLA',
    segments: [
      { market: '전기차 (BEV)', share: 16, scope: '글로벌' },
      { market: '전기차 (BEV)', share: 49, scope: '미국' },
    ],
    suggestedGrade: 2,
    gradingReason: '브랜드 파워·소프트웨어 우위이나 BYD 등 중국산 추격으로 글로벌 점유율 하락 중',
    asOf: '2024',
  },
  {
    ticker: 'V',
    segments: [
      { market: '카드 결제 네트워크', share: 40, scope: '글로벌' },
    ],
    suggestedGrade: 1,
    gradingReason: '비자/마스터카드 양강 구도, 전환 비용 극히 높은 인프라 독점',
    asOf: '2024',
  },
  {
    ticker: 'MA',
    segments: [
      { market: '카드 결제 네트워크', share: 32, scope: '글로벌' },
    ],
    suggestedGrade: 1,
    gradingReason: '비자/마스터카드 양강 구도, 네트워크 효과 극대화',
    asOf: '2024',
  },
  {
    ticker: 'ASML',
    segments: [
      { market: 'EUV 리소그래피 장비', share: 100, scope: '글로벌', note: '전세계 유일 공급사' },
      { market: '반도체 리소그래피 장비 전체', share: 90, scope: '글로벌' },
    ],
    suggestedGrade: 1,
    gradingReason: 'EUV 장비 전세계 유일 공급사, 대체 불가능한 기술 독점',
    asOf: '2024',
  },
  {
    ticker: 'CRM',
    segments: [
      { market: 'CRM 소프트웨어', share: 22, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: 'CRM 시장 1위이나 SAP·Oracle·HubSpot 경쟁',
    asOf: '2024',
  },
  {
    ticker: 'ORCL',
    segments: [
      { market: '엔터프라이즈 DB', share: 30, scope: '글로벌' },
      { market: 'ERP (NetSuite 포함)', share: 10, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: '레거시 DB 강력한 락인, 클라우드 전환으로 재성장 중',
    asOf: '2024',
  },
  {
    ticker: 'NOW',
    segments: [
      { market: 'ITSM 소프트웨어', share: 42, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: 'IT 서비스 관리 압도적 1위, 엔터프라이즈 워크플로우 락인',
    asOf: '2024',
  },
];

export function getMarketShare(ticker: string): MarketShareData | null {
  const upper = ticker.toUpperCase();
  return DB.find((d) => d.ticker.toUpperCase() === upper) ?? null;
}
