interface Props { name: string }

export default function Icon({ name }: Props) {
  const p = { className: 'tb-icon', viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'grid':   return <svg {...p}><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>
    case 'filter': return <svg {...p}><path d="M2 3h12l-4.5 6V14L6.5 12V9L2 3Z"/></svg>
    case 'clock':  return <svg {...p}><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>
    case 'plus':   return <svg {...p}><path d="M8 3v10M3 8h10"/></svg>
    case 'search': return <svg {...p}><circle cx="7" cy="7" r="4.5"/><path d="m11 11 3 3"/></svg>
    case 'sun':    return <svg {...p}><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5 13 13M3 13l1.5-1.5M11.5 4.5 13 3"/></svg>
    case 'moon':   return <svg {...p}><path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5Z"/></svg>
    case 'cog':    return <svg {...p}><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M15 8h-2M3 8H1M12.7 3.3l-1.4 1.4M4.7 11.3l-1.4 1.4M12.7 12.7l-1.4-1.4M4.7 4.7 3.3 3.3"/></svg>
    default: return null
  }
}
