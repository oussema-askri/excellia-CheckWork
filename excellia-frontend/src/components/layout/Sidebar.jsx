import { NavLink } from 'react-router-dom'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon,
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'

const adminLinks = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
  { name: 'Employees', href: '/admin/employees', icon: UsersIcon },
  { name: 'Attendance', href: '/admin/attendance', icon: ClockIcon },
  { name: 'Planning', href: '/admin/planning', icon: CalendarDaysIcon },
  { name: 'Feuille de présence', href: '/admin/presence', icon: CalendarDaysIcon },
  { name: 'Devices', href: '/admin/devices', icon: DevicePhoneMobileIcon },
]

// Zitouna sees everything except Devices
const zitounaLinks = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
  { name: 'Employees', href: '/admin/employees', icon: UsersIcon },
  { name: 'Attendance', href: '/admin/attendance', icon: ClockIcon },
  { name: 'Planning', href: '/admin/planning', icon: CalendarDaysIcon },
  { name: 'Feuille de présence', href: '/admin/presence', icon: CalendarDaysIcon },
]

const employeeLinks = [
  { name: 'Dashboard', href: '/employee/dashboard', icon: HomeIcon },
  { name: 'My Attendance', href: '/employee/attendance', icon: ClockIcon },
  { name: 'My Planning', href: '/employee/planning', icon: CalendarDaysIcon },
  { name: 'Feuille de présence', href: '/employee/presence', icon: CalendarDaysIcon },
]

export default function Sidebar({ isOpen, onClose, role = 'employee', isCollapsed, toggleCollapse }) {
  let links = employeeLinks
  if (role === 'admin') links = adminLinks
  if (role === 'zitouna') links = zitounaLinks

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen pt-16 transition-all duration-300 ease-in-out
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
        `}
      >
        <div className={`hidden lg:flex items-center px-3 py-3 border-b border-gray-100 dark:border-gray-700 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-sm border border-gray-200 dark:border-gray-600"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex lg:hidden justify-end px-4 py-2">
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.name}
                to={link.href}
                onClick={onClose}
                title={isCollapsed ? link.name : ''}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                  }
                  ${isCollapsed ? 'justify-center' : ''}
                  `
                }
              >
                <link.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? 'scale-110' : ''}`} />
                {!isCollapsed && (
                  <span className="whitespace-nowrap overflow-hidden transition-opacity duration-300">
                    {link.name}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="w-50 h-35 mb-6 mx-auto">
              <img src="/logo/logo.png" alt="Excellia" className="h-20 w-auto mb-6 mx-auto object-contain" />
            </div>
          </div>
        )}
      </aside>
    </>
  )
}