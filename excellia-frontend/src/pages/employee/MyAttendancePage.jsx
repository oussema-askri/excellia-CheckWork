import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import attendanceApi from '../../api/attendanceApi'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import AttendanceTable from '../../components/attendance/AttendanceTable'

export default function MyAttendancePage() {
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
    endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  })

  useEffect(() => {
    fetchAttendance()
  }, [pagination.page, filters])

  const fetchAttendance = async () => {
    try {
      setLoading(true)
      const response = await attendanceApi.getMy({
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      })
      setAttendance(response.data || [])
      setPagination(prev => ({ ...prev, ...response.pagination }))
    } catch (error) {
      toast.error('Failed to fetch attendance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Attendance</h1>
        <p className="text-gray-500 dark:text-gray-400">View your attendance history</p>
      </div>

      {/* Filters */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Start Date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <Input
            type="date"
            label="End Date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>
      </Card>

      {/* Table */}
      <Card noPadding className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <AttendanceTable
          data={attendance}
          loading={loading}
          showEmployee={false}
        />
        {pagination.total > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
          />
        )}
      </Card>
    </div>
  )
}