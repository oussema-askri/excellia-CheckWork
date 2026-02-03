import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, DevicePhoneMobileIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import userApi from '../../api/userApi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Table from '../../components/common/Table'
import Badge from '../../components/common/Badge'
import Pagination from '../../components/common/Pagination'
import ConfirmDialog from '../../components/common/ConfirmDialog'

export default function DevicesPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, search])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await userApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role: 'employee',
        isActive: true
      })
      setUsers(response.data)
      setPagination(response.pagination)
    } catch (error) {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleResetClick = (user) => {
    setSelectedUser(user)
    setConfirmOpen(true)
  }

  const handleConfirmReset = async () => {
    setActionLoading(true)
    try {
      await userApi.resetDevice(selectedUser._id)
      toast.success(`Device unbound for ${selectedUser.name}`)
      setConfirmOpen(false)
      fetchUsers() // Refresh list
    } catch (error) {
      toast.error('Failed to reset device')
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    {
      header: 'Employee',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => row.department || '—',
    },
    {
      header: 'Device Status',
      render: (row) => (
        row.hasLinkedDevice ? (
          <Badge variant="success" dot>Linked</Badge>
        ) : (
          <Badge variant="gray">No Device</Badge>
        )
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        row.hasLinkedDevice ? (
          <Button
            size="sm"
            variant="danger"
            icon={NoSymbolIcon}
            onClick={(e) => {
              e.stopPropagation()
              handleResetClick(row)
            }}
          >
            Unlink Device
          </Button>
        ) : (
          <span className="text-gray-400 text-sm italic">No action needed</span>
        )
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Management</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage mobile device bindings for employees</p>
      </div>

      <Card>
        <div className="max-w-md">
          <Input
            icon={MagnifyingGlassIcon}
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card noPadding>
        <Table
          columns={columns}
          data={users}
          loading={loading}
          emptyMessage="No employees found"
        />
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={(page) => setPagination({ ...pagination, page })}
        />
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmReset}
        title="Unlink Device"
        message={`Are you sure you want to unlink the device for ${selectedUser?.name}? They will be able to login from a NEW device immediately.`}
        confirmText="Unlink"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  )
}