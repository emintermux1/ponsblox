"use client";

import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  createChart,
  createSeriesMarkers,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useMemo, useRef } from "react";

import {
  chartPricePrecision,
  formatChartPrice,
  formatChartTick,
  formatChartTime,
  normalizeChartBars,
} from "@/lib/chart-bars";
import { COPY, publicCopy } from "@/lib/surface-copy";
import type { Candle, PoolTrade, TokenChart as TokenChartMeta } from "@/lib/types";

export function TokenChart({
  bars,
  candles,
  prints = [],
  variant = "candle",
  meta,
  onRetry,
}: {
  bars?: unknown;
  candles?: Candle[] | unknown;
  prints?: PoolTrade[];
  variant?: "line" | "candle";
  meta?: TokenChartMeta | null;
  onRetry?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seriesBars = useMemo(
    () => normalizeChartBars(bars ?? candles ?? []),
    [bars, candles],
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || seriesBars.length === 0) return;

    const up = seriesBars[seriesBars.length - 1].close >= seriesBars[0].open;
    const precision = chartPricePrecision(seriesBars);
    const minMove = Number((10 ** -precision).toFixed(precision));
    const chart = createChart(node, {
      width: Math.max(node.clientWidth, 1),
      height: Math.max(node.clientHeight, 320),
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#07070e" },
        textColor: "#8c91a3",
        fontFamily: "IBM Plex Mono, ui-monospace, monospace",
      },
      localization: {
        locale: "en-US",
        priceFormatter: formatChartPrice,
        timeFormatter: formatChartTime,
      },
      grid: {
        vertLines: { color: "rgba(226, 232, 255, 0.055)" },
        horzLines: { color: "rgba(226, 232, 255, 0.055)" },
      },
      leftPriceScale: { visible: false },
      rightPriceScale: {
        visible: true,
        borderColor: "rgba(226, 232, 255, 0.1)",
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      timeScale: {
        visible: true,
        borderColor: "rgba(226, 232, 255, 0.1)",
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: unknown) => formatChartTick(time),
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#8ea4ff",
          width: 1,
          style: 2,
          labelBackgroundColor: "#12121c",
        },
        horzLine: {
          color: "#8ea4ff",
          width: 1,
          style: 2,
          labelBackgroundColor: "#12121c",
        },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const series =
      variant === "candle"
        ? chart.addSeries(CandlestickSeries, {
            upColor: "#3dcf7a",
            downColor: "#ff6a6a",
            wickUpColor: "#3dcf7a",
            wickDownColor: "#ff6a6a",
            borderVisible: false,
            priceFormat: { type: "price", precision, minMove },
          })
        : chart.addSeries(AreaSeries, {
            lineColor: up ? "#3dcf7a" : "#ff6a6a",
            topColor: up ? "rgba(61,207,122,0.16)" : "rgba(255,106,106,0.16)",
            bottomColor: "rgba(7,7,14,0)",
            lineWidth: 2,
            priceFormat: { type: "price", precision, minMove },
          });

    if (variant === "candle") {
      series.setData(
        seriesBars.map((row) => ({
          time: row.time as UTCTimestamp,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
        })),
      );
    } else {
      series.setData(
        seriesBars.map((row) => ({
          time: row.time as UTCTimestamp,
          value: row.close,
        })),
      );
    }

    const marks = prints
      .filter((print) => print.at && print.usd > 0)
      .map((print) => {
        const raw = print.at! > 1e12 ? Math.floor(print.at! / 1000) : print.at!;
        const snapped = snapToCandle(raw, seriesBars);
        return {
          time: snapped as UTCTimestamp,
          position: print.side === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
          color: print.side === "buy" ? "#3dcf7a" : "#ff6a6a",
          shape: "circle" as const,
        };
      });
    if (marks.length) createSeriesMarkers(series, marks);

    chart.timeScale().fitContent();
    const observer = new ResizeObserver(() => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      if (width < 80 || height < 80) return;
      chart.applyOptions({ width, height });
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [prints, seriesBars, variant]);

  if (seriesBars.length === 0) {
    return (
      <div className="mf-empty px-4 py-6">
        <p className="mf-kicker">Chart</p>
        <p className="mt-2 text-[15px] font-semibold tracking-tight">{COPY.noCandles.title}</p>
        <p className="mt-1 max-w-md text-[12px] leading-5 text-mute">
          {publicCopy(meta?.reason, COPY.noCandles.body)}
        </p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="mf-buy mt-3 inline-flex rounded-full px-3 py-1.5 text-[12px]">
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[22rem] w-full min-w-0 flex-col">
      <div className="relative min-h-[22rem] w-full min-w-0 flex-1">
        <div ref={ref} className="mf-chart-reveal absolute inset-0 h-full w-full min-w-0" />
      </div>
      <p className="mf-caption px-3 py-1">
        Live
        {meta?.pairAddress ? ` · ${meta.pairAddress.slice(0, 4)}…${meta.pairAddress.slice(-4)}` : ""}
      </p>
    </div>
  );
}

function snapToCandle(time: number, candles: Candle[]): number {
  if (!candles.length) return time;
  let best = candles[0].time;
  let delta = Math.abs(best - time);
  for (const candle of candles) {
    const next = Math.abs(candle.time - time);
    if (next < delta) {
      best = candle.time;
      delta = next;
    }
  }
  return best;
}
