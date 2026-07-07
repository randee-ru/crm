"use client";

type AttendanceOccupancyChartProps = {
  points: { time: string; count: number }[];
};

export function AttendanceOccupancyChart({ points }: AttendanceOccupancyChartProps) {
  if (points.length === 0) {
    return <div className="attendance-chart-empty">Нет данных для графика посещаемости.</div>;
  }

  const maxCount = Math.max(...points.map((point) => point.count), 1);
  const width = 960;
  const height = 180;
  const padding = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const coordinates = points.map((point, index) => {
    const x = padding.left + (index / Math.max(points.length - 1, 1)) * innerWidth;
    const y = padding.top + innerHeight - (point.count / maxCount) * innerHeight;
    return { ...point, x, y };
  });

  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="attendance-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="attendance-chart" role="img" aria-label="График посещаемости">
        {[0, 0.5, 1].map((ratio) => {
          const y = padding.top + innerHeight * (1 - ratio);
          const value = Math.round(maxCount * ratio);
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                className="attendance-chart-grid"
              />
              <text x={8} y={y + 4} className="attendance-chart-axis">
                {value}
              </text>
            </g>
          );
        })}
        <polyline points={polyline} className="attendance-chart-line" />
        {coordinates.map((point) => (
          <circle key={point.time} cx={point.x} cy={point.y} r="3" className="attendance-chart-dot" />
        ))}
      </svg>
      <div className="attendance-chart-labels">
        {coordinates
          .filter((_, index) => index % 4 === 0 || index === coordinates.length - 1)
          .map((point) => (
            <span key={point.time}>{point.time}</span>
          ))}
      </div>
    </div>
  );
}
