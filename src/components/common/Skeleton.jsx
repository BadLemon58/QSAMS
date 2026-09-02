export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-[#e2e8f0] rounded-[12px] ${className}`}
      {...props}
    />
  )
}

export function CourseCardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#ffffff] border border-[#e2e8f0] rounded-[22px] p-5 flex flex-col justify-between gap-4 shadow-sm"
        >
          <div>
            {/* Icon + Join Code Badge */}
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="w-16 h-6 rounded-md" />
            </div>

            {/* Course Title */}
            <Skeleton className="h-5 w-3/4 mb-2 rounded-md" />
            {/* Course Description */}
            <Skeleton className="h-3.5 w-1/2 mb-3 rounded-md" />

            {/* Time / Schedule Badge */}
            <Skeleton className="h-6 w-36 rounded-lg mt-2" />
          </div>

          {/* Footer & Buttons */}
          <div className="space-y-3 pt-3 border-t border-[#e2e8f0]">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 rounded" />
              <Skeleton className="h-3.5 w-16 rounded" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-[14px]" />
              <Skeleton className="h-9 flex-1 rounded-[14px]" />
              <Skeleton className="h-9 w-9 rounded-[12px]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function StudentCourseCardSkeleton({ count = 2 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 flex flex-col justify-between gap-4 shadow-sm"
        >
          <div>
            <div className="flex items-start justify-between mb-2">
              <Skeleton className="h-5 w-1/2 rounded-md" />
              <Skeleton className="h-6 w-12 rounded-md" />
            </div>
            <Skeleton className="h-5 w-32 rounded-md mb-3" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-3 w-24 rounded" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TableRowSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full divide-y divide-[#e2e8f0]">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="w-6 h-4 rounded" />
          <div className="flex items-center gap-2.5 flex-1">
            <Skeleton className="w-7 h-7 rounded-full shrink-0" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
          <Skeleton className="h-4 w-24 rounded hidden sm:block" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function StatCardsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#ffffff] border border-[#e2e8f0] rounded-[20px] p-5 shadow-sm space-y-2">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      ))}
    </div>
  )
}

export function QrBoxSkeleton() {
  return (
    <div className="w-[250px] h-[250px] rounded-[24px] bg-[#ffffff] flex flex-col items-center justify-center p-6 shadow-sm border border-[#e2e8f0] relative">
      <Skeleton className="w-full h-full rounded-[18px]" />
    </div>
  )
}

export default Skeleton
