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
import { useAuth } from '../../hooks/useAuth'

export default function EmployeesPage() {
  const { user } = useAuth()
  const isZitouna = user?.role === 'zitouna'

  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })

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
    if (isZitouna) return
    setSelectedEmployee(null)
    setFormOpen(true)
  }

  const handleEdit = (employee) => {
    if (isZitouna) return
    setSelectedEmployee(employee)
    setFormOpen(true)
  }

  const handleDelete = (employee) => {
    if (isZitouna) return
    setEmployeeToDelete(employee)
    setDeleteDialogOpen(true)
  }

  const handleToggleStatus = async (employee) => {
    if (isZitouna) return
    try {
      await userApi.toggleStatus(employee._id)
      toast.success(`Employee ${employee.isActive ? 'deactivated' : 'activated'}`)
      fetchEmployees()
    } catch (error) {
      toast.error(error.message || 'Status update failed')
    }
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your team members</p>
        </div>
        {/* ✅ HIDE FOR ZITOUNA */}
        {!isZitouna && (
          <Button onClick={handleCreate} icon={PlusIcon}>
            Add Employee
          </Button>
        )}
      </div>

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

      <Card noPadding>
        <EmployeeList
          employees={employees}
          loading={loading}
          // ✅ PASS UNDEFINED IF ZITOUNA TO HIDE ACTIONS
          onEdit={!isZitouna ? handleEdit : undefined}
          onDelete={!isZitouna ? handleDelete : undefined}
          onToggleStatus={!isZitouna ? handleToggleStatus : undefined}
        />
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={(page) => setPagination({ ...pagination, page })}
        />
      </Card>

      {!isZitouna && (
        <>
          <EmployeeForm
            isOpen={formOpen}
            onClose={() => setFormOpen(false)}
            onSubmit={handleFormSubmit}
            employee={selectedEmployee}
            loading={formLoading}
          />

          <ConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={handleDeleteConfirm}
            title="Delete Employee"
            message={`Are you sure you want to delete ${employeeToDelete?.name}? This action cannot be undone.`}
            loading={deleteLoading}
          />
        </>
      )}
    </div>
  )
}