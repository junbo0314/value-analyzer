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
  asOf: string;         // 기준 시점 (연도/분기 등 표시용 전체 문자열)
}

// 점유율 데이터 출처: Statcounter, IDC, Gartner, Counterpoint Research, TrendForce,
// Synergy Research, Jon Peddie Research, eMarketer, Mercury Research 등 공개 리포트 기준.
// ※ 점유율은 실시간 API가 없는 비정기 발표 데이터라 "자동 최신화"가 불가능합니다.
//    분기/연간 리포트가 새로 나올 때마다 수치를 다시 조사해 갱신해야 합니다 (마지막 갱신: 2026-06).
const DB: MarketShareData[] = [
  {
    ticker: 'MSFT',
    segments: [
      { market: 'PC 운영체제 (Windows)', share: 67, scope: '글로벌', note: 'Statcounter 데스크톱 기준' },
      { market: '퍼블릭 클라우드 (Azure)', share: 21, scope: '글로벌', note: 'Synergy Research' },
      { market: '기업 오피스 (M365)', share: 45, scope: '글로벌', note: '엔터프라이즈 세그먼트는 약 58%' },
    ],
    suggestedGrade: 1,
    gradingReason: 'OS·클라우드·오피스 전방위 락인, 엔터프라이즈 전환 비용 극히 높음',
    asOf: '2026년 1분기',
  },
  {
    ticker: 'GOOGL',
    segments: [
      { market: '검색 엔진', share: 90, scope: '글로벌' },
      { market: '모바일 OS (Android)', share: 70, scope: '글로벌' },
      { market: '퍼블릭 클라우드 (GCP)', share: 14, scope: '글로벌', note: 'Synergy Research' },
    ],
    suggestedGrade: 1,
    gradingReason: '검색 광고 독점에 가까운 점유율, 안드로이드 생태계 락인',
    asOf: '2026년 1분기',
  },
  {
    ticker: 'GOOG',
    segments: [
      { market: '검색 엔진', share: 90, scope: '글로벌' },
      { market: '모바일 OS (Android)', share: 70, scope: '글로벌' },
      { market: '퍼블릭 클라우드 (GCP)', share: 14, scope: '글로벌', note: 'Synergy Research' },
    ],
    suggestedGrade: 1,
    gradingReason: '검색 광고 독점에 가까운 점유율, 안드로이드 생태계 락인',
    asOf: '2026년 1분기',
  },
  {
    ticker: 'AAPL',
    segments: [
      { market: '스마트폰', share: 20, scope: '글로벌', note: 'Counterpoint, 연간 1위' },
      { market: '스마트폰', share: 69, scope: '미국', note: '역대 최고치' },
      { market: '태블릿', share: 45, scope: '글로벌' },
      { market: '스마트워치', share: 23, scope: '글로벌', note: '연간 평균, 4분기는 32%' },
    ],
    suggestedGrade: 2,
    gradingReason: '글로벌 스마트폰 점유율이 20%로 상승했고 미국에서는 69%에 달하는 압도적 지배력, 프리미엄 생태계 락인 강도가 2등급에 해당',
    asOf: '2025년 4분기',
  },
  {
    ticker: 'META',
    segments: [
      { market: 'SNS 월간활성이용자 (FB+IG+WA)', share: 60, scope: '글로벌', note: '약 38~40억 Family MAU' },
      { market: '디지털 광고', share: 23, scope: '글로벌', note: '2026년 27%로 구글 추월 전망(eMarketer)' },
    ],
    suggestedGrade: 2,
    gradingReason: '소셜미디어 생태계 지배, 광고주 이탈 장벽 높음, 디지털 광고 점유율도 구글을 추월할 전망',
    asOf: '2025년',
  },
  {
    ticker: 'NVDA',
    segments: [
      { market: '독립형 GPU (dGPU)', share: 94, scope: '글로벌', note: 'Jon Peddie Research' },
      { market: 'AI 가속기 (데이터센터 GPU)', share: 85, scope: '글로벌', note: '하이퍼스케일러 자체 ASIC 확산으로 점진적 하락 추세' },
    ],
    suggestedGrade: 2,
    gradingReason: 'AI 가속기·dGPU 모두 압도적 지위 유지하나 구글 TPU·아마존 Trainium 등 자체 칩 확산이 장기 리스크',
    asOf: '2025년 4분기',
  },
  {
    ticker: 'AMZN',
    segments: [
      { market: '퍼블릭 클라우드 (AWS)', share: 28, scope: '글로벌', note: 'Synergy Research' },
      { market: 'e커머스', share: 41, scope: '미국' },
      { market: 'e커머스', share: 22, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: 'AWS 클라우드 1위, 미국 이커머스 압도적 1위',
    asOf: '2026년 1분기',
  },
  {
    ticker: 'TSM',
    segments: [
      { market: '반도체 위탁생산 (파운드리)', share: 71, scope: '글로벌', note: 'TrendForce' },
      { market: '최첨단 공정 (3nm 이하)', share: 90, scope: '글로벌', note: '사실상 독점' },
    ],
    suggestedGrade: 1,
    gradingReason: '최첨단 공정 사실상 독점, 주요 팹리스 모두 TSMC 의존, 파운드리 점유율도 지속 확대 중',
    asOf: '2025년 3분기',
  },
  {
    ticker: '005930.KS',
    segments: [
      { market: 'DRAM', share: 36, scope: '글로벌', note: 'TrendForce, 4분기에 1위 재탈환' },
      { market: 'NAND 플래시', share: 32, scope: '글로벌' },
      { market: '스마트폰', share: 19, scope: '글로벌', note: 'Counterpoint, 연간 2위' },
      { market: 'OLED 패널', share: 41, scope: '글로벌', note: 'Samsung Display, 매출 기준' },
    ],
    suggestedGrade: 3,
    gradingReason: '메모리 업황 회복으로 DRAM 1위 재탈환했지만 업황 사이클 의존도 높고 SK하이닉스·마이크론 경쟁 강함',
    asOf: '2025년 4분기',
  },
  {
    ticker: 'AMD',
    segments: [
      { market: 'x86 CPU (서버)', share: 29, scope: '글로벌', note: 'Mercury Research, 매출 기준은 41%' },
      { market: 'x86 CPU (데스크톱)', share: 34, scope: '글로벌' },
      { market: '독립형 GPU', share: 5, scope: '글로벌', note: 'NVIDIA 독점 심화로 하락' },
    ],
    suggestedGrade: 3,
    gradingReason: '서버·데스크톱 CPU 점유율은 지속 확대 중이나 독립형 GPU는 NVIDIA 독점 심화로 하락, 여전히 추격자 위치',
    asOf: '2025년 4분기',
  },
  {
    ticker: 'INTC',
    segments: [
      { market: 'x86 CPU (데스크톱)', share: 66, scope: '글로벌' },
      { market: 'x86 CPU (서버)', share: 71, scope: '글로벌', note: 'Mercury Research, 단위 기준' },
      { market: '파운드리', share: 6, scope: '글로벌', note: '18A 공정 양산 확대 중' },
    ],
    suggestedGrade: 3,
    gradingReason: 'CPU 점유율은 여전히 높으나 AMD에 서버·데스크톱 모두 잠식 지속, 파운드리는 6%로 확대됐으나 여전히 초기 단계',
    asOf: '2025년 4분기',
  },
  {
    ticker: 'WDC',
    segments: [
      { market: 'HDD', share: 42, scope: '글로벌', note: 'Seagate 40%, Toshiba 18%와 경쟁' },
    ],
    suggestedGrade: 3,
    gradingReason: '2025년 2월 낸드 사업을 SanDisk로 분사하며 순수 HDD 기업으로 전환, HDD 시장 1~2위 경쟁 지속이나 SSD 전환 리스크 상존',
    asOf: '2025년 1분기',
  },
  {
    ticker: 'MU',
    segments: [
      { market: 'DRAM', share: 26, scope: '글로벌', note: 'TrendForce' },
      { market: 'NAND 플래시', share: 11, scope: '글로벌', note: 'Kioxia·SanDisk에 밀려 순위 하락' },
    ],
    suggestedGrade: 3,
    gradingReason: '메모리 3위 사업자로 DRAM 점유율은 확대 중이나 낸드는 경쟁사에 밀려 순위 하락, 업황 사이클 의존도 높음',
    asOf: '2025년 3분기',
  },
  {
    ticker: 'QCOM',
    segments: [
      { market: '스마트폰 AP (5G 플래그십)', share: 62, scope: '글로벌', note: '프리미엄 안드로이드 5G 기준' },
      { market: 'RF 부품', share: 21, scope: '글로벌', note: 'Yole Group' },
    ],
    suggestedGrade: 2,
    gradingReason: '안드로이드 프리미엄 AP 시장 지배, 특허 포트폴리오 강력',
    asOf: '2025년',
  },
  {
    ticker: 'AVGO',
    segments: [
      { market: 'AI ASIC (커스텀 칩 설계)', share: 70, scope: '글로벌', note: 'Google TPU·Meta MTIA 등 설계 지원, Marvell과 양강' },
      { market: '네트워킹 반도체 (이더넷 스위치)', share: 55, scope: '글로벌', note: 'AI 데이터센터向 스위칭은 약 80%' },
    ],
    suggestedGrade: 2,
    gradingReason: '하이퍼스케일러 AI ASIC 핵심 파트너, 네트워킹 반도체 강자',
    asOf: '2025년',
  },
  {
    ticker: 'NFLX',
    segments: [
      { market: 'SVOD (구독형 스트리밍)', share: 40, scope: '글로벌', note: '가입자 수 기준' },
    ],
    suggestedGrade: 2,
    gradingReason: '스트리밍 1위이나 디즈니+·아마존프라임 등 경쟁 심화, 워너브라더스 인수 추진 중',
    asOf: '2025년',
  },
  {
    ticker: 'TSLA',
    segments: [
      { market: '전기차 (BEV)', share: 9, scope: '글로벌', note: 'BYD(12%)에 글로벌 1위 내줌' },
      { market: '전기차 (BEV)', share: 44, scope: '미국' },
    ],
    suggestedGrade: 2,
    gradingReason: '2025년 BYD에 글로벌 BEV 1위를 내주며 점유율이 한 자릿수까지 하락했으나 미국 시장에서는 여전히 압도적 1위 유지',
    asOf: '2025년',
  },
  {
    ticker: 'V',
    segments: [
      { market: '카드 결제 네트워크 (신용카드 기준)', share: 52, scope: '글로벌', note: 'Nilson Report' },
    ],
    suggestedGrade: 1,
    gradingReason: '비자/마스터카드 양강 구도, 전환 비용 극히 높은 인프라 독점',
    asOf: '2025년',
  },
  {
    ticker: 'MA',
    segments: [
      { market: '카드 결제 네트워크 (신용카드 기준)', share: 22, scope: '글로벌', note: 'Nilson Report' },
    ],
    suggestedGrade: 1,
    gradingReason: '비자/마스터카드 양강 구도, 네트워크 효과 극대화',
    asOf: '2025년',
  },
  {
    ticker: 'ASML',
    segments: [
      { market: 'EUV 리소그래피 장비', share: 100, scope: '글로벌', note: '전세계 유일 공급사' },
      { market: '반도체 리소그래피 장비 전체', share: 90, scope: '글로벌' },
    ],
    suggestedGrade: 1,
    gradingReason: 'EUV 장비 전세계 유일 공급사, 대체 불가능한 기술 독점',
    asOf: '2025년',
  },
  {
    ticker: 'CRM',
    segments: [
      { market: 'CRM 소프트웨어', share: 21, scope: '글로벌', note: 'IDC, 12년 연속 1위' },
    ],
    suggestedGrade: 2,
    gradingReason: 'CRM 시장 1위이나 SAP·Oracle·HubSpot 경쟁',
    asOf: '2025년 (2024년 실적 기준)',
  },
  {
    ticker: 'ORCL',
    segments: [
      { market: '엔터프라이즈 DB', share: 30, scope: '글로벌' },
      { market: 'ERP (NetSuite 포함)', share: 12, scope: '글로벌', note: 'SAP(22%)에 이어 2위' },
    ],
    suggestedGrade: 2,
    gradingReason: '레거시 DB 강력한 락인, 클라우드 전환으로 재성장 중',
    asOf: '2025년',
  },
  {
    ticker: 'NOW',
    segments: [
      { market: 'ITSM 소프트웨어', share: 44, scope: '글로벌' },
    ],
    suggestedGrade: 2,
    gradingReason: 'IT 서비스 관리 압도적 1위, 엔터프라이즈 워크플로우 락인',
    asOf: '2025년 (2024년 실적 기준)',
  },
];

export function getMarketShare(ticker: string): MarketShareData | null {
  const upper = ticker.toUpperCase();
  return DB.find((d) => d.ticker.toUpperCase() === upper) ?? null;
}
