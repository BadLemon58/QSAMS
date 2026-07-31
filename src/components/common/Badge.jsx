const variants = {
  present: 'badge-present',
  absent:  'badge-absent',
  late:    'badge-late',
  excused: 'badge-excused',
  default: 'bg-slate-700/60 text-slate-300 border border-slate-600/50 px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1',
}

const dots = {
  present: '●',
  absent:  '●',
  late:    '●',
  excused: '●',
}

export default function Badge({ status, label, className = '' }) {
  const cls = variants[status] || variants.default
  return (
    <span className={`${cls} ${className}`}>
      {dots[status] && <span className="text-[8px]">{dots[status]}</span>}
      {label || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown')}
    </span>
  )
}
