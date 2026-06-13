import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface MarketAverageData {
  computedAt: string;
  sampleSize: number;
  averageIVtoPrice: number;
  medianIVtoPrice: number;
  aaaRate: number;
  stale?: boolean;
}

const DATA_PATH = path.join(process.cwd(), 'data', 'marketAverage.json');
const STALE_DAYS = 7;

export async function GET() {
  try {
    if (!fs.existsSync(DATA_PATH)) {
      return NextResponse.json(
        { error: 'marketAverage.json 없음. npm run compute-market-avg 실행 필요.' },
        { status: 404 }
      );
    }

    const raw  = fs.readFileSync(DATA_PATH, 'utf-8');
    const data = JSON.parse(raw) as MarketAverageData;

    const computedAt  = new Date(data.computedAt);
    const daysSince   = (Date.now() - computedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > STALE_DAYS) {
      data.stale = true;
    }

    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
