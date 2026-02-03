import { ClockIcon, ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import Card from '../common/Card'
import Badge from '../common/Badge'

dayjs.extend(relativeTime)

export default function RecentActivity({ activities = [] }) {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'checkIn':
        return <ArrowRightOnRectangleIcon className="w-5 h-5 text-green-500" />
      case 'checkOut':
        return <ArrowLeftOnRectangleIcon className="w-5 h-5 text-blue-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <Card title="Recent Activity" noPadding>
      <div className="divide-y divide-gray-100">
        {activities.length === 0 ? (
          <p className="p-6 text-center text-gray-500">No recent activity</p>
        ) : (
          activities.map((activity, index) => (
            <div key={index} className="flex items-center gap-4 p-4 hover:bg-gray-50">
              <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.user?.name || 'Unknown User'}
                </p>
                <p className="text-sm text-gray-500">
                  {activity.type === 'checkIn' ? 'Checked in' : 'Checked out'}
                  {activity.time && ` at ${dayjs(activity.time).format('HH:mm')}`}
                </p>
              </div>
              <div className="flex-shrink-0">
                <Badge variant={activity.type === 'checkIn' ? 'success' : 'info'} size="sm">
                  {dayjs(activity.time).fromNow()}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}