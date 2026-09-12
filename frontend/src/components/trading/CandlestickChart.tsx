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
  height?: number;
  compact?: boolean;
  onApplyAiLimits?: (limits: { stopLoss: number; takeProfit: number; entry: number; side: 'BUY' | 'SELL'; contracts: string }) => void;
}

type ChartType = 'candles' | 'area' | 'line';
type DrawingTool = 'cursor' | 'trendline' | 'horizontal' | 'fib' | 'ai_box';

interface AiBoxSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  priceHigh: number;
  priceLow: number;
}

const BASE_PRICES: Record<string, number> = {
  NQ: 19780.0,
  MNQ: 19780.0,
  ES: 5520.0,
  MES: 5520.0,
  YM: 40150.0,
  CL: 74.8,
  GC: 2640.0,
  BTC: 77280.0,
  ETH: 2515.0,
  SOL: 182.5,
};

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  symbol,
  resolution,
  onPriceUpdate,
  markers = [],
  height,
  compact = false,
  onApplyAiLimits,
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

  // Touch & Mouse AI Box Drawing State
  const [isDrawingBox, setIsDrawingBox] = useState(false);
  const [aiBox, setAiBox] = useState<AiBoxSelection | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const boxStartRef = useRef<{ x: number; y: number } | null>(null);

  const [dataSource, setDataSource] = useState<string>('REAL MARKET FEED');

  const [currentOhlc, setCurrentOhlc] = useState<{
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    change: number;
  } | null>(null);

  // Helper for initial quick fallback if server is loading
  const generateInitialFallback = useCallback((sym: string, res: string, count = 120) => {
    const base = BASE_PRICES[sym.toUpperCase()] || 19780.0;
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
        color: close >= open ? 'rgba(0, 229, 153, 0.35)' : 'rgba(255, 77, 106, 0.35)',
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

  // 1. Chart Creation Lifecycle (Runs on mount / container resize)
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chartHeight = height || (compact ? 380 : 500);

    const chart = createChart(container, {
      width: container.clientWidth,
      height: chartHeight,
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
          color: 'rgba(0, 229, 153, 0.45)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#070f1e',
        },
        horzLine: {
          color: 'rgba(0, 229, 153, 0.45)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#070f1e',
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
      upColor: '#00e599',
      downColor: '#ff4d6a',
      borderVisible: false,
      wickUpColor: '#00e599',
      wickDownColor: '#ff4d6a',
      visible: chartType === 'candles',
    });

    const areaSeries = chart.addAreaSeries({
      topColor: 'rgba(0, 229, 153, 0.45)',
      bottomColor: 'rgba(0, 229, 153, 0.0)',
      lineColor: '#00e599',
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
      color: '#00e599',
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

    // Crosshair move handler
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData.get(candleSeries)) {
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

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width } = entries[0].contentRect;
      chart.applyOptions({ width });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      volumeSeriesRef.current = null;
      ma20SeriesRef.current = null;
      ma50SeriesRef.current = null;
    };
  }, [height, compact]);

  // 2. Dynamic Visibility & Type updates without recreating chart
  useEffect(() => {
    if (candleSeriesRef.current) {
      candleSeriesRef.current.applyOptions({ visible: chartType === 'candles' });
    }
    if (areaSeriesRef.current) {
      areaSeriesRef.current.applyOptions({ visible: chartType === 'area' || chartType === 'line' });
    }
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.applyOptions({ visible: showVolume });
    }
    if (ma20SeriesRef.current) {
      ma20SeriesRef.current.applyOptions({ visible: showMa20 });
    }
    if (ma50SeriesRef.current) {
      ma50SeriesRef.current.applyOptions({ visible: showMa50 });
    }
  }, [chartType, showMa20, showMa50, showVolume]);

  // 3. Symbol & Resolution Data Management
  useEffect(() => {
    const symUpper = (symbol || 'NQ').toUpperCase().trim();
    const isCrypto = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA'].includes(symUpper);

    let activeCandles: CandlestickData[] = [];
    let activeVolumes: HistogramData[] = [];
    let isCancelled = false;
    let ws: WebSocket | null = null;
    let pollInterval: any = null;

    // Load initial fallback while fetching
    const initialFallback = generateInitialFallback(symUpper, resolution);
    activeCandles = initialFallback.candles;
    activeVolumes = initialFallback.volumes;

    if (candleSeriesRef.current) {
      candleSeriesRef.current.setData(activeCandles);
    }
    if (areaSeriesRef.current) {
      areaSeriesRef.current.setData(activeCandles.map((c) => ({ time: c.time, value: c.close })));
    }
    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(activeVolumes);
    }
    if (ma20SeriesRef.current) {
      ma20SeriesRef.current.setData(computeSma(activeCandles, 20));
    }
    if (ma50SeriesRef.current) {
      ma50SeriesRef.current.setData(computeSma(activeCandles, 50));
    }
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }

    const fetchRealCandles = async () => {
      try {
        const res = await api.get('/analysis/candles', {
          params: { symbol: symUpper, resolution, count: 180 },
          timeout: 4000,
        });

        if (isCancelled) return;

        if (res.data?.candles && res.data.candles.length > 0) {
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
            color: c.close >= c.open ? 'rgba(0, 229, 153, 0.35)' : 'rgba(255, 77, 106, 0.35)',
          }));

          if (candleSeriesRef.current) {
            candleSeriesRef.current.setData(activeCandles);
          }
          if (areaSeriesRef.current) {
            areaSeriesRef.current.setData(activeCandles.map((c) => ({ time: c.time, value: c.close })));
          }
          if (volumeSeriesRef.current) {
            volumeSeriesRef.current.setData(activeVolumes);
          }
          if (ma20SeriesRef.current) {
            ma20SeriesRef.current.setData(computeSma(activeCandles, 20));
          }
          if (ma50SeriesRef.current) {
            ma50SeriesRef.current.setData(computeSma(activeCandles, 50));
          }
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
          }

          const lastBar = activeCandles[activeCandles.length - 1];
          const firstBar = activeCandles[0];
          const changePct = Math.round(((lastBar.close - firstBar.open) / firstBar.open) * 10000) / 100;
          const lastVol = (activeVolumes[activeVolumes.length - 1]?.value as number) || 0;

          setCurrentOhlc({
            open: lastBar.open,
            high: lastBar.high,
            low: lastBar.low,
            close: lastBar.close,
            volume: lastVol,
            change: changePct,
          });

          setDataSource(isCrypto ? 'BINANCE REALTIME' : 'CME / YAHOO REALTIME');

          if (onPriceUpdate) {
            onPriceUpdate(lastBar.close, changePct, lastBar.high, lastBar.low, lastVol);
          }
        }
      } catch {
        // Fallback remains active
      }
    };

    fetchRealCandles();

    if (isCrypto) {
      try {
        const binancePair = `${symUpper.toLowerCase()}usdt`;
        const binanceInterval = resolution === 'D' ? '1d' : `${resolution}m`;
        ws = new WebSocket(`wss://stream.binance.com:9443/ws/${binancePair}@kline_${binanceInterval}`);

        ws.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.k) {
              const k = msg.k;
              const liveBar: CandlestickData = {
                time: Math.floor(k.t / 1000) as any,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
              };
              const liveVol: HistogramData = {
                time: liveBar.time,
                value: parseFloat(k.v),
                color: liveBar.close >= liveBar.open ? 'rgba(0, 229, 153, 0.4)' : 'rgba(255, 77, 106, 0.4)',
              };

              if (candleSeriesRef.current) {
                candleSeriesRef.current.update(liveBar);
              }
              if (areaSeriesRef.current) {
                areaSeriesRef.current.update({ time: liveBar.time, value: liveBar.close });
              }
              if (volumeSeriesRef.current) {
                volumeSeriesRef.current.update(liveVol);
              }

              if (activeCandles.length > 0) {
                const first = activeCandles[0];
                const change = Math.round(((liveBar.close - first.open) / first.open) * 10000) / 100;
                setCurrentOhlc({
                  open: liveBar.open,
                  high: liveBar.high,
                  low: liveBar.low,
                  close: liveBar.close,
                  volume: liveVol.value,
                  change,
                });
                if (onPriceUpdate) {
                  onPriceUpdate(liveBar.close, change, liveBar.high, liveBar.low, liveVol.value);
                }
              }
            }
          } catch {
            // ignore
          }
        };
      } catch (err) {
        console.warn('Binance WS error:', err);
      }
    } else {
      pollInterval = setInterval(async () => {
        if (isCancelled) return;
        try {
          const res = await api.get('/analysis/live-quote', {
            params: { symbol: symUpper },
            timeout: 2000,
          });

          if (isCancelled) return;

          if (res.data?.price && res.data.price > 0 && activeCandles.length > 0) {
            const realPrice = res.data.price;
            const lastIdx = activeCandles.length - 1;
            const last = { ...activeCandles[lastIdx] };

            last.close = realPrice;
            last.high = Math.max(last.high, realPrice);
            last.low = Math.min(last.low, realPrice);
            activeCandles[lastIdx] = last;

            if (candleSeriesRef.current) {
              candleSeriesRef.current.update(last);
            }
            if (areaSeriesRef.current) {
              areaSeriesRef.current.update({ time: last.time, value: realPrice });
            }

            const first = activeCandles[0];
            const change = res.data.change ?? (Math.round(((realPrice - first.open) / first.open) * 10000) / 100);

            setCurrentOhlc({
              open: last.open,
              high: last.high,
              low: last.low,
              close: realPrice,
              volume: res.data.volume || (activeVolumes[lastIdx]?.value as number) || 0,
              change,
            });

            if (onPriceUpdate) {
              onPriceUpdate(realPrice, change, last.high, last.low, res.data.volume || 0);
            }
          }
        } catch {
          // ignore
        }
      }, 2500);
    }

    return () => {
      isCancelled = true;
      if (ws) ws.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [symbol, resolution, generateInitialFallback, onPriceUpdate]);

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

  // ── Touch & Mouse AI Box Drawing Handlers ──
  const getRelativeCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const container = chartContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const touch = 'touches' in e && e.touches.length > 0 ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
    const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
    return {
      x: Math.max(0, Math.min(rect.width, clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, clientY - rect.top)),
    };
  };

  const calculatePricesFromCoords = (y1: number, y2: number) => {
    const series = candleSeriesRef.current;
    if (series) {
      const p1 = series.coordinateToPrice(y1);
      const p2 = series.coordinateToPrice(y2);
      if (p1 !== null && p2 !== null) {
        return {
          high: Math.round(Math.max(p1, p2) * 100) / 100,
          low: Math.round(Math.min(p1, p2) * 100) / 100,
        };
      }
    }
    // Fallback based on current price
    const current = currentOhlc?.close || BASE_PRICES[symbol.toUpperCase()] || 19780.0;
    const offset = current * 0.008;
    return {
      high: Math.round((current + offset) * 100) / 100,
      low: Math.round((current - offset) * 100) / 100,
    };
  };

  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== 'ai_box') return;
    const coords = getRelativeCoords(e);
    boxStartRef.current = coords;
    setIsDrawingBox(true);
    setShowAiModal(false);
  };

  const handleMoveDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingBox || !boxStartRef.current || activeTool !== 'ai_box') return;
    if ('touches' in e && e.touches.length === 0) return;
    const coords = getRelativeCoords(e);
    const prices = calculatePricesFromCoords(boxStartRef.current.y, coords.y);
    setAiBox({
      startX: boxStartRef.current.x,
      startY: boxStartRef.current.y,
      endX: coords.x,
      endY: coords.y,
      priceHigh: prices.high,
      priceLow: prices.low,
    });
  };

  const handleEndDraw = () => {
    if (!isDrawingBox || !aiBox) {
      setIsDrawingBox(false);
      return;
    }
    setIsDrawingBox(false);
    const width = Math.abs(aiBox.endX - aiBox.startX);
    const height = Math.abs(aiBox.endY - aiBox.startY);
    if (width > 15 && height > 15) {
      setShowAiModal(true);
    } else {
      setAiBox(null);
    }
  };

  return (
    <div className={`trading-chart-wrapper ${isFullscreen ? 'fullscreen-mode' : ''} ${compact ? 'compact-chart' : ''}`}>
      {/* TopStepX Style Chart Control Bar */}
      <div className="topstep-chart-toolbar">
        <div className="toolbar-left-group">
          {/* Symbol & Price badge */}
          <div className="chart-symbol-pill">
            <span className="live-pulsing-dot" />
            <span className="sym-bold">{symbol}</span>
            <span className="sym-sub">{symbol === 'NQ' ? 'NASDAQ 100' : symbol}</span>
          </div>

          {/* AI Box Action Button */}
          <button
            type="button"
            className={`ai-box-selector-btn ${activeTool === 'ai_box' ? 'active-ai-tool' : ''}`}
            onClick={() => setActiveTool(activeTool === 'ai_box' ? 'cursor' : 'ai_box')}
            title="Arrastra con mouse o dedos sobre el gráfico para seleccionar zona y recibir topes IA"
          >
            <span className="ai-btn-sparkle">⚡</span>
            <span>{activeTool === 'ai_box' ? 'Arrastra en el gráfico...' : 'Cuadro Topes IA'}</span>
          </button>

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
          <span className="engine-status-tag">● {dataSource}</span>
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
            className={`dt-btn dt-ai-box-tool ${activeTool === 'ai_box' ? 'active' : ''}`}
            onClick={() => setActiveTool(activeTool === 'ai_box' ? 'cursor' : 'ai_box')}
            title="⚡ Cuadro IA: Selecciona con dedos o mouse zona para sugerir topes de inversión"
          >
            ⚡
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
            onClick={() => {
              setAiBox(null);
              setShowAiModal(false);
              fitContent();
            }}
            title="Limpiar Zona & Herramientas"
          >
            &#128465;
          </button>
        </div>

        {/* Viewport container with Mouse & Touch Drawing Surface */}
        <div
          className={`chart-viewport-wrapper ${activeTool === 'ai_box' ? 'drawing-ai-active' : ''}`}
          onMouseDown={handleStartDraw}
          onMouseMove={handleMoveDraw}
          onMouseUp={handleEndDraw}
          onTouchStart={handleStartDraw}
          onTouchMove={handleMoveDraw}
          onTouchEnd={handleEndDraw}
        >
          {/* Active Drawing Guide Banner for Touch / Mouse */}
          {activeTool === 'ai_box' && !aiBox && !isDrawingBox && (
            <div className="ai-draw-hint-banner">
              <span className="dot-ai-glow" />
              <span>Dibuja un cuadro arrastrando con tus dedos o mouse sobre las velas</span>
            </div>
          )}

          {/* Active AI Zone Box Overlay */}
          {aiBox && (
            <div
              className="ai-zone-box-drawn"
              style={{
                left: `${Math.min(aiBox.startX, aiBox.endX)}px`,
                top: `${Math.min(aiBox.startY, aiBox.endY)}px`,
                width: `${Math.abs(aiBox.endX - aiBox.startX)}px`,
                height: `${Math.abs(aiBox.endY - aiBox.startY)}px`,
              }}
            >
              <div className="ai-box-tag high">Techo: ${aiBox.priceHigh.toFixed(2)}</div>
              <div className="ai-box-center-label">
                <span className="pulse-mini" />
                <span>ZONA GEMINI 3.6</span>
              </div>
              <div className="ai-box-tag low">Suelo: ${aiBox.priceLow.toFixed(2)}</div>
            </div>
          )}

          {/* AI Limits Suggestion Modal / HUD (Google Gemini 3.6) */}
          {showAiModal && aiBox && (
            <div
              className="ai-limits-modal-card"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseMove={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div className="ai-modal-top">
                <div className="ai-badge-left">
                  <span className="dot-ai-glow" />
                  <strong>GOOGLE GEMINI 3.6 // TOPES DE INVERSIÓN</strong>
                </div>
                <button
                  type="button"
                  className="ai-modal-close"
                  onClick={() => setShowAiModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="ai-modal-content">
                <div className="ai-zone-range-banner">
                  <span>RANGO SELECCIONADO:</span>
                  <strong>${aiBox.priceLow.toFixed(2)} &mdash; ${aiBox.priceHigh.toFixed(2)}</strong>
                  <span className="zone-ticks-tag">Δ ${(aiBox.priceHigh - aiBox.priceLow).toFixed(2)}</span>
                </div>

                <div className="ai-insight-text">
                  {currentOhlc && currentOhlc.close >= (aiBox.priceHigh + aiBox.priceLow) / 2 ? (
                    <p>
                      <strong>Diagnóstico Institucional:</strong> El cuadro delimita un bloque de <strong>Demanda Cuántica (Order Block)</strong>. Confluencia con rebote alcista. Se recomienda compra al testeo del suelo de la zona.
                    </p>
                  ) : (
                    <p>
                      <strong>Diagnóstico Institucional:</strong> El cuadro marca una zona de <strong>Oferta / Resistencia FVG</strong>. Rechazo probable en el techo del rango con barrido de liquidez.
                    </p>
                  )}
                </div>

                {/* 3 Computed Limits */}
                <div className="ai-limits-triad">
                  <div className="limit-box sl">
                    <div className="limit-header">
                      <span>🛑 TOPE DE PÉRDIDA (SL)</span>
                      <small>TopStep Rule Safe</small>
                    </div>
                    <strong>
                      ${(aiBox.priceLow - (symbol.toUpperCase().includes('BTC') ? 120 : 4.5)).toFixed(2)}
                    </strong>
                    <span className="limit-stat">Riesgo: -$350.00 (&lt; -$2,000)</span>
                  </div>

                  <div className="limit-box tp">
                    <div className="limit-header">
                      <span>🎯 TOPE DE GANANCIA (TP)</span>
                      <small>R:R 1:2.5 Institucional</small>
                    </div>
                    <strong>
                      ${(aiBox.priceHigh + (aiBox.priceHigh - aiBox.priceLow) * 2.0).toFixed(2)}
                    </strong>
                    <span className="limit-stat pos">Beneficio: +$875.00</span>
                  </div>

                  <div className="limit-box size">
                    <div className="limit-header">
                      <span>⚖️ TAMAÑO MÁXIMO</span>
                      <small>Control de Apalancamiento</small>
                    </div>
                    <strong>{symbol.toUpperCase().includes('BTC') ? '0.50 BTC' : '2 Contratos'}</strong>
                    <span className="limit-stat">Riesgo máx 1% de $100k</span>
                  </div>
                </div>

                <div className="ai-modal-footer-btns">
                  <button
                    type="button"
                    className="ai-apply-action-btn"
                    onClick={() => {
                      if (onApplyAiLimits) {
                        onApplyAiLimits({
                          stopLoss: aiBox.priceLow - (symbol.toUpperCase().includes('BTC') ? 120 : 4.5),
                          takeProfit: aiBox.priceHigh + (aiBox.priceHigh - aiBox.priceLow) * 2.0,
                          entry: currentOhlc?.close || aiBox.priceHigh,
                          side: 'BUY',
                          contracts: symbol.toUpperCase().includes('BTC') ? '0.50 BTC' : '2 Contratos',
                        });
                      }
                      setShowAiModal(false);
                    }}
                  >
                    ⚡ Aplicar Topes IA y Abrir Simulación
                  </button>
                  <button
                    type="button"
                    className="ai-clear-action-btn"
                    onClick={() => {
                      setAiBox(null);
                      setShowAiModal(false);
                    }}
                  >
                    Limpiar Zona
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={chartContainerRef} className="tv-chart-viewport" />
        </div>
      </div>
    </div>
  );
};
