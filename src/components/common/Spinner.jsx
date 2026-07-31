export default function Spinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
    xl: 'w-14 h-14 border-4',
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-full border-indigo-500/30 border-t-indigo-400 animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
