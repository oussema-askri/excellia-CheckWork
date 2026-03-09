import { NavLink } from 'react-router-dom'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  HomeIcon,
  UsersIcon,
  ClockIcon,
  CalendarDaysIcon,
  DevicePhoneMobileIcon,
  InboxStackIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import { TruckIcon, MoonIcon } from '@heroicons/react/24/outline'

const adminLinks = [
  {
    section: 'Overview', items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
    ]
  },
  {
    section: 'Management', items: [
      { name: 'Employees', href: '/admin/employees', icon: UsersIcon },
      { name: 'Requests', href: '/admin/requests', icon: InboxStackIcon },
      { name: 'Attendance', href: '/admin/attendance', icon: ClockIcon },
      { name: 'Planning', href: '/admin/planning', icon: CalendarDaysIcon },
      { name: 'Presence Sheet', href: '/admin/presence', icon: CalendarDaysIcon },
    ]
  },
  {
    section: 'System', items: [
      { name: 'Devices', href: '/admin/devices', icon: DevicePhoneMobileIcon },
      { name: 'Wassalni', href: '/admin/wassalni', icon: TruckIcon },
      { name: 'Night Shifts', href: '/admin/night-shifts', icon: MoonIcon },
    ]
  },
  {
    section: 'Personal', items: [
      { name: 'My Profile', href: '/admin/profile', icon: UserCircleIcon },
    ]
  },
]

const zitounaLinks = [
  {
    section: 'Overview', items: [
      { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
    ]
  },
  {
    section: 'Management', items: [
      { name: 'Employees', href: '/admin/employees', icon: UsersIcon },
      { name: 'Attendance', href: '/admin/attendance', icon: ClockIcon },
      { name: 'Planning', href: '/admin/planning', icon: CalendarDaysIcon },
      { name: 'Presence Sheet', href: '/admin/presence', icon: CalendarDaysIcon },
    ]
  },
  {
    section: 'Personal', items: [
      { name: 'My Profile', href: '/admin/profile', icon: UserCircleIcon },
    ]
  },
]

const employeeLinks = [
  {
    section: 'Overview', items: [
      { name: 'Dashboard', href: '/employee/dashboard', icon: HomeIcon },
    ]
  },
  {
    section: 'My Work', items: [
      { name: 'My Attendance', href: '/employee/attendance', icon: ClockIcon },
      { name: 'My Planning', href: '/employee/planning', icon: CalendarDaysIcon },
      { name: 'Presence Sheet', href: '/employee/presence', icon: CalendarDaysIcon },
    ]
  },
  {
    section: 'Personal', items: [
      { name: 'My Profile', href: '/employee/profile', icon: UserCircleIcon },
    ]
  },
]

export default function Sidebar({ isOpen, onClose, role = 'employee', isCollapsed, toggleCollapse }) {
  let linkGroups = employeeLinks
  if (role === 'admin') linkGroups = adminLinks
  if (role === 'zitouna') linkGroups = zitounaLinks

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
          bg-white dark:bg-gray-800 border-r border-gray-200/80 dark:border-gray-700/80 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <div className={`hidden lg:flex items-center px-3 py-3 border-b border-gray-100 dark:border-gray-700/50 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          <button
            onClick={toggleCollapse}
            className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
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
          <nav className="space-y-6">
            {linkGroups.map((group, gIdx) => (
              <div key={group.section}>
                {/* Section label — hidden when collapsed */}
                {!isCollapsed && (
                  <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {group.section}
                  </p>
                )}
                {isCollapsed && gIdx > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700/50 mb-2" />
                )}
                <div className="space-y-0.5">
                  {group.items.map((link) => (
                    <NavLink
                      key={link.name}
                      to={link.href}
                      onClick={onClose}
                      title={isCollapsed ? link.name : ''}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative
                        ${isActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
                        }
                        ${isCollapsed ? 'justify-center' : ''}
                        `
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {/* Active indicator bar */}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 dark:bg-indigo-400 rounded-r-full" />
                          )}
                          <link.icon className={`w-5 h-5 flex-shrink-0 transition-all duration-200 ${isCollapsed ? 'scale-110' : ''} ${isActive ? '' : 'group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`} />
                          {!isCollapsed && (
                            <span className="whitespace-nowrap overflow-hidden transition-opacity duration-300">
                              {link.name}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {!isCollapsed && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700/50">
            <div className="flex justify-center">
              <img src="/logo/logo.png" alt="Excellia" className="h-10 w-auto object-contain opacity-60" />
            </div>
          </div>
        )}
      </aside>
    </>
  )
}