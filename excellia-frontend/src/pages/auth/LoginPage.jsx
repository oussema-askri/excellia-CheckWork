import { useTheme } from '../../contexts/ThemeContext'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import LoginForm from '../../components/auth/LoginForm'

export default function LoginPage() {
  const { darkMode, toggleDarkMode } = useTheme()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {darkMode ? (
          <SunIcon className="h-6 w-6" />
        ) : (
          <MoonIcon className="h-6 w-6" />
        )}
      </button>

      <div className="max-w-md w-full">
        {/* Logo & Title */}
        <div className="w-80 h-auto mb-6 mx-auto">
          <img src="/logo/logo.png" alt="Excellia" className="h-20 w-auto mb-6 mx-auto object-contain" />
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome back</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Sign in to your account</p>
          </div>

          <LoginForm />
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-primary-200 dark:text-gray-500">
          © 2024 Excellia. All rights reserved.
        </p>
      </div>
    </div>
  )
}