import { useState, useEffect } from 'react'
import { ClockIcon, CalendarDaysIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon, PaperClipIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import attendanceApi from '../../api/attendanceApi'
import planningApi from '../../api/planningApi'
import { useAuth } from '../../hooks/useAuth'
import StatsCard from '../../components/dashboard/StatsCard'
import CheckInOut from '../../components/attendance/CheckInOut'
import Card from '../../components/common/Card'
import PlanningTable from '../../components/planning/PlanningTable'
import Loading from '../../components/common/Loading'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import toast from 'react-hot-toast'

const LEAVE_REQUEST_URL = 'https://msstn.sharepoint.com/sites/MSSAdminHRTasks/Lists/MSS%20Demande%20de%20congs/NewForm.aspx';

const ABSENCE_TYPES = [
  { value: 'Repos', label: 'Repos' },
  { value: 'Maladie', label: 'Maladie' },
  { value: 'Other', label: 'Other' },
];

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [upcomingShifts, setUpcomingShifts] = useState([])
  const [loading, setLoading] = useState(true)
  const [todayStatus, setTodayStatus] = useState(null)

  // Absence Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [absenceType, setAbsenceType] = useState('Repos')
  const [reason, setReason] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [attendanceRes, planningRes, todayRes] = await Promise.all([
        attendanceApi.getMy({
          startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
          endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
        }),
        planningApi.getMy({
          startDate: dayjs().format('YYYY-MM-DD'),
          endDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
        }),
        attendanceApi.getToday()
      ])

      const attendances = attendanceRes.data || []
      const presentDays = attendances.filter(a => a.status === 'present' || a.status === 'late').length
      const totalHours = attendances.reduce((sum, a) => sum + (a.workHours || 0), 0)

      setStats({
        presentDays,
        totalHours: totalHours.toFixed(1),
        lateDays: attendances.filter(a => a.status === 'late').length,
      })

      setUpcomingShifts(planningRes.data || [])
      setTodayStatus(todayRes.data?.attendance)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmitAbsence = async (e) => {
    e.preventDefault()
    if (!absenceType) return toast.error('Please select a type')
    if (!reason) return toast.error('Please enter a reason')

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('type', absenceType)
      formData.append('reason', reason)
      if (file) formData.append('file', file)

      // Use raw axios call or update api to support formData automatically
      // Assuming attendanceApi.markAbsent handles FormData (we updated mobile, need to ensure web api does too)
      await attendanceApi.markAbsent(formData)
      
      toast.success('Request submitted successfully')
      setModalOpen(false)
      fetchDashboardData()
      window.open(LEAVE_REQUEST_URL, '_blank')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  const isCheckedIn = !!todayStatus?.checkIn
  const isAbsent = todayStatus?.status === 'absent'
  const isPending = todayStatus?.status === 'pending-absence'

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Hello, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Here's your attendance overview</p>
      </div>

      {/* Status Banners */}
      {isPending && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 flex items-center gap-3">
          <ClockIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="font-bold text-yellow-800 dark:text-yellow-300">Request Pending</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">Waiting for admin approval.</p>
          </div>
        </div>
      )}

      {isAbsent && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <XCircleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-bold text-red-800 dark:text-red-300">Marked Absent</p>
            <p className="text-sm text-red-700 dark:text-red-400">You are marked as absent today.</p>
          </div>
        </div>
      )}

      {/* Check In/Out Card */}
      {!isAbsent && !isPending && <CheckInOut onUpdate={fetchDashboardData} />}

      {/* Request Absence Button */}
      {!isCheckedIn && !isAbsent && !isPending && (
        <div className="flex justify-center">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors"
          >
            <DocumentTextIcon className="w-5 h-5" />
            I am Absent Today
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Days Present"
          value={stats?.presentDays || 0}
          icon={CheckCircleIcon}
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatsCard
          title="Total Hours"
          value={`${stats?.totalHours || 0}h`}
          icon={ClockIcon}
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatsCard
          title="Days Late"
          value={stats?.lateDays || 0}
          icon={CalendarDaysIcon}
          iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
          iconColor="text-yellow-600 dark:text-yellow-400"
        />
      </div>

      {/* Upcoming Shifts */}
      <Card title="Upcoming Shifts" subtitle="Your schedule for the next 7 days" noPadding>
        <PlanningTable
          data={upcomingShifts}
          loading={false}
          showEmployee={false}
        />
      </Card>

      {/* Absence Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Request Absence"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitAbsence} loading={submitting} variant="danger">
              Submit Request
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmitAbsence} className="space-y-4">
          <Select
            label="Type"
            options={ABSENCE_TYPES}
            value={absenceType}
            onChange={(e) => setAbsenceType(e.target.value)}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Why are you absent?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Attachment (Optional)
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <PaperClipIcon className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {file ? file.name : 'PDF, PNG, JPG (MAX. 5MB)'}
                  </p>
                </div>
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}