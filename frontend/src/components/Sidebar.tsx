import React from 'react';
import { NavLink } from 'react-router-dom';
import { MonitorPlay, Bell, Users, Car } from 'lucide-react';
import { useSurveillanceStore } from '../store';

const NAV = [
  { to: '/', icon: MonitorPlay, label: 'Command Center' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/humans', icon: Users, label: 'Humans' },
  { to: '/vehicles', icon: Car, label: 'Vehicles' },
];

export const Sidebar: React.FC = () => {
  const { unreadAlertCount } = useSurveillanceStore();
  return (
    <nav className="w-[76px] bg-surface-900 border-r border-surface-600 flex flex-col items-center py-2 shrink-0">
      {NAV.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center w-full h-14 transition-colors group ${
              isActive
                ? 'text-gray-100'
                : 'text-gray-500 hover:text-gray-300'
            }`
          }
          title={label}
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-gray-400" />}
              <Icon className="w-4 h-4 mb-1" />
              <span className="max-w-full px-1 text-[7px] tracking-[0.08em] leading-none uppercase whitespace-nowrap">{label.split(' ')[0]}</span>
              {label === 'Notifications' && unreadAlertCount > 0 && (
                <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-alert-critical border-2 border-surface-900" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};
