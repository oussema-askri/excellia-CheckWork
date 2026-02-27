import { useState } from 'react'
import { KeyIcon, UserCircleIcon, EnvelopeIcon, BuildingOfficeIcon, BriefcaseIcon, PhoneIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import authApi from '../../api/authApi'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'

export default function ProfilePage() {
    const { user } = useAuth()

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)

    const handleChangePassword = async (e) => {
        e.preventDefault()

        if (!currentPassword || !newPassword || !confirmPassword) {
            return toast.error('Please fill in all password fields')
        }
        if (newPassword.length < 6) {
            return toast.error('New password must be at least 6 characters')
        }
        if (newPassword !== confirmPassword) {
            return toast.error('Passwords do not match')
        }

        setLoading(true)
        try {
            await authApi.changePassword({
                currentPassword,
                newPassword,
                confirmPassword,
            })
            toast.success('Password changed successfully')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error) {
            toast.error(error.message || 'Failed to change password')
        } finally {
            setLoading(false)
        }
    }

    const getRoleLabel = (role) => {
        if (role === 'admin') return 'Administrator'
        if (role === 'zitouna') return 'Auditor'
        return 'Employee'
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
                <p className="text-gray-500 dark:text-gray-400">View your information and manage your password</p>
            </div>

            {/* Profile Info Card */}
            <Card>
                <div className="flex items-center gap-5 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <span className="text-white font-bold text-2xl">
                            {user?.name?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 mt-1">
                            {getRoleLabel(user?.role)}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <EnvelopeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <UserCircleIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Employee ID</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white font-mono">{user?.employeeId || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <BuildingOfficeIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.department || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <BriefcaseIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Position</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.position || '—'}</p>
                        </div>
                    </div>
                    {user?.phone && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                            <PhoneIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.phone}</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Change Password Card */}
            <Card>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                        <KeyIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Change Password</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Update your account password</p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <Input
                        label="Current Password"
                        type="password"
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                    />
                    <Input
                        label="New Password"
                        type="password"
                        placeholder="Enter new password (min. 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                    />
                    <Input
                        label="Confirm New Password"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                    <div className="pt-2">
                        <Button type="submit" loading={loading}>
                            Update Password
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
