import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const studentNav = [
  { section: 'Main' },
  { path: '/student/dashboard', icon: 'bi-house-door', label: 'Dashboard' },
  { path: '/student/vote', icon: 'bi-ballot', label: 'Cast Your Vote' },
  { path: '/student/results', icon: 'bi-bar-chart-line', label: 'Live Results' },
  { path: '/student/my-profile', icon: 'bi-person-circle', label: 'My Profile' },
  { section: 'Info' },
  { path: '/student/announcements', icon: 'bi-megaphone', label: 'Announcements' },
  { path: '/student/candidates', icon: 'bi-people', label: 'View Candidates' },
];

const iebcNav = [
  { section: 'Operations' },
  { path: '/iebc/dashboard', icon: 'bi-speedometer2', label: 'Dashboard' },
  { path: '/iebc/elections', icon: 'bi-journal-check', label: 'Elections' },
  { path: '/iebc/students', icon: 'bi-person-plus', label: 'Register Students' },
  { path: '/iebc/voter-regs', icon: 'bi-clipboard-check', label: 'Voter Registrations' },
  { path: '/iebc/candidates', icon: 'bi-person-badge', label: 'Candidates' },
  { section: 'Monitor' },
  { path: '/iebc/results', icon: 'bi-bar-chart', label: 'Live Results' },
  { path: '/iebc/announcements', icon: 'bi-megaphone', label: 'Announcements' },
];

const adminNav = [
  { section: 'Admin' },
  { path: '/admin/dashboard', icon: 'bi-shield-check', label: 'Admin Dashboard' },
  { path: '/admin/users', icon: 'bi-people-fill', label: 'Users' },
  { path: '/admin/elections', icon: 'bi-journal-check', label: 'Elections' },
  { path: '/admin/candidates', icon: 'bi-person-badge', label: 'Candidates' },
  { path: '/admin/results', icon: 'bi-bar-chart', label: 'Results' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = user?.role === 'admin' ? adminNav
    : user?.role === 'iebc' ? iebcNav
    : studentNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const cx = ['sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <aside className={cx}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <i className="bi bi-ballot-fill" />
        </div>
        <div className="sidebar-logo-text">
          Uni<span>Vote</span> Kenya
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="nav-section-label">{item.section}</div>;
          }
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : ''}
            >
              <i className={`bi ${item.icon}`} />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="nav-item"
          onClick={handleLogout}
          title={collapsed ? 'Logout' : ''}
          style={{ marginBottom: '0.5rem' }}
        >
          <i className="bi bi-box-arrow-left" />
          <span className="nav-label">Logout</span>
        </button>
        <button className="sidebar-toggle" onClick={onToggle}>
          <i className={`bi ${collapsed ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}