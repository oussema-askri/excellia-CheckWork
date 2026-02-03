import { useState, useEffect } from 'react'
import { ClockIcon, CalendarDaysIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import attendanceApi from '../../api/attendanceApi'
import planningApi from '../../api/planningApi'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import CheckInOut from '../../components/attendance/CheckInOut'
import Loading from '../../components/common/Loading'

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [upcomingShifts, setUpcomingShifts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [attendanceRes, planningRes] = await Promise.all([
        attendanceApi.getMy({
          startDate: dayjs().startOf('month').format('YYYY-MM-DD'),
          endDate: dayjs().endOf('month').format('YYYY-MM-DD'),
        }),
        planningApi.getMy({
          startDate: dayjs().format('YYYY-MM-DD'),
          endDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
        }),
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
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Hello, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Here's your attendance overview</p>
      </div>

      {/* Check In/Out Card */}
      <CheckInOut />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <CheckCircleIcon className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Days Present</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.presentDays || 0}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">This month</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-100 dark:bg-sky-900/30 rounded-xl">
              <ClockIcon className="w-7 h-7 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Hours Worked</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.totalHours || 0}h</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">This month</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <CalendarDaysIcon className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Days Late</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.lateDays || 0}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">This month</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Shifts */}
      <Card 
        title="Upcoming Shifts" 
        subtitle="Your schedule for the next 7 days"
        className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
      >
        {upcomingShifts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No upcoming shifts scheduled
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingShifts.map((shift, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {dayjs(shift.date).format('DD')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                      {dayjs(shift.date).format('MMM')}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {dayjs(shift.date).format('dddd')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {shift.startTime} - {shift.endTime}
                    </p>
                  </div>
                </div>
                <Badge variant={
                  shift.shift === 'Morning' ? 'info' :
                  shift.shift === 'Afternoon' ? 'warning' :
                  shift.shift === 'Night' ? 'gray' : 'success'
                }>
                  {shift.shift}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}