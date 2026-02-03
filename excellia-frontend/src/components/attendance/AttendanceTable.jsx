import dayjs from 'dayjs'
import Table from '../common/Table'
import Badge from '../common/Badge'

const getStatusBadge = (status) => {
  const config = {
    present: { variant: 'success', label: 'Present' },
    absent: { variant: 'danger', label: 'Absent' },
    late: { variant: 'warning', label: 'Late' },
    'half-day': { variant: 'info', label: 'Half Day' },
    'on-leave': { variant: 'gray', label: 'On Leave' },
  }
  const { variant, label } = config[status] || config['absent']
  return <Badge variant={variant}>{label}</Badge>
}

export default function AttendanceTable({ data, loading, showEmployee = true }) {
  const columns = [
    ...(showEmployee ? [{
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-xs">
              {row.userId?.name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white">{row.userId?.name || 'N/A'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{row.userId?.employeeId}</p>
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
      header: 'Check In',
      render: (row) => (
        <span className={`font-semibold ${row.checkIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
          {row.checkIn ? dayjs(row.checkIn).format('hh:mm A') : '—'}
        </span>
      ),
    },
    {
      header: 'Check Out',
      render: (row) => (
        <span className={`font-semibold ${row.checkOut ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
          {row.checkOut ? dayjs(row.checkOut).format('hh:mm A') : '—'}
        </span>
      ),
    },
    {
      header: 'Work Hours',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 dark:text-white">
            {row.workHours ? `${row.workHours.toFixed(1)}h` : '—'}
          </span>
          {row.overtimeHours > 0 && (
            <Badge variant="info" size="sm">+{row.overtimeHours.toFixed(1)}h OT</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      render: (row) => getStatusBadge(row.status),
    },
  ]

  return (
    <Table
      columns={columns}
      data={data}
      loading={loading}
      emptyMessage="No attendance records found"
    />
  )
}