import { Fragment } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, Transition } from '@headlessui/react'
import {
  Bars3Icon,
  KeyIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../contexts/ThemeContext'

// Map route segments to readable labels
const ROUTE_LABELS = {
  admin: 'Admin',
  employee: 'Employee',
  dashboard: 'Dashboard',
  employees: 'Employees',
  requests: 'Requests',
  attendance: 'Attendance',
  planning: 'Planning',
  presence: 'Presence Sheet',
  devices: 'Devices',
  wassalni: 'Wassalni',
  profile: 'My Profile',
}

function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length < 2) return null

  return (
    <div className="hidden md:flex items-center gap-1 text-sm">
      {segments.map((seg, i) => {
        const label = ROUTE_LABELS[seg] || seg
        const isLast = i === segments.length - 1
        return (
          <Fragment key={seg}>
            {i > 0 && <ChevronRightIcon className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 mx-0.5" />}
            <span
              className={
                isLast
                  ? 'font-semibold text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-gray-500'
              }
            >
              {label}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()

  return (
    <nav className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 fixed w-full z-30 top-0">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden transition-colors"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <Breadcrumbs />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            {/* Notification bell */}
            <button
              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors relative"
              title="Notifications"
            >
              <BellIcon className="h-5 w-5" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* User menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shadow-sm">
                  <span className="text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                </div>
              </Menu.Button>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg ring-1 ring-black/5 dark:ring-gray-700 focus:outline-none border border-gray-100 dark:border-gray-700">
                  <div className="p-2">
                    <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 mb-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.email}</p>
                    </div>

                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to={user?.role === 'admin' ? '/admin/dashboard' : '/employee/dashboard'}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors ${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                        >
                          <UserCircleIcon className="h-4.5 w-4.5 text-gray-400 dark:text-gray-500" />
                          Dashboard
                        </Link>
                      )}
                    </Menu.Item>

                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          to={['admin', 'zitouna'].includes(user?.role) ? '/admin/profile' : '/employee/profile'}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors ${active ? 'bg-gray-100 dark:bg-gray-700' : ''
                            }`}
                        >
                          <KeyIcon className="h-4.5 w-4.5 text-gray-400 dark:text-gray-500" />
                          My Profile
                        </Link>
                      )}
                    </Menu.Item>

                    <hr className="my-2 border-gray-100 dark:border-gray-700" />

                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={logout}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm w-full text-red-600 dark:text-red-400 transition-colors ${active ? 'bg-red-50 dark:bg-red-900/20' : ''
                            }`}
                        >
                          <ArrowRightOnRectangleIcon className="h-4.5 w-4.5" />
                          Logout
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  )
}