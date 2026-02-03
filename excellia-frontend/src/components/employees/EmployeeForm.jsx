import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '../common/Modal'
import Input from '../common/Input'
import Select from '../common/Select'
import Button from '../common/Button'

const roleOptions = [
  { value: 'employee', label: 'Employee' },
  { value: 'admin', label: 'Admin' },
]

const departmentOptions = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'HR', label: 'Human Resources' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Operations', label: 'Operations' },
]

export default function EmployeeForm({
  isOpen,
  onClose,
  onSubmit,
  employee = null,
  loading = false,
}) {
  const isEditing = !!employee

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      employeeId: '',
      name: '',
      email: '',
      password: '',
      role: 'employee',
      department: '',
      position: '',
      phone: '',
    },
  })

  useEffect(() => {
    if (employee) {
      reset({
        employeeId: employee.employeeId || '',
        name: employee.name || '',
        email: employee.email || '',
        password: '',
        role: employee.role || 'employee',
        department: employee.department || '',
        position: employee.position || '',
        phone: employee.phone || '',
      })
    } else {
      reset({
        employeeId: '',
        name: '',
        email: '',
        password: '',
        role: 'employee',
        department: '',
        position: '',
        phone: '',
      })
    }
  }, [employee, reset])

  const handleFormSubmit = (data) => {
    // Remove password if editing and not changed
    if (isEditing && !data.password) {
      delete data.password
    }
    onSubmit(data)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Employee' : 'Add New Employee'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="employee-form"
            loading={loading}
          >
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Employee ID"
            placeholder="EMP001"
            error={errors.employeeId?.message}
            disabled={isEditing}
            {...register('employeeId', {
              required: 'Employee ID is required',
            })}
          />
          
          <Input
            label="Full Name"
            placeholder="John Doe"
            error={errors.name?.message}
            {...register('name', {
              required: 'Name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="john@example.com"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            })}
          />
          
          <Input
            label={isEditing ? 'New Password (leave blank to keep)' : 'Password'}
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password', {
              required: isEditing ? false : 'Password is required',
              minLength: isEditing ? undefined : { value: 6, message: 'Password must be at least 6 characters' },
            })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Role"
            options={roleOptions}
            error={errors.role?.message}
            {...register('role')}
          />
          
          <Select
            label="Department"
            options={departmentOptions}
            placeholder="Select department"
            {...register('department')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Position"
            placeholder="Software Developer"
            {...register('position')}
          />
          
          <Input
            label="Phone"
            placeholder="+1234567890"
            {...register('phone')}
          />
        </div>
      </form>
    </Modal>
  )
}