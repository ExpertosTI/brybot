import React from 'react';

export const MarketTickerMarquee: React.FC = () => {
  const tickers = [
    { sym: 'NASDAQ (NQ)', val: '19,754.50', chg: '+0.42%', isPos: true },
    { sym: 'S&P 500 (ES)', val: '5,524.25', chg: '+0.31%', isPos: true },
    { sym: 'DOW (YM)', val: '40,180.00', chg: '+0.15%', isPos: true },
    { sym: 'US DOLLAR (DXY)', val: '101.42', chg: '-0.14%', isPos: false },
    { sym: 'VOLATILITY (VIX)', val: '14.85', chg: '-3.20%', isPos: false },
    { sym: 'GOLD (GC)', val: '$2,642.50', chg: '+0.68%', isPos: true },
    { sym: 'CRUDE OIL (CL)', val: '$74.80', chg: '+0.45%', isPos: true },
    { sym: 'BITCOIN (BTC)', val: '$65,580.00', chg: '+2.10%', isPos: true },
  ];

  return (
    <div className="market-ticker-marquee-bar">
      <div className="marquee-content-track">
        {tickers.concat(tickers).map((t, idx) => (
          <div key={idx} className="marquee-ticker-item">
            <span className="marquee-sym">{t.sym}</span>
            <span className="marquee-val">{t.val}</span>
            <span className={`marquee-chg ${t.isPos ? 'pos' : 'neg'}`}>{t.chg}</span>
            <span className="marquee-sep">&bull;</span>
          </div>
        ))}
      </div>
    </div>
  );
};
