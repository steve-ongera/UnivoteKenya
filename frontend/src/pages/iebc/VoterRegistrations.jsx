import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { iebcAPI, electionAPI } from '../../services/api';

export default function VoterRegistrations() {
  const [regs, setRegs] = useState([]);
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    const params = {};
    if (selectedElection) params.election_id = selectedElection;
    if (statusFilter) params.status = statusFilter;
    iebcAPI.getVoterRegistrations(params)
      .then(setRegs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { electionAPI.list().then(setElections); }, []);
  useEffect(() => { load(); }, [selectedElection, statusFilter]);

  const review = async (id, action, reason = '') => {
    setProcessing(p => ({ ...p, [id]: true }));
    try {
      await iebcAPI.reviewRegistration(id, { action, reason });
      setMsg(`Registration ${action}d successfully.`);
      load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setProcessing(p => ({ ...p, [id]: false }));
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const counts = {
    pending: regs.filter(r => r.status === 'pending').length,
    approved: regs.filter(r => r.status === 'approved').length,
    rejected: regs.filter(r => r.status === 'rejected').length,
  };

  return (
    <Layout title="Voter Registrations">
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title">Voter Registration Review</h1>
          <p className="page-subtitle">Approve or reject student voter registration applications</p>
        </div>

        {msg && <div className="alert alert-success"><i className="bi bi-check-circle-fill" />{msg}</div>}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-input no-icon" style={{ width: 220 }}
            value={selectedElection} onChange={e => setSelectedElection(e.target.value)}>
            <option value="">All Elections</option>
            {elections.map(el => <option key={el.id} value={el.id}>{el.title}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['pending','approved','rejected',''].map(s => (
              <button key={s} className={`position-tab ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}>
                {s || 'All'}
                {s && <span style={{ marginLeft: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '0 6px', fontSize: '0.7rem' }}>
                  {counts[s] || 0}
                </span>}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <i className="bi bi-clipboard-check" /> Applications ({regs.length})
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg. No.</th>
                  <th>Programme</th>
                  <th>School</th>
                  <th>Year</th>
                  <th>Student ID Submitted</th>
                  <th>Election</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem' }}>
                    <span className="spinner spinner-dark" />
                  </td></tr>
                ) : regs.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                    </td>
                    <td><code style={{ fontSize: '0.8rem' }}>{r.student_reg}</code></td>
                    <td><span className="badge badge-info">{r.student_programme}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.student_school}</td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-grey">Yr {r.student_year}</span></td>
                    <td style={{ fontSize: '0.85rem' }}>{r.student_id_number}</td>
                    <td style={{ fontSize: '0.8rem' }}>{r.election_title}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={processing[r.id]}
                            onClick={() => review(r.id, 'approve')}
                          >
                            {processing[r.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <><i className="bi bi-check-lg" /> Approve</>}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={processing[r.id]}
                            onClick={() => {
                              const reason = window.prompt('Rejection reason:');
                              if (reason !== null) review(r.id, 'reject', reason);
                            }}
                          >
                            <i className="bi bi-x-lg" /> Reject
                          </button>
                        </div>
                      )}
                      {r.status !== 'pending' && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && regs.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                    No registrations found for this filter.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}