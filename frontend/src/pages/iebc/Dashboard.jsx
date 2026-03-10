import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { iebcAPI, electionAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function IEBCDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([iebcAPI.dashboardStats(), electionAPI.list()])
      .then(([s, els]) => { setStats(s); setElections(els); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="IEBC Dashboard">
      <div className="page-enter">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">IEBC Control Panel</h1>
            <p className="page-subtitle">University Electoral Commission — Operations Dashboard</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => navigate('/iebc/elections')}>
              <i className="bi bi-plus-lg" /> New Election
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/iebc/students')}>
              <i className="bi bi-person-plus" /> Register Student
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon green"><i className="bi bi-mortarboard-fill" /></div>
            <div>
              <div className="stat-value">{stats?.total_students ?? '—'}</div>
              <div className="stat-label">Registered Students</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon gold"><i className="bi bi-person-check-fill" /></div>
            <div>
              <div className="stat-value">{stats?.registered_voters ?? '—'}</div>
              <div className="stat-label">Approved Voters</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue"><i className="bi bi-journal-check" /></div>
            <div>
              <div className="stat-value">{stats?.active_elections ?? '—'}</div>
              <div className="stat-label">Active Elections</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><i className="bi bi-hourglass-split" /></div>
            <div>
              <div className="stat-value">{stats?.pending_registrations ?? '—'}</div>
              <div className="stat-label">Pending Voter Regs</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><i className="bi bi-ballot-fill" /></div>
            <div>
              <div className="stat-value">{stats?.total_votes_cast ?? '—'}</div>
              <div className="stat-label">Total Votes Cast</div>
            </div>
          </div>
        </div>

        {/* Elections Table */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title"><i className="bi bi-journal-check" /> Elections</span>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/iebc/elections')}>Manage</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Academic Year</th>
                  <th>Voting Window</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {elections.map(el => (
                  <tr key={el.id}>
                    <td style={{ fontWeight: 600 }}>{el.title}</td>
                    <td>{el.academic_year}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {new Date(el.voting_start).toLocaleDateString()} → {new Date(el.voting_end).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge ${
                        el.status === 'active' ? 'badge-success' :
                        el.status === 'closed' ? 'badge-danger' :
                        el.status === 'results_out' ? 'badge-info' : 'badge-warning'
                      }`}>
                        {el.status === 'active' && <span className="live-dot" style={{ marginRight: 4 }} />}
                        {el.status_display}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/iebc/results/${el.id}`)}>
                          <i className="bi bi-bar-chart" /> Results
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/iebc/candidates?election=${el.id}`)}>
                          <i className="bi bi-people" /> Candidates
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {elections.length === 0 && (
                  <tr><td colSpan={5} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No elections created yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {[
            { icon: 'bi-person-plus-fill', label: 'Register Student', color: 'green', path: '/iebc/students' },
            { icon: 'bi-clipboard-check-fill', label: 'Review Voter Registrations', color: 'gold', path: '/iebc/voter-regs' },
            { icon: 'bi-person-badge-fill', label: 'Manage Candidates', color: 'blue', path: '/iebc/candidates' },
            { icon: 'bi-megaphone-fill', label: 'Post Announcement', color: 'red', path: '/iebc/announcements' },
          ].map(a => (
            <button key={a.path} className="card" style={{ border: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={() => navigate(a.path)}>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div className={`stat-icon ${a.color}`}><i className={`bi ${a.icon}`} /></div>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}