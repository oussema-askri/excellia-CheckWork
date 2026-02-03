import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

export default function StatsCard({
  title,
  value,
  icon: Icon,
  change,
  changeType = 'neutral',
  iconBgColor = 'bg-primary-100',
  iconColor = 'text-primary-600',
}) {
  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            
            {change !== undefined && (
              <div className="flex items-center mt-2">
                {changeType === 'increase' ? (
                  <ArrowUpIcon className="w-4 h-4 text-green-500" />
                ) : changeType === 'decrease' ? (
                  <ArrowDownIcon className="w-4 h-4 text-red-500" />
                ) : null}
                <span
                  className={`text-sm font-medium ml-1 ${
                    changeType === 'increase'
                      ? 'text-green-600'
                      : changeType === 'decrease'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {change}
                </span>
                <span className="text-sm text-gray-500 ml-1">vs last month</span>
              </div>
            )}
          </div>
          
          <div className={`p-3 rounded-xl ${iconBgColor}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </div>
    </div>
  )
}