export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 animate-pulse">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-800 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800" />
          ))}
        </div>
      </div>
    </div>
  )
}
