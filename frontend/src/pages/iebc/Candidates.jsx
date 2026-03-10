import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { candidateAPI, electionAPI } from '../../services/api';

const POSITIONS = [
  { value: 'president', label: 'Student President' },
  { value: 'deputy_president', label: 'Deputy President' },
  { value: 'secretary_general', label: 'Secretary General' },
  { value: 'finance_director', label: 'Finance Director' },
  { value: 'governor', label: 'School Governor' },
  { value: 'mca', label: 'Programme Director (MCA)' },
  { value: 'senator', label: 'School Senator' },
];

export default function IEBCCandidates() {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState({});
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => {
    if (!selectedElection) return;
    setLoading(true);
    candidateAPI.list({ election_id: selectedElection, approved: 'false' })
      .then(setCandidates)
      .finally(() => setLoading(false));
  };

  useEffect(() => { electionAPI.list().then(els => { setElections(els); if (els.length) setSelectedElection(String(els[0].id)); }); }, []);
  useEffect(() => { load(); }, [selectedElection]);

  const handleApprove = async (id) => {
    setProcessing(p => ({ ...p, [id]: true }));
    try {
      await candidateAPI.approve(id);
      setMsg({ type: 'success', text: 'Candidate approved.' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setProcessing(p => ({ ...p, [id]: false }));
      setTimeout(() => setMsg({ type: '', text: '' }), 3000);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this candidate?')) return;
    try {
      await candidateAPI.delete(id);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const byPosition = POSITIONS.map(p => ({
    ...p,
    candidates: candidates.filter(c => c.position === p.value),
  })).filter(p => p.candidates.length > 0);

  return (
    <Layout title="Candidates Management">
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title">Candidates Management</h1>
          <p className="page-subtitle">Approve and manage student candidates for each position</p>
        </div>

        {msg.text && <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}><i className={`bi ${msg.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} />{msg.text}</div>}

        <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="form-label" style={{ margin: 0 }}>Election:</label>
          <select className="form-input no-icon" style={{ width: 280 }}
            value={selectedElection} onChange={e => setSelectedElection(e.target.value)}>
            <option value="">Select election…</option>
            {elections.map(el => <option key={el.id} value={el.id}>{el.title}</option>)}
          </select>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{candidates.length} candidates total</span>
        </div>

        {!selectedElection ? (
          <div className="alert alert-info"><i className="bi bi-info-circle" />Please select an election to manage candidates.</div>
        ) : loading ? (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}><span className="spinner spinner-dark" /> Loading…</div>
        ) : byPosition.length === 0 ? (
          <div className="card"><div className="card-body" style={{ color: 'var(--text-muted)' }}>No candidates registered for this election yet.</div></div>
        ) : (
          byPosition.map(group => (
            <div key={group.value} className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-header">
                <span className="card-title">
                  <i className="bi bi-person-badge" style={{ color: 'var(--gold)' }} />
                  {group.label}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{group.candidates.length} candidate(s)</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Reg. No.</th>
                      <th>Programme</th>
                      <th>School</th>
                      <th>Manifesto</th>
                      <th>Approved</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.candidates.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div className="avatar avatar-sm" style={{ background: 'var(--green-pale)' }}>
                              {c.photo_url ? <img src={c.photo_url} alt="" /> : c.student_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}
                            </div>
                            <span style={{ fontWeight: 600 }}>{c.student_name}</span>
                          </div>
                        </td>
                        <td><code style={{ fontSize: '0.8rem' }}>{c.student_reg}</code></td>
                        <td><span className="badge badge-info">{c.student_programme}</span></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.student_school}</td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 200 }}>
                          {c.manifesto ? `"${c.manifesto.slice(0, 60)}…"` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                        </td>
                        <td>
                          <span className={`badge ${c.is_approved ? 'badge-success' : 'badge-warning'}`}>
                            {c.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {!c.is_approved && (
                              <button className="btn btn-primary btn-sm" disabled={processing[c.id]}
                                onClick={() => handleApprove(c.id)}>
                                {processing[c.id] ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <><i className="bi bi-check-lg" /> Approve</>}
                              </button>
                            )}
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>
                              <i className="bi bi-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}