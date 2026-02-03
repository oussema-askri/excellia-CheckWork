import dayjs from 'dayjs'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Button from '../common/Button'

const getShiftBadge = (shift) => {
  const config = {
    'Morning': { variant: 'info', label: 'Morning' },
    'Afternoon': { variant: 'warning', label: 'Afternoon' },
    'Night': { variant: 'gray', label: 'Night' },
    'Full Day': { variant: 'success', label: 'Full Day' },
  }
  const { variant, label } = config[shift] || { variant: 'gray', label: shift }
  return <Badge variant={variant}>{label}</Badge>
}

export default function PlanningTable({
  data,
  loading,
  showEmployee = true,
  showActions = false,
  onEdit,
  onDelete,
}) {
  const columns = [
    ...(showEmployee ? [{
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs">
              {row.employeeName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white">{row.employeeName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{row.employeeId}</p>
          </div>
        </div>
      ),
    }] : []),
    {
      header: 'Date',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{dayjs(row.date).format('MMM D, YYYY')}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{dayjs(row.date).format('dddd')}</p>
        </div>
      ),
    },
    {
      header: 'Shift',
      render: (row) => getShiftBadge(row.shift),
    },
    {
      header: 'Start Time',
      render: (row) => (
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">{row.startTime}</span>
      ),
    },
    {
      header: 'End Time',
      render: (row) => (
        <span className="font-semibold text-red-600 dark:text-red-400">{row.endTime}</span>
      ),
    },
    {
      header: 'Duration',
      render: (row) => {
        const [startH, startM] = row.startTime.split(':').map(Number)
        const [endH, endM] = row.endTime.split(':').map(Number)
        let duration = (endH * 60 + endM) - (startH * 60 + startM)
        if (duration < 0) duration += 24 * 60
        const hours = Math.floor(duration / 60)
        const minutes = duration % 60
        return (
          <span className="text-gray-600 dark:text-gray-300 font-medium">
            {hours}h {minutes > 0 ? `${minutes}m` : ''}
          </span>
        )
      },
    },
    ...(showActions ? [{
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(row)
              }}
              className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row)
              }}
              className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    }] : []),
  ]

  return (
    <Table
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage="No planning entries found"
    />
  )
}