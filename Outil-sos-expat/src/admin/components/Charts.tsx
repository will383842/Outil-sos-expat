/**
 * =============================================================================
 * COMPOSANTS GRAPHIQUES — Charts SVG purs sans dépendances
 * Design moderne et cohérent avec l'interface existante
 * =============================================================================
 */

import { useMemo } from "react";

// =============================================================================
// TYPES
// =============================================================================

interface BarChartData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartData {
  label: string;
  value: number;
  color: string;
}

interface LineChartData {
  label: string;
  value: number;
}

// =============================================================================
// BAR CHART — Graphique en barres horizontales
// =============================================================================

export function BarChart({
  data,
  title,
  height = 200,
}: {
  data: BarChartData[];
  title?: string;
  height?: number;
}) {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {title && <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-32 text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {title && <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>}
      <div className="space-y-3" style={{ minHeight: height }}>
        {data.map((item, index) => {
          const percentage = (item.value / maxValue) * 100;
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// DONUT CHART — Graphique en anneau
// =============================================================================

export function DonutChart({
  data,
  title,
  size = 180,
  strokeWidth = 24,
}: {
  data: DonutChartData[];
  title?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculer les segments
  const segments = useMemo(() => {
    let currentOffset = 0;
    return data.map((item) => {
      const percentage = total > 0 ? item.value / total : 0;
      const length = circumference * percentage;
      const offset = currentOffset;
      currentOffset += length;
      return { ...item, length, offset, percentage };
    });
  }, [data, total, circumference]);

  if (data.length === 0 || total === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {title && <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-32 text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {title && <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>}
      <div className="flex items-center gap-6">
        {/* Donut SVG */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={strokeWidth}
            />
            {/* Data segments */}
            {segments.map((segment, index) => (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                strokeDashoffset={-segment.offset}
                strokeLinecap="round"
              />
            ))}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">{total}</span>
            <span className="text-xs text-gray-500">Total</span>
          </div>
        </div>

        {/* Légende */}
        <div className="flex-1 space-y-2">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-sm text-gray-600 flex-1">{segment.label}</span>
              <span className="text-sm font-medium text-gray-900">
                {segment.value}
              </span>
              <span className="text-xs text-gray-500">
                ({Math.round(segment.percentage * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// LINE CHART — Graphique linéaire simple
// =============================================================================

// Constantes de padding pour éviter les recréations
const LINE_CHART_PADDING = { top: 20, right: 20, bottom: 40, left: 40 };
const LINE_CHART_WIDTH = 400;

export function LineChart({
  data,
  title,
  height = 200,
  color = "#ef4444",
}: {
  data: LineChartData[];
  title?: string;
  height?: number;
  color?: string;
}) {
  const chartHeight = height;
  const innerWidth = LINE_CHART_WIDTH - LINE_CHART_PADDING.left - LINE_CHART_PADDING.right;
  const innerHeight = chartHeight - LINE_CHART_PADDING.top - LINE_CHART_PADDING.bottom;

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const minValue = useMemo(() => Math.min(...data.map((d) => d.value), 0), [data]);
  const valueRange = maxValue - minValue || 1;

  // Générer les points du chemin
  const pathPoints = useMemo(() => {
    if (data.length === 0) return "";

    const points = data.map((d, i) => {
      const x = LINE_CHART_PADDING.left + (i / (data.length - 1 || 1)) * innerWidth;
      const y = LINE_CHART_PADDING.top + innerHeight - ((d.value - minValue) / valueRange) * innerHeight;
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  }, [data, innerWidth, innerHeight, minValue, valueRange]);

  // Zone de remplissage sous la courbe
  const areaPath = useMemo(() => {
    if (data.length === 0) return "";

    const points = data.map((d, i) => {
      const x = LINE_CHART_PADDING.left + (i / (data.length - 1 || 1)) * innerWidth;
      const y = LINE_CHART_PADDING.top + innerHeight - ((d.value - minValue) / valueRange) * innerHeight;
      return `${x},${y}`;
    });

    const startX = LINE_CHART_PADDING.left;
    const endX = LINE_CHART_PADDING.left + innerWidth;
    const bottomY = LINE_CHART_PADDING.top + innerHeight;

    return `M ${startX},${bottomY} L ${points.join(" L ")} L ${endX},${bottomY} Z`;
  }, [data, innerWidth, innerHeight, minValue, valueRange]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {title && <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>}
        <div className="flex items-center justify-center h-32 text-gray-500">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {title && <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>}
      <svg
        width="100%"
        height={chartHeight}
        viewBox={`0 0 ${LINE_CHART_WIDTH} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grille horizontale */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = LINE_CHART_PADDING.top + innerHeight * (1 - ratio);
          const value = Math.round(minValue + valueRange * ratio);
          return (
            <g key={ratio}>
              <line
                x1={LINE_CHART_PADDING.left}
                y1={y}
                x2={LINE_CHART_PADDING.left + innerWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="4"
              />
              <text
                x={LINE_CHART_PADDING.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400 text-xs"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Zone sous la courbe */}
        <path d={areaPath} fill={color} opacity="0.1" />

        {/* Ligne de la courbe */}
        <path
          d={pathPoints}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {data.map((d, i) => {
          const x = LINE_CHART_PADDING.left + (i / (data.length - 1 || 1)) * innerWidth;
          const y = LINE_CHART_PADDING.top + innerHeight - ((d.value - minValue) / valueRange) * innerHeight;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="white" stroke={color} strokeWidth="2" />
              {/* Label en bas */}
              <text
                x={x}
                y={chartHeight - 10}
                textAnchor="middle"
                className="fill-gray-500 text-xs"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// =============================================================================
// STAT TREND — Indicateur avec tendance
// =============================================================================

export function StatTrend({
  label,
  value,
  previousValue,
  suffix = "",
  icon: Icon,
  color = "bg-gray-100 text-gray-700",
}: {
  label: string;
  value: number;
  previousValue?: number;
  suffix?: string;
  icon?: React.ElementType;
  color?: string;
}) {
  const trend = previousValue !== undefined
    ? ((value - previousValue) / (previousValue || 1)) * 100
    : null;

  const trendColor = trend
    ? trend > 0
      ? "text-green-600"
      : trend < 0
      ? "text-red-600"
      : "text-gray-500"
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        {Icon && (
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        {trend !== null && (
          <span className={`text-sm font-medium ${trendColor}`}>
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-gray-900">
          {value}
          {suffix && <span className="text-xl ml-1">{suffix}</span>}
        </div>
        <div className="text-sm text-gray-600 mt-1">{label}</div>
      </div>
    </div>
  );
}

// =============================================================================
// MINI SPARKLINE — Mini graphique en ligne
// =============================================================================

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = "#ef4444",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - padding * 2);
    const y = padding + (height - padding * 2) - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height}>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
