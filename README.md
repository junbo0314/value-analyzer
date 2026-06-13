# value-analyzer
This is the value-analyzer model based on Benjamin Graham formula. But refined modernly.

I built a Graham-Dodd intrinsic value calculator with backtested parameters

  Tired of using arbitrary P/E multiples, so I built a web app that calculates
  intrinsic value using the Graham-Dodd formula, calibrated against 10 years of
  S&P 500 data (319 stocks, 2010-2026).
  
  Key features:
  • Real-time data from Yahoo Finance (no API key needed)
  • 4-tier moat grading system (affects BasePER and growth multiplier)
  • ROE_Factor, competitive premium (CP), debt penalty (DF) multipliers
  • Backtested: Q5 (most undervalued) avg 1y return +21.4% vs Q1 +13.0%

  Happy to discuss the methodology or take feedback on the formula.
