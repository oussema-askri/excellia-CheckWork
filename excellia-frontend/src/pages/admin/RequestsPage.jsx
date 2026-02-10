import { useState, useEffect } from 'react'
import { CheckIcon, XMarkIcon, InboxStackIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import attendanceApi from '../../api/attendanceApi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Table from '../../components/common/Table'
import dayjs from 'dayjs'

export default function RequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const response = await attendanceApi.getAll({ 
        limit: 100, 
        status: 'pending-absence' 
      })
      setRequests(response.data || [])
    } catch (error) {
      console.error(error) // ✅ Fix: Handle error
      toast.error('Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [])

  const handleApprove = async (id) => {
    try {
      await attendanceApi.approve(id)
      toast.success('Approved')
      fetchRequests()
    } catch (e) { 
      console.error(e) // ✅ Fix
      toast.error('Failed to approve') 
    }
  }

  const handleReject = async (id) => {
    try {
      await attendanceApi.reject(id)
      toast.success('Rejected')
      fetchRequests()
    } catch (e) { 
      console.error(e) // ✅ Fix
      toast.error('Failed to reject') 
    }
  }

  const columns = [
    {
      header: 'Employee',
      render: (row) => (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{row.userId?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{row.userId?.department}</p>
        </div>
      ),
    },
    {
      header: 'Date',
      render: (row) => (
        <span className="text-gray-700 dark:text-gray-300">
          {dayjs(row.date).format('MMM D, YYYY')}
        </span>
      ),
    },
    {
      header: 'Reason',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 italic">
          {row.notes || '—'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="success" onClick={() => handleApprove(row._id)} icon={CheckIcon}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(row._id)} icon={XMarkIcon}>Reject</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Absence Requests</h1>
        <p className="text-gray-500 dark:text-gray-400">Approve or reject employee absence requests.</p>
      </div>

      <Card noPadding>
        {requests.length === 0 && !loading ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <InboxStackIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">No pending requests</p>
          </div>
        ) : (
          <Table 
            columns={columns} 
            data={requests} 
            loading={loading} 
            emptyMessage="No pending requests" 
          />
        )}
      </Card>
    </div>
  )
}