import Modal from './Modal'
import Button from './Button'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showClose={false}>
      <div className="text-center py-4">
        <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full ${
          variant === 'danger' 
            ? 'bg-red-100 dark:bg-red-900/30' 
            : 'bg-amber-100 dark:bg-amber-900/30'
        }`}>
          <ExclamationTriangleIcon className={`h-7 w-7 ${
            variant === 'danger' 
              ? 'text-red-600 dark:text-red-400' 
              : 'text-amber-600 dark:text-amber-400'
          }`} />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 px-4">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}