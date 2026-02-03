import { useState, useEffect } from 'react'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import userApi from '../../api/userApi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import EmployeeList from '../../components/employees/EmployeeList'
import EmployeeForm from '../../components/employees/EmployeeForm'
import ConfirmDialog from '../../components/common/ConfirmDialog'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  })

  // Modal states
  const [formOpen, setFormOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [pagination.page, search])

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const response = await userApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role: 'employee',
      })
      setEmployees(response.data)
      setPagination(response.pagination)
    } catch (error) {
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedEmployee(null)
    setFormOpen(true)
  }

  const handleEdit = (employee) => {
    setSelectedEmployee(employee)
    setFormOpen(true)
  }

  const handleDelete = (employee) => {
    setEmployeeToDelete(employee)
    setDeleteDialogOpen(true)
  }

  const handleFormSubmit = async (data) => {
    setFormLoading(true)
    try {
      if (selectedEmployee) {
        await userApi.update(selectedEmployee._id, data)
        toast.success('Employee updated successfully')
      } else {
        await userApi.create(data)
        toast.success('Employee created successfully')
      }
      setFormOpen(false)
      fetchEmployees()
    } catch (error) {
      toast.error(error.message || 'Operation failed')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      await userApi.delete(employeeToDelete._id)
      toast.success('Employee deleted successfully')
      setDeleteDialogOpen(false)
      fetchEmployees()
    } catch (error) {
      toast.error(error.message || 'Delete failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleToggleStatus = async (employee) => {
    try {
      await userApi.toggleStatus(employee._id)
      toast.success(`Employee ${employee.isActive ? 'deactivated' : 'activated'}`)
      fetchEmployees()
    } catch (error) {
      toast.error(error.message || 'Status update failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500">Manage your team members</p>
        </div>
        <Button onClick={handleCreate} icon={PlusIcon}>
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              icon={MagnifyingGlassIcon}
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card noPadding>
        <EmployeeList
          employees={employees}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={handleToggleStatus}
        />
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={(page) => setPagination({ ...pagination, page })}
        />
      </Card>

      {/* Employee Form Modal */}
      <EmployeeForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        employee={selectedEmployee}
        loading={formLoading}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Employee"
        message={`Are you sure you want to delete ${employeeToDelete?.name}? This action cannot be undone.`}
        loading={deleteLoading}
      />
    </div>
  )
}