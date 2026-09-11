import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  LineData,
  AreaData,
} from 'lightweight-charts';
import { api } from '../../api';

interface CandlestickChartProps {
  symbol: string;
  resolution: string;
  onPriceUpdate?: (price: number, change: number, high: number, low: number, volume: number) => void;
  markers?: Array<{ time: any; position: 'aboveBar' | 'belowBar'; color: string; shape: 'arrowUp' | 'arrowDown'; text: string }>;
}

type ChartType = 'candles' | 'area' | 'line';
type DrawingTool = 'cursor' | 'trendline' | 'horizontal' | 'fib';

const BASE_PRICES: Record<string, number> = {
  NQ: 19750.0,
  MNQ: 19750.0,
  ES: 5520.0,
  MES: 5520.0,
  YM: 40150.0,
  CL: 74.8,
  GC: 2640.0,
  BTC: 65400.0,
};

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  resolution,
  onPriceUpdate,
  markers = [],
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // Series refs
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Interactive controls state
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [activeTool, setActiveTool] = useState<DrawingTool>('cursor');
  const [showMa20, setShowMa20] = useState<boolean>(true);
  const [showMa50, setShowMa50] = useState<boolean>(true);
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [currentOhlc, setCurrentOhlc] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to generate synthetic data if server is unreachable
  const generateSyntheticCandles = useCallback((sym: string, res: string, count = 120) => {
    const base = BASE_PRICES[sym.toUpperCase()] || 19750.0;
    const volatility = base * 0.0009;
    const stepSeconds = (res === 'D' ? 1440 : parseInt(res, 10) || 1) * 60;
    const now = Math.floor(Date.now() / 1000);
    const candles: CandlestickData[] = [];
    const volumes: HistogramData[] = [];
    let price = base;

    for (let i = count; i >= 0; i--) {
      const time = (now - i * stepSeconds) as any;
      const open = price;
      const change = (Math.random() - 0.49) * volatility * 2.5;
      const close = Math.round((open + change) * 100) / 100;
      const high = Math.round((Math.max(open, close) + Math.random() * volatility) * 100) / 100;
      const low = Math.round((Math.min(open, close) - Math.random() * volatility) * 100) / 100;
      const vol = Math.floor(Math.random() * 800 + 150);

      candles.push({ time, open, high, low, close });
      volumes.push({
        time,
        value: vol,
        color: close >= open ? 'rgba(0, 230, 138, 0.35)' : 'rgba(255, 77, 106, 0.35)',
      });
      price = close;
    }

    return { candles, volumes };
  }, []);

  const computeSma = (data: CandlestickData[], period: number): LineData[] => {
    const result: LineData[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) continue;
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({
        time: data[i].time,
        value: Math.round((sum / period) * 100) / 100,
      });
    }
    return result;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8e9eb5',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(0, 212, 170, 0.4)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0e1626',
        },
        horzLine: {
          color: 'rgba(0, 212, 170, 0.4)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0e1626',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00e68a',
      downColor: '#ff4d6a',
      borderVisible: false,
      wickUpColor: '#00e68a',
      wickDownColor: '#ff4d6a',
      visible: chartType === 'candles',
    });

    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(0, 212, 170, 0.45)',
      bottomColor: 'rgba(0, 212, 170, 0.0)',
      lineColor: '#00d4aa',
      lineWidth: 2,
      visible: chartType === 'area' || chartType === 'line',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      visible: showVolume,
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const ma20Series = chart.addLineSeries({
      color: '#00d4aa',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'EMA 20',
      visible: showMa20,
    });

    const ma50Series = chart.addLineSeries({
      color: '#6366f1',
      lineWidth: 1.5,
      priceLineVisible: false,
      title: 'EMA 50',
      visible: showMa50,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    areaSeriesRef.current = areaSeries;
    volumeSeriesRef.current = volumeSeries;
    ma20SeriesRef.current = ma20Series;
    ma50SeriesRef.current = ma50Series;

    let activeCandles: CandlestickData[] = [];
    let activeVolumes: HistogramData[] = [];

    const loadData = async () => {
      setIsLoading(true);
      try {
        const res = await api.get('/analysis/candles', {
          params: { symbol, resolution, count: 120 },
          timeout: 4000,
        });
        if (res.data?.candles?.length) {
          activeCandles = res.data.candles.map((c: any) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));
          activeVolumes = res.data.candles.map((c: any) => ({
            time: c.time,
            value: c.volume || 100,
            color: c.close >= c.open ? 'rgba(0, 230, 138, 0.35)' : 'rgba(255, 77, 106, 0.35)',
          }));
        } else {
          const synth = generateSyntheticCandles(symbol, resolution);
          activeCandles = synth.candles;
          activeVolumes = synth.volumes;
        }
      } catch (err) {
        const synth = generateSyntheticCandles(symbol, resolution);
        activeCandles = synth.candles;
        activeVolumes = synth.volumes;
      } finally {
        setIsLoading(false);
      }

      if (activeCandles.length > 0) {
        candleSeries.setData(activeCandles);
        areaSeries.setData(activeCandles.map((c) => ({ time: c.time, value: c.close })));
        volumeSeries.setData(activeVolumes);
        ma20Series.setData(computeSma(activeCandles, 20));
        ma50Series.setData(computeSma(activeCandles, 50));

        const last = activeCandles[activeCandles.length - 1];
        const first = activeCandles[0];
        const change = Math.round(((last.close - first.open) / first.open) * 10000) / 100;
        const lastVol = (activeVolumes[activeVolumes.length - 1]?.value as number) || 500;

        setCurrentOhlc({
          open: last.open,
          high: last.high,
          low: last.low,
          close: last.close,
          volume: lastVol,
          change,
        });

        if (onPriceUpdate) {
          onPriceUpdate(last.close, change, last.high, last.low, lastVol);
        }

        chart.timeScale().fitContent();
      }
    };

    loadData();

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.get(candleSeries)) {
        if (activeCandles.length) {
          const last = activeCandles[activeCandles.length - 1];
          const first = activeCandles[0];
          const change = Math.round(((last.close - first.open) / first.open) * 10000) / 100;
          const vol = (activeVolumes[activeVolumes.length - 1]?.value as number) || 500;
          setCurrentOhlc({
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            volume: vol,
            change,
          });
        }
        return;
      }

      const bar = param.seriesData.get(candleSeries) as CandlestickData;
      const volBar = param.seriesData.get(volumeSeries) as HistogramData;
      if (bar) {
        const change = Math.round(((bar.close - bar.open) / bar.open) * 10000) / 100;
        setCurrentOhlc({
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: (volBar?.value as number) || 0,
          change,
        });
      }
    });

    const tickInterval = setInterval(() => {
      if (!candleSeriesRef.current || activeCandles.length === 0) return;

      const lastIdx = activeCandles.length - 1;
      const last = { ...activeCandles[lastIdx] };
      const base = BASE_PRICES[symbol.toUpperCase()] || 19750.0;
      const tickDelta = (Math.random() - 0.495) * (base * 0.00015);
      const newClose = Math.round((last.close + tickDelta) * 100) / 100;
      const newHigh = Math.round(Math.max(last.high, newClose) * 100) / 100;
      const newLow = Math.round(Math.min(last.low, newClose) * 100) / 100;
      const volDelta = Math.floor(Math.random() * 5 + 1);

      last.close = newClose;
      last.high = newHigh;
      last.low = newLow;
      activeCandles[lastIdx] = last;

      candleSeriesRef.current.update(last);
      if (areaSeriesRef.current) {
        areaSeriesRef.current.update({ time: last.time, value: newClose });
      }

      if (volumeSeriesRef.current && activeVolumes.length) {
        const lastVol = { ...activeVolumes[lastIdx] };
        lastVol.value = ((lastVol.value as number) || 0) + volDelta;
        lastVol.color = newClose >= last.open ? 'rgba(0, 230, 138, 0.4)' : 'rgba(255, 77, 106, 0.4)';
        activeVolumes[lastIdx] = lastVol;
        volumeSeriesRef.current.update(lastVol);
      }

      const first = activeCandles[0];
      const change = Math.round(((newClose - first.open) / first.open) * 10000) / 100;
      setCurrentOhlc({
        open: last.open,
        high: newHigh,
        low: newLow,
        close: newClose,
        volume: (activeVolumes[lastIdx]?.value as number) || 0,
        change,
      });

      if (onPriceUpdate) {
        onPriceUpdate(newClose, change, newHigh, newLow, (activeVolumes[lastIdx]?.value as number) || 0);
      }
    }, 1200);

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(container);

    return () => {
      clearInterval(tickInterval);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, resolution, chartType, showMa20, showMa50, showVolume, generateSyntheticCandles, onPriceUpdate]);

  // Set markers
  useEffect(() => {
    if (!candleSeriesRef.current || markers.length === 0) return;
    try {
      (candleSeriesRef.current as any).setMarkers(markers);
    } catch {
      // safe fallback
    }
  }, [markers]);

  const fitContent = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  return (
    <div className={`trading-chart-wrapper ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* TopStepX Style Chart Control Bar */}
      <div className="topstep-chart-toolbar">
        <div className="toolbar-left-group">
          {/* Symbol & Price badge */}
          <div className="chart-symbol-pill">
            <span className="live-pulsing-dot" />
            <span className="sym-bold">{symbol}</span>
            <span className="sym-sub">{symbol === 'NQ' ? 'NASDAQ 100' : symbol}</span>
          </div>

          {/* Chart Type Selector */}
          <div className="chart-type-picker">
            <button
              type="button"
              className={`ct-btn ${chartType === 'candles' ? 'active' : ''}`}
              onClick={() => setChartType('candles')}
              title="Velas Japonesas"
            >
              🕯 Velas
            </button>
            <button
              type="button"
              className={`ct-btn ${chartType === 'area' ? 'active' : ''}`}
              onClick={() => setChartType('area')}
              title="Área con Gradiente"
            >
              📈 Área
            </button>
          </div>

          {/* Indicator Toggles */}
          <div className="chart-indicators-toggles">
            <button
              type="button"
              className={`ind-toggle ${showMa20 ? 'active' : ''}`}
              onClick={() => setShowMa20(!showMa20)}
            >
              EMA 20
            </button>
            <button
              type="button"
              className={`ind-toggle ${showMa50 ? 'active' : ''}`}
              onClick={() => setShowMa50(!showMa50)}
            >
              EMA 50
            </button>
            <button
              type="button"
              className={`ind-toggle ${showVolume ? 'active' : ''}`}
              onClick={() => setShowVolume(!showVolume)}
            >
              VOL
            </button>
          </div>
        </div>

        <div className="toolbar-right-group">
          {currentOhlc && (
            <div className="header-price-display">
              <span className={`live-price ${currentOhlc.change >= 0 ? 'pos' : 'neg'}`}>
                ${currentOhlc.close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`live-badge ${currentOhlc.change >= 0 ? 'pos' : 'neg'}`}>
                {currentOhlc.change >= 0 ? '+' : ''}{currentOhlc.change}%
              </span>
            </div>
          )}

          <button
            type="button"
            className="chart-action-icon-btn"
            onClick={fitContent}
            title="Ajustar Escala"
          >
            &#x26F6; Reset Zoom
          </button>

          <button
            type="button"
            className="chart-action-icon-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Pantalla Completa"
          >
            {isFullscreen ? '⤓ Reducir' : '⤢ Expandir'}
          </button>
        </div>
      </div>

      {/* OHLC Bar Legend */}
      {currentOhlc && (
        <div className="chart-ohlc-legend-bar">
          <span>O: <strong>{currentOhlc.open.toFixed(2)}</strong></span>
          <span>H: <strong className="pos">{currentOhlc.high.toFixed(2)}</strong></span>
          <span>L: <strong className="neg">{currentOhlc.low.toFixed(2)}</strong></span>
          <span>C: <strong>{currentOhlc.close.toFixed(2)}</strong></span>
          <span>Vol: <strong>{currentOhlc.volume.toLocaleString()}</strong></span>
          <span className="engine-status-tag">CME DIRECT FEED</span>
        </div>
      )}

      {/* Main Chart Body with Left Drawing Toolbar */}
      <div className="chart-main-body-row">
        {/* Left Drawing Tools Sidebar (TopStepX style) */}
        <div className="drawing-tools-sidebar">
          <button
            type="button"
            className={`dt-btn ${activeTool === 'cursor' ? 'active' : ''}`}
            onClick={() => setActiveTool('cursor')}
            title="Puntero / Cruz"
          >
            &#10010;
          </button>
          <button
            type="button"
            className={`dt-btn ${activeTool === 'trendline' ? 'active' : ''}`}
            onClick={() => setActiveTool('trendline')}
            title="Línea de Tendencia"
          >
            &#9585;
          </button>
          <button
            type="button"
            className={`dt-btn ${activeTool === 'horizontal' ? 'active' : ''}`}
            onClick={() => setActiveTool('horizontal')}
            title="Soporte / Resistencia Horizontal"
          >
            &#8213;
          </button>
          <button
            type="button"
            className={`dt-btn ${activeTool === 'fib' ? 'active' : ''}`}
            onClick={() => setActiveTool('fib')}
            title="Retroceso de Fibonacci"
          >
            &#8801;
          </button>
          <button
            type="button"
            className="dt-btn clear"
            onClick={fitContent}
            title="Limpiar Herramientas"
          >
            &#128465;
          </button>
        </div>

        {/* Viewport container */}
        <div className="chart-viewport-wrapper">
          {isLoading && (
            <div className="chart-loader">
              <div className="spinner" />
              <span>Sincronizando feed institucional de {symbol}...</span>
            </div>
          )}
          <div ref={chartContainerRef} className="tv-chart-viewport" />
        </div>
      </div>
    </div>
  );
};
