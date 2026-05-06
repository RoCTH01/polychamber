interface Props {
  label: string
  value: string | number
  accent?: boolean
}

export default function Kpi({ label, value, accent }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div className="mono" style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.08em' }}>{label}</div>
      <div className="mono tab" style={{ fontSize: 'var(--fs-lg)', color: accent ? 'var(--accent)' : 'var(--text)', fontWeight: 500 }}>
        {value}
      </div>
    </div>
  )
}
