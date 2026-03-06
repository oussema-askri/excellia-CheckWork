export default function Card({
  children,
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = '',
  noPadding = false,
  accent = false,
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 hover:shadow-md transition-shadow duration-200 relative overflow-hidden ${className}`}>
      {/* Optional accent bar */}
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
      )}
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
          <div>
            {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : `p-6 ${bodyClassName}`}>
        {children}
      </div>
    </div>
  )
}