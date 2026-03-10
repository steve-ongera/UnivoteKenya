import { useAuth } from '../context/AuthContext';

export default function Navbar({ collapsed, onMobileToggle, title }) {
  const { user } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  const roleBadge = {
    student: { label: 'Student', cls: 'student' },
    iebc: { label: 'IEBC Official', cls: 'iebc' },
    admin: { label: 'Admin', cls: 'admin' },
  }[user?.role || 'student'];

  return (
    <header className={`topbar ${collapsed ? 'collapsed' : ''}`}>
      <div className="topbar-left">
        {/* Mobile hamburger */}
        <button
          className="btn btn-ghost"
          style={{ padding: '0.4rem', display: 'none' }}
          id="mobile-menu-btn"
          onClick={onMobileToggle}
        >
          <i className="bi bi-list" style={{ fontSize: '1.4rem' }} />
        </button>
        <span className="topbar-page-title">{title || 'UniVote Kenya'}</span>
      </div>

      <div className="topbar-right">
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#22c55e' }}>
          <span className="live-dot" />
          Live
        </div>

        {/* User pill */}
        <div className="topbar-user">
          <div className="topbar-avatar">
            {user?.profile_photo
              ? <img src={user.profile_photo} alt="" />
              : initials
            }
          </div>
          <div>
            <div className="topbar-name">{user?.full_name?.split(' ')[0]}</div>
            <div className="topbar-role">{user?.registration_number}</div>
          </div>
        </div>

        <span className={`role-badge ${roleBadge?.cls}`}>
          <i className={`bi ${user?.role === 'admin' ? 'bi-shield-check' : user?.role === 'iebc' ? 'bi-bank' : 'bi-mortarboard'}`} />
          {roleBadge?.label}
        </span>
      </div>
    </header>
  );
}