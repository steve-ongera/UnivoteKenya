import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { electionAPI } from '../../services/api';

const EMPTY = { title: '', academic_year: '', description: '', voting_start: '', voting_end: '', status: 'pending' };

export default function IEBCElections() {
  const [elections, setElections] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [editing, setEditing] = useState(null);

  const load = () => electionAPI.list().then(setElections);
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await electionAPI.update(editing, form);
        setMsg({ type: 'success', text: 'Election updated.' });
      } else {
        await electionAPI.create(form);
        setMsg({ type: 'success', text: 'Election created successfully.' });
      }
      setForm(EMPTY); setShowForm(false); setEditing(null); load();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
    }
  };

  const handleEdit = (el) => {
    setEditing(el.id);
    setForm({
      title: el.title,
      academic_year: el.academic_year,
      description: el.description,
      voting_start: el.voting_start?.slice(0, 16),
      voting_end: el.voting_end?.slice(0, 16),
      status: el.status,
    });
    setShowForm(true);
  };

  return (
    <Layout title="Elections Management">
      <div className="page-enter">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">Elections Management</h1>
            <p className="page-subtitle">Create and manage university student elections</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowForm(s => !s); setEditing(null); setForm(EMPTY); }}>
            <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-plus-lg'}`} />
            {showForm ? 'Cancel' : 'Create Election'}
          </button>
        </div>

        {msg.text && <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}><i className={`bi ${msg.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} />{msg.text}</div>}

        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <span className="card-title"><i className="bi bi-journal-plus" /> {editing ? 'Edit Election' : 'New Election'}</span>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Election Title *</label>
                    <div className="input-wrap">
                      <input className="form-input" placeholder="e.g. University SRC Elections 2025" required
                        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                      <i className="bi bi-journal-text input-icon" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Academic Year *</label>
                    <div className="input-wrap">
                      <input className="form-input" placeholder="e.g. 2024/2025" required
                        value={form.academic_year} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} />
                      <i className="bi bi-calendar-range input-icon" />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <div className="input-wrap">
                    <textarea className="form-input no-icon" placeholder="Brief description of the election…"
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Voting Start *</label>
                    <div className="input-wrap">
                      <input className="form-input" type="datetime-local" required
                        value={form.voting_start} onChange={e => setForm(f => ({ ...f, voting_start: e.target.value }))} />
                      <i className="bi bi-clock input-icon" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Voting End *</label>
                    <div className="input-wrap">
                      <input className="form-input" type="datetime-local" required
                        value={form.voting_end} onChange={e => setForm(f => ({ ...f, voting_end: e.target.value }))} />
                      <i className="bi bi-clock-history input-icon" />
                    </div>
                  </div>
                </div>
                <div className="form-group" style={{ maxWidth: 240 }}>
                  <label className="form-label">Status</label>
                  <select className="form-input no-icon"
                    value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="pending">Pending</option>
                    <option value="active">Active (Voting Open)</option>
                    <option value="closed">Closed</option>
                    <option value="results_out">Results Published</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <><span className="spinner" /> Saving…</> : <><i className="bi bi-check-lg" /> {editing ? 'Update Election' : 'Create Election'}</>}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Elections table */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><i className="bi bi-journal-check" /> All Elections</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Academic Year</th>
                  <th>Voting Start</th>
                  <th>Voting End</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {elections.map(el => (
                  <tr key={el.id}>
                    <td style={{ fontWeight: 600 }}>{el.title}</td>
                    <td>{el.academic_year}</td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(el.voting_start).toLocaleString()}</td>
                    <td style={{ fontSize: '0.8rem' }}>{new Date(el.voting_end).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${el.status === 'active' ? 'badge-success' : el.status === 'closed' ? 'badge-danger' : el.status === 'results_out' ? 'badge-info' : 'badge-warning'}`}>
                        {el.status === 'active' && <span className="live-dot" style={{ marginRight: 4 }} />}
                        {el.status_display}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(el)}>
                        <i className="bi bi-pencil-square" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {elections.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No elections yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}