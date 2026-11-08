export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string }>
  label?: string | number
  formatter?: (value: number | string, name: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl bg-primary px-3 py-2 text-white shadow-[7px_7px_14px_rgba(31,46,38,0.18)]">
      {label != null && label !== '' ? (
        <p className="mb-1.5 text-[11px] font-medium text-white/70">{label}</p>
      ) : null}
      <div className="space-y-1">
        {payload.map((item, i) => {
          const name = String(item.name ?? item.dataKey ?? '')
          const value = item.value ?? '—'
          return (
            <div key={i} className="flex items-center gap-2 text-xs text-white">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color || '#fff' }} />
              <span className="text-white/75">{name}</span>
              <span className="ms-auto font-semibold tabular-nums">
                {formatter ? formatter(value, name) : value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
