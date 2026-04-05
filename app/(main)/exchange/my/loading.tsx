export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 animate-pulse">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-36 rounded bg-gray-200 dark:bg-gray-800 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800" />
          ))}
        </div>
        <div className="h-80 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800" />
      </div>
    </div>
  )
}
