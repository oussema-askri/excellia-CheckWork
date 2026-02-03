import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Table from '../common/Table'
import Badge from '../common/Badge'
import Button from '../common/Button'

export default function EmployeeList({
  employees,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
}) {
  const columns = [
    {
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-semibold text-sm">
              {row.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{row.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Employee ID',
      render: (row) => (
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {row.employeeId}
        </span>
      ),
    },
    {
      header: 'Department',
      render: (row) => (
        <span className="text-gray-600 dark:text-gray-300">
          {row.department || '—'}
        </span>
      ),
    },
    {
      header: 'Position',
      render: (row) => (
        <span className="text-gray-600 dark:text-gray-300">
          {row.position || '—'}
        </span>
      ),
    },
    {
      header: 'Role',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'primary' : 'gray'}>
          {row.role === 'admin' ? 'Admin' : 'Employee'}
        </Badge>
      ),
    },
    {
      header: 'Status',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleStatus(row)
          }}
          className="focus:outline-none"
        >
          <Badge variant={row.isActive ? 'success' : 'danger'} dot>
            {row.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
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
        </div>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      data={employees}
      loading={loading}
      emptyMessage="No employees found"
    />
  )
}