import { useState, useEffect } from 'react'
import { ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon, TruckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import toast from 'react-hot-toast'
import attendanceApi from '../../api/attendanceApi'
import { useAuth } from '../../hooks/useAuth'
import Card from '../common/Card'
import Button from '../common/Button'
import Badge from '../common/Badge'

export default function CheckInOut() {
  const { user } = useAuth()
  const [currentTime, setCurrentTime] = useState(dayjs())
  const [todayAttendance, setTodayAttendance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [showTransportModal, setShowTransportModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // 'checkin' or 'checkout'

  // Only show transport prompt for Consultant employees
  const isConsultant = (user?.position || '').toLowerCase().includes('consultant')

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

  const performCheckIn = async (transportMethod = 'none') => {
    setActionLoading(true);
    try {
      const pos = await getCurrentPosition();
      const location = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };

      const response = await attendanceApi.checkIn({ location, transportMethod });
      setTodayAttendance(response.data.attendance);
      toast.success('Checked in successfully!');
    } catch (error) {
      const msg =
        error?.message ||
        error?.response?.data?.message ||
        'Failed to check in (location required).';

      if (error?.code === 1) toast.error('Location permission denied.');
      else if (error?.code === 2) toast.error('Location unavailable.');
      else if (error?.code === 3) toast.error('Location request timed out.');
      else toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const performCheckOut = async (transportMethod = 'none') => {
    setActionLoading(true)
    try {
      const response = await attendanceApi.checkOut({ transportMethod })
      setTodayAttendance(response.data.attendance)
      toast.success('Checked out successfully!')
    } catch (error) {
      toast.error(error.message || 'Failed to check out')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckInClick = () => {
    if (isConsultant) {
      setPendingAction('checkin')
      setShowTransportModal(true)
    } else {
      performCheckIn('none')
    }
  }

  const handleCheckOutClick = () => {
    if (isConsultant) {
      setPendingAction('checkout')
      setShowTransportModal(true)
    } else {
      performCheckOut('none')
    }
  }

  const handleTransportSelect = (method) => {
    setShowTransportModal(false)
    if (pendingAction === 'checkin') {
      performCheckIn(method)
    } else {
      performCheckOut(method)
    }
    setPendingAction(null)
  }

  const hasCheckedIn = !!todayAttendance?.checkIn
  const hasCheckedOut = !!todayAttendance?.checkOut

  return (
    <>
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
              onClick={hasCheckedIn ? handleCheckOutClick : handleCheckInClick}
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

      {/* Transport Method Modal (Consultant only) */}
      {showTransportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TruckIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Transportation Method
                </h3>
              </div>
              <button
                onClick={() => { setShowTransportModal(false); setPendingAction(null) }}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              How did you get to work today?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleTransportSelect('wassalni')}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group"
              >
                <span className="text-2xl">🚕</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400">WASSALNI</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Company taxi service</p>
                </div>
              </button>

              <button
                onClick={() => handleTransportSelect('personal')}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <span className="text-2xl">🚗</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400">Personal Transport</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Own vehicle or other</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}