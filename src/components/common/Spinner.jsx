export default function Spinner({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-4',
  }

  return (
    <div
      className={`${sizeMap[size] || sizeMap.md} rounded-full border-current/30 border-t-current animate-spin inline-block shrink-0 ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}
