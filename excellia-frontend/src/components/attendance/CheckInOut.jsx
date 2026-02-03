import { useState, useEffect } from 'react'
import { ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import attendanceApi from '../../api/attendanceApi'
import Card from '../common/Card'
import Button from '../common/Button'
import Badge from '../common/Badge'

export default function CheckInOut() {
  const [currentTime, setCurrentTime] = useState(dayjs())
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(dayjs())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchTodayAttendance()
  }, [])

  const fetchTodayAttendance = async () => {
    try {
      const response = await attendanceApi.getToday()
      setTodayAttendance(response.data.attendance)
    } catch (error) {
      console.error('Failed to fetch today attendance:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCurrentPosition = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported on this device/browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const pos = await getCurrentPosition();
      const location = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        // optional:
        accuracy: pos.coords.accuracy,
      };

      const response = await attendanceApi.checkIn({ location });
      setTodayAttendance(response.data.attendance);
      toast.success('Checked in successfully!');
    } catch (error) {
      // backend error message
      const msg =
        error?.message ||
        error?.response?.data?.message ||
        'Failed to check in (location required).';

      // browser errors (permission denied, timeout, etc.)
      if (error?.code === 1) toast.error('Location permission denied.');
      else if (error?.code === 2) toast.error('Location unavailable.');
      else if (error?.code === 3) toast.error('Location request timed out.');
      else toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setActionLoading(true)
    try {
      const response = await attendanceApi.checkOut()
      setTodayAttendance(response.data.attendance)
      toast.success('Checked out successfully!')
    } catch (error) {
      toast.error(error.message || 'Failed to check out')
    } finally {
      setActionLoading(false)
    }
  }

  const hasCheckedIn = !!todayAttendance?.checkIn
  const hasCheckedOut = !!todayAttendance?.checkOut

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="text-center py-6">
        {/* Current Time */}
        <div className="mb-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {currentTime.format('dddd, MMMM D, YYYY')}
          </p>
          <p className="text-5xl font-bold text-gray-900 dark:text-white mt-2 font-mono">
            {currentTime.format('HH:mm:ss')}
          </p>
        </div>

        {/* Status */}
        <div className="mb-6">
          {loading ? (
            <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto animate-pulse" />
          ) : hasCheckedOut ? (
            <Badge variant="info" size="lg">Day Complete ✓</Badge>
          ) : hasCheckedIn ? (
            <Badge variant="success" size="lg" dot>Currently Working</Badge>
          ) : (
            <Badge variant="warning" size="lg">Not Checked In</Badge>
          )}
        </div>

        {/* Check In/Out Times */}
        {todayAttendance && (
          <div className="flex justify-center gap-8 mb-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check In</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {todayAttendance.checkIn
                  ? dayjs(todayAttendance.checkIn).format('HH:mm')
                  : '--:--'
                }
              </p>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check Out</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                {todayAttendance.checkOut
                  ? dayjs(todayAttendance.checkOut).format('HH:mm')
                  : '--:--'
                }
              </p>
            </div>
            <div className="w-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Work Hours</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                {todayAttendance.workHours
                  ? `${todayAttendance.workHours.toFixed(1)}h`
                  : '--'
                }
              </p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!loading && !hasCheckedOut && (
          <Button
            size="xl"
            variant={hasCheckedIn ? 'danger' : 'success'}
            onClick={hasCheckedIn ? handleCheckOut : handleCheckIn}
            loading={actionLoading}
            icon={hasCheckedIn ? ArrowLeftOnRectangleIcon : ArrowRightOnRectangleIcon}
            className="px-12"
          >
            {hasCheckedIn ? 'Check Out' : 'Check In'}
          </Button>
        )}

        {hasCheckedOut && (
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ You've completed your workday
          </p>
        )}
      </div>
    </Card>
  )
}