import { useState, useEffect } from 'react'
import { CheckIcon, XMarkIcon, InboxStackIcon, DocumentIcon, ClockIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import attendanceApi from '../../api/attendanceApi'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Table from '../../components/common/Table'
import Badge from '../../components/common/Badge'
import dayjs from 'dayjs'

export default function RequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false) // Toggle history

  const fetchRequests = async () => {
    try {
      setLoading(true)
      // If history, show all statuses except present/late. If not, only pending.
      const statusFilter = showHistory ? '' : 'pending-absence';
      
      const response = await attendanceApi.getAll({ 
        limit: 100, 
        status: statusFilter,
        // For history we might need to filter more specifically in backend or here
        // But getAll supports status param.
      })
      
      let data = response.data || [];
      if (!showHistory) {
        data = data.filter(r => r.status === 'pending-absence');
      } else {
        data = data.filter(r => ['pending-absence', 'absent'].includes(r.status) && r.absenceType);
      }
      
      setRequests(data)
    } catch (error) {
      toast.error('Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRequests() }, [showHistory])

  const handleApprove = async (id) => {
    try { await attendanceApi.approve(id); toast.success('Approved'); fetchRequests(); } 
    catch (e) { toast.error('Failed to approve'); }
  }

  const handleReject = async (id) => {
    try { await attendanceApi.reject(id); toast.success('Rejected'); fetchRequests(); } 
    catch (e) { toast.error('Failed to reject'); }
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
      header: 'Type',
      render: (row) => <Badge variant="info">{row.absenceType || 'Other'}</Badge>
    },
    {
      header: 'Reason',
      render: (row) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 italic">
          {row.absenceReason || row.notes || '—'}
        </span>
      ),
    },
    {
      header: 'Attachment',
      render: (row) => row.attachment ? (
        <a href={`${import.meta.env.VITE_API_URL.replace('/api', '')}/${row.attachment}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-indigo-600 hover:underline text-sm">
          <DocumentIcon className="w-4 h-4 mr-1" /> View File
        </a>
      ) : <span className="text-xs text-gray-400">None</span>
    },
    {
      header: 'Status',
      render: (row) => (
        row.status === 'pending-absence' 
          ? <Badge variant="warning">Pending</Badge> 
          : <Badge variant={row.status === 'absent' ? 'success' : 'danger'}>{row.status === 'absent' ? 'Approved' : 'Rejected'}</Badge>
      )
    },
    {
      header: 'Actions',
      render: (row) => row.status === 'pending-absence' ? (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="success" onClick={() => handleApprove(row._id)} icon={CheckIcon}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(row._id)} icon={XMarkIcon}>Reject</Button>
        </div>
      ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Absence Requests</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage employee leave requests.</p>
        </div>
        <Button variant="secondary" onClick={() => setShowHistory(!showHistory)} icon={ClockIcon}>
          {showHistory ? 'Show Pending Only' : 'Show History'}
        </Button>
      </div>

      <Card noPadding>
        {requests.length === 0 && !loading ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <InboxStackIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg font-medium">No requests found</p>
          </div>
        ) : (
          <Table columns={columns} data={requests} loading={loading} emptyMessage="No requests" />
        )}
      </Card>
    </div>
  )
}