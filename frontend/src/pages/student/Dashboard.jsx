import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { electionAPI, studentAPI, announcementAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [voterStatus, setVoterStatus] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [regMsg, setRegMsg] = useState('');

  useEffect(() => {
    Promise.all([
      electionAPI.active(),
      announcementAPI.list(),
    ]).then(([elections, ann]) => {
      const active = elections[0] || null;
      setElection(active);
      setAnnouncements(ann.slice(0, 5));
      if (active) {
        studentAPI.voterStatus(active.id).then(setVoterStatus).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, []);

  const handleRegister = async () => {
    if (!election) return;
    setRegLoading(true);
    try {
      await studentAPI.registerVoter({ election_id: election.id, student_id_number: user.student_id });
      setRegMsg('Registration submitted! Awaiting IEBC approval.');
      setVoterStatus({ status: 'pending' });
    } catch (err) {
      setRegMsg(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  const yearSuffix = (y) => ['st','nd','rd'][y-1] || 'th';

  return (
    <Layout title="Student Dashboard">
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title">
            Welcome, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="page-subtitle">
            {user?.programme} · Year {user?.current_year}{yearSuffix(user?.current_year)} Year · {user?.school}
          </p>
        </div>

        {/* Student Info Card */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card">
            <div className="card-body" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className={`avatar avatar-lg`} style={{ background: 'var(--green-pale)' }}>
                {user?.profile_photo
                  ? <img src={user.profile_photo} alt="" />
                  : user?.full_name?.split(' ').map(n => n[0]).join('').slice(0,2)
                }
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>{user?.full_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <i className="bi bi-person-vcard" style={{ marginRight: 4 }} />{user?.registration_number}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <i className="bi bi-telephone" style={{ marginRight: 4 }} />{user?.phone}
                </div>
                <div style={{ marginTop: '0.4rem' }}>
                  <span className="badge badge-success">{user?.programme_display}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Voter Status */}
          <div className="card">
            <div className="card-header">
              <span className="card-title"><i className="bi bi-clipboard-check" /> Voter Status</span>
            </div>
            <div className="card-body">
              {loading ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="spinner spinner-dark" /> Loading…
                </div>
              ) : !election ? (
                <div className="alert alert-info"><i className="bi bi-info-circle" />No active election at this time.</div>
              ) : voterStatus?.status === 'approved' ? (
                <div>
                  <div className="badge badge-success" style={{ marginBottom: '0.75rem', fontSize: '0.85rem', padding: '0.4rem 0.9rem' }}>
                    <i className="bi bi-patch-check-fill" /> Approved Voter
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    You are cleared to vote in <strong>{election.title}</strong>.
                  </p>
                  <button className="btn btn-primary" onClick={() => navigate('/student/vote')}>
                    <i className="bi bi-ballot" /> Go Vote Now
                  </button>
                </div>
              ) : voterStatus?.status === 'pending' ? (
                <div className="alert alert-warning"><i className="bi bi-hourglass-split" />
                  Registration pending IEBC approval. You'll be notified once approved.
                </div>
              ) : voterStatus?.status === 'rejected' ? (
                <div className="alert alert-error"><i className="bi bi-x-circle-fill" />
                  Registration rejected: {voterStatus.rejection_reason}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                    Register to vote in <strong>{election.title}</strong>
                  </p>
                  {regMsg && <div className="alert alert-info"><i className="bi bi-info-circle" />{regMsg}</div>}
                  <button className="btn btn-primary" onClick={handleRegister} disabled={regLoading || !!regMsg}>
                    {regLoading ? <><span className="spinner" /> Registering…</> : <><i className="bi bi-person-check" /> Register as Voter</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Election */}
        {election && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <span className="card-title">
                <span className="live-dot" style={{ marginRight: 6 }} />
                Active Election
              </span>
              <span className="badge badge-success">LIVE</span>
            </div>
            <div className="card-body">
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '0.25rem' }}>{election.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Academic Year: {election.academic_year} &nbsp;|&nbsp;
                Voting: {new Date(election.voting_start).toLocaleString()} – {new Date(election.voting_end).toLocaleString()}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => navigate('/student/results')}>
                  <i className="bi bi-bar-chart-line" /> Live Results
                </button>
                <button className="btn btn-outline" onClick={() => navigate('/student/candidates')}>
                  <i className="bi bi-people" /> View Candidates
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcements */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><i className="bi bi-megaphone" /> Latest Announcements</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {announcements.length === 0 ? (
              <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No announcements yet.</div>
            ) : announcements.map(a => (
              <div key={a.id} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.title}</div>
                  <span className={`badge ${
                    a.category === 'election' ? 'badge-info' :
                    a.category === 'result' ? 'badge-success' :
                    a.category === 'warning' ? 'badge-danger' : 'badge-grey'
                  }`}>{a.category}</span>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{a.body}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}