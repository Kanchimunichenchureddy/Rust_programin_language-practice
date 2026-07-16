import React, { useState } from 'react';
import './WeeklyChart.css';

/**
 * WeeklyChart — SVG throughput chart showing completed vs. planned tasks.
 *
 * Features:
 * - Range tabs (4W, 8W, 3M, 1Y) for time filtering
 * - SVG area chart with grid lines, labels, and data points
 * - Legend for completed vs. planned tasks
 */
const RANGES = [
  { id: '4w', label: '4W' },
  { id: '8w', label: '8W' },
  { id: '3m', label: '3M' },
  { id: '1y', label: '1Y' },
];

export default function WeeklyChart() {
  const [activeRange, setActiveRange] = useState('8w');

  return (
    <div className="chart-card card">
      <div className="chart-header">
        <div>
          <h2 className="chart-title">Weekly throughput</h2>
          <p className="chart-subtitle">Tasks completed vs. planned · last 8 weeks</p>
        </div>
        <div className="chart-tabs">
          {RANGES.map((range) => (
            <button
              key={range.id}
              className={`chart-tab btn-ghost ${activeRange === range.id ? 'active' : ''}`}
              onClick={() => setActiveRange(range.id)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-dot legend-dot-completed" />
          Completed <span className="legend-count">— 312</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-dot-planned" />
          Planned <span className="legend-count">— 348</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="chart-svg-container">
        <svg viewBox="0 0 720 260" className="chart-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#141413" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#141413" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="areaGrad2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff5a1f" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line className="grid-line" x1="40" y1="40" x2="700" y2="40" />
          <line className="grid-line" x1="40" y1="95" x2="700" y2="95" />
          <line className="grid-line" x1="40" y1="150" x2="700" y2="150" />
          <line className="grid-line" x1="40" y1="205" x2="700" y2="205" />

          {/* Y-axis labels */}
          <text className="tick-label" x="8" y="44">60</text>
          <text className="tick-label" x="8" y="99">45</text>
          <text className="tick-label" x="8" y="154">30</text>
          <text className="tick-label" x="8" y="209">15</text>

          {/* Planned area + dashed line */}
          <path
            d="M60,150 L140,110 L220,125 L300,90 L380,105 L460,70 L540,85 L620,55 L680,65 L680,220 L60,220 Z"
            fill="url(#areaGrad2)"
          />
          <path
            d="M60,150 L140,110 L220,125 L300,90 L380,105 L460,70 L540,85 L620,55 L680,65"
            fill="none"
            stroke="#ff5a1f"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 5"
          />

          {/* Completed area + solid line */}
          <path
            d="M60,170 L140,140 L220,150 L300,115 L380,125 L460,95 L540,100 L620,75 L680,85 L680,220 L60,220 Z"
            fill="url(#areaGrad)"
          />
          <path
            d="M60,170 L140,140 L220,150 L300,115 L380,125 L460,95 L540,100 L620,75 L680,85"
            fill="none"
            stroke="#141413"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points on completed line */}
          <g fill="#141413">
            <circle cx="60" cy="170" r="3" />
            <circle cx="140" cy="140" r="3" />
            <circle cx="220" cy="150" r="3" />
            <circle cx="300" cy="115" r="3" />
            <circle cx="380" cy="125" r="3" />
            <circle cx="460" cy="95" r="3" />
            <circle cx="540" cy="100" r="3" />
            <circle cx="620" cy="75" r="4" fill="#fff" stroke="#141413" strokeWidth="2.4" />
            <circle cx="680" cy="85" r="3" />
          </g>

          {/* X-axis labels */}
          <g>
            <text className="tick-label" x="60" y="245" textAnchor="middle">W37</text>
            <text className="tick-label" x="140" y="245" textAnchor="middle">W38</text>
            <text className="tick-label" x="220" y="245" textAnchor="middle">W39</text>
            <text className="tick-label" x="300" y="245" textAnchor="middle">W40</text>
            <text className="tick-label" x="380" y="245" textAnchor="middle">W41</text>
            <text className="tick-label" x="460" y="245" textAnchor="middle">W42</text>
            <text className="tick-label" x="540" y="245" textAnchor="middle">W43</text>
            <text className="tick-label" x="620" y="245" textAnchor="middle" fill="#141413" fontWeight="600">W44</text>
            <text className="tick-label" x="680" y="245" textAnchor="middle">W45</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
