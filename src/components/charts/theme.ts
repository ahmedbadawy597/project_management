/** Chart theme aligned to StrategyIT projectsdb palette */
export const chartTheme = {
  grid: '#E4DFD0',
  axis: '#8A9184',
  tick: '#6B7468',
  tooltipBg: '#1F6B47',
  tooltipText: '#FFFFFF',
  planned: '#A8C4B4',
  actual: '#1F6B47',
  navy: '#1F2E26',
  royal: '#1F6B47',
  blue: '#2F8159',
  teal: '#3D9A6A',
  success: '#1F6B47',
  warning: '#C4922A',
  danger: '#C45C4A',
  muted: '#D9D3BF',
  fontFamily: '"Cairo", "IBM Plex Sans Arabic", ui-sans-serif, system-ui, sans-serif',
}

export const statusColors: Record<string, string> = {
  'On Track': '#1F6B47',
  'At Risk': '#C4922A',
  Delayed: '#C45C4A',
  Planned: '#A8C4B4',
  Completed: '#2F8159',
  Active: '#1F6B47',
}

export const axisProps = {
  tick: { fill: chartTheme.tick, fontSize: 11, fontFamily: chartTheme.fontFamily },
  axisLine: { stroke: chartTheme.grid },
  tickLine: false as const,
}

export const gridProps = {
  strokeDasharray: '0',
  stroke: chartTheme.grid,
  vertical: false,
}
