import { Link } from 'react-router-dom'
import { HomeIcon } from '@heroicons/react/24/outline'
import Button from '../components/common/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mt-4">Page Not Found</h2>
        <p className="text-gray-500 mt-2">
          Sorry, the page you're looking for doesn't exist.
        </p>
        <div className="mt-8">
          <Link to="/">
            <Button icon={HomeIcon}>
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}