import { useState, useEffect } from 'react'
import { PlusIcon, MagnifyingGlassIcon, UsersIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
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

const HIDDEN_ADMIN_EMAIL = 'admintest@excellia.tn'

export default function EmployeesPage() {
  const { user } = useAuth()
  const isZitouna = user?.role === 'zitouna'
  const isAdmin = user?.role === 'admin'

  // Tab state: 'employees' or 'admins'
  const [activeTab, setActiveTab] = useState('employees')

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
    fetchData()
  }, [pagination.page, search, activeTab])

  const fetchData = async () => {
    try {
      setLoading(true)
      const role = activeTab === 'admins' ? 'admin' : 'employee'
      const response = await userApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role,
      })

      let data = response.data
      // Filter out the invisible admin on the frontend
      if (activeTab === 'admins') {
        data = data.filter(u => u.email !== HIDDEN_ADMIN_EMAIL)
      }

      setEmployees(data)
      setPagination(response.pagination)
    } catch (error) {
      toast.error(`Failed to fetch ${activeTab}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setSearch('')
    setPagination({ page: 1, limit: 10, total: 0, pages: 1 })
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
      toast.success(`${activeTab === 'admins' ? 'Admin' : 'Employee'} ${employee.isActive ? 'deactivated' : 'activated'}`)
      fetchData()
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
      fetchData()
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
      toast.success(`${activeTab === 'admins' ? 'Admin' : 'Employee'} deleted successfully`)
      setDeleteDialogOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.message || 'Delete failed')
    } finally {
      setDeleteLoading(false)
    }
  }

  const isEmployeesTab = activeTab === 'employees'
  const isAdminsTab = activeTab === 'admins'

  return (
    <div className="space-y-6 animate-page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isAdminsTab ? 'Administrators' : 'Employees'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {isAdminsTab ? 'View and manage admin accounts' : 'Manage your team members'}
          </p>
        </div>
        {/* Add Employee button — only for Employees tab, non-zitouna */}
        {!isZitouna && isEmployeesTab && (
          <Button onClick={handleCreate} icon={PlusIcon}>
            Add Employee
          </Button>
        )}
      </div>

      {/* Tabs — Admins tab only visible to admin role */}
      {isAdmin && (
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
          <button
            onClick={() => handleTabChange('employees')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isEmployeesTab
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <UsersIcon className="w-4 h-4" />
            Employees
          </button>
          <button
            onClick={() => handleTabChange('admins')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isAdminsTab
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <ShieldCheckIcon className="w-4 h-4" />
            Admins
          </button>
        </div>
      )}

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              icon={MagnifyingGlassIcon}
              placeholder={isAdminsTab ? 'Search admins...' : 'Search employees...'}
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
          onEdit={!isZitouna && isEmployeesTab ? handleEdit : undefined}
          onDelete={!isZitouna ? handleDelete : undefined}
          onToggleStatus={!isZitouna && isEmployeesTab ? handleToggleStatus : undefined}
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
          {isEmployeesTab && (
            <EmployeeForm
              isOpen={formOpen}
              onClose={() => setFormOpen(false)}
              onSubmit={handleFormSubmit}
              employee={selectedEmployee}
              loading={formLoading}
            />
          )}

          <ConfirmDialog
            isOpen={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={handleDeleteConfirm}
            title={isAdminsTab ? 'Delete Admin' : 'Delete Employee'}
            message={`Are you sure you want to delete ${employeeToDelete?.name}? This action cannot be undone.`}
            loading={deleteLoading}
          />
        </>
      )}
    </div>
  )
}