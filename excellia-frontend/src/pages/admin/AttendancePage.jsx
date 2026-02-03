import { useState, useEffect } from 'react'
import { FunnelIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import attendanceApi from '../../api/attendanceApi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Badge from '../../components/common/Badge'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Loading from '../../components/common/Loading'

const statusOptions = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'on-leave', label: 'On Leave' },
]

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

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
    status: '',
  })
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 })
  
  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '', status: '', notes: '' })
  const [editLoading, setEditLoading] = useState(false)
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => { fetchAttendance() }, [pagination.page, filters])

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const params = { page: pagination.page, limit: pagination.limit, startDate: filters.startDate, endDate: filters.endDate }
      if (filters.status) params.status = filters.status
      const response = await attendanceApi.getAll(params)
      setAttendance(response.data || [])
      setPagination(prev => ({ ...prev, ...response.pagination }))
    } catch (error) {
      toast.error(error.message || 'Failed to fetch attendance')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    setEditForm({
      checkIn: record.checkIn ? dayjs(record.checkIn).format('YYYY-MM-DDTHH:mm') : '',
      checkOut: record.checkOut ? dayjs(record.checkOut).format('YYYY-MM-DDTHH:mm') : '',
      status: record.status,
      notes: record.notes || ''
    })
    setEditModalOpen(true)
  }

  const handleEditSubmit = async () => {
    setEditLoading(true)
    try {
      const data = { status: editForm.status, notes: editForm.notes }
      if (editForm.checkIn) data.checkIn = new Date(editForm.checkIn).toISOString()
      if (editForm.checkOut) data.checkOut = new Date(editForm.checkOut).toISOString()
      await attendanceApi.update(editingRecord._id, data)
      toast.success('Attendance updated')
      setEditModalOpen(false)
      fetchAttendance()
    } catch (error) {
      toast.error(error.message || 'Update failed')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = (record) => {
    setDeletingRecord(record)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleteLoading(true)
    try {
      await attendanceApi.delete(deletingRecord._id)
      toast.success('Attendance deleted')
      setDeleteDialogOpen(false)
      fetchAttendance()
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <p className="text-gray-500 dark:text-gray-400">View and manage employee attendance</p>
        </div>
        <Button variant="secondary" icon={FunnelIcon} onClick={() => setShowFilters(!showFilters)}>
          {showFilters ? 'Hide Filters' : 'Filters'}
        </Button>
      </div>

      {showFilters && (
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input type="date" label="Start Date" value={filters.startDate} onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))} />
            <Input type="date" label="End Date" value={filters.endDate} onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))} />
            <Select label="Status" options={statusOptions} value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} placeholder="All Statuses" />
            <div className="flex items-end">
              <Button variant="secondary" onClick={() => setFilters({ startDate: dayjs().startOf('month').format('YYYY-MM-DD'), endDate: dayjs().endOf('month').format('YYYY-MM-DD'), status: '' })} className="w-full">Clear</Button>
            </div>
          </div>
        </Card>
      )}

      <Card noPadding className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex justify-center py-16"><Loading size="lg" /></div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">No attendance records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Check In</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Check Out</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Hours</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {attendance.map(record => (
                  <tr key={record._id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">{record.userId?.name?.charAt(0) || '?'}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{record.userId?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{record.userId?.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{dayjs(record.date).format('MMM D, YYYY')}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{dayjs(record.date).format('dddd')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${record.checkIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        {record.checkIn ? dayjs(record.checkIn).format('hh:mm A') : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${record.checkOut ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                        {record.checkOut ? dayjs(record.checkOut).format('hh:mm A') : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900 dark:text-white">{record.workHours ? `${record.workHours.toFixed(1)}h` : '—'}</span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(record)} className="text-indigo-600 dark:text-indigo-400"><PencilIcon className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(record)} className="text-red-600 dark:text-red-400"><TrashIcon className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pagination.total > 0 && <Pagination currentPage={pagination.page} totalPages={pagination.pages} totalItems={pagination.total} itemsPerPage={pagination.limit} onPageChange={(page) => setPagination(prev => ({ ...prev, page }))} />}
      </Card>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Attendance" footer={
        <>
          <Button variant="secondary" onClick={() => setEditModalOpen(false)} disabled={editLoading}>Cancel</Button>
          <Button onClick={handleEditSubmit} loading={editLoading}>Save Changes</Button>
        </>
      }>
        {editingRecord && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="font-semibold text-gray-900 dark:text-white">{editingRecord.userId?.name}</p>
              <p className="text-sm text-gray-500">{dayjs(editingRecord.date).format('dddd, MMMM D, YYYY')}</p>
            </div>
            <Input type="datetime-local" label="Check In" value={editForm.checkIn} onChange={(e) => setEditForm(prev => ({ ...prev, checkIn: e.target.value }))} />
            <Input type="datetime-local" label="Check Out" value={editForm.checkOut} onChange={(e) => setEditForm(prev => ({ ...prev, checkOut: e.target.value }))} />
            <Select label="Status" options={statusOptions} value={editForm.status} onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Add notes..." />
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDeleteConfirm} title="Delete Attendance" message={`Delete attendance record for ${deletingRecord?.userId?.name} on ${deletingRecord ? dayjs(deletingRecord.date).format('MMM D, YYYY') : ''}?`} loading={deleteLoading} />
    </div>
  )
}