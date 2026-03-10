import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { iebcAPI } from '../../services/api';

const PROGRAMMES = ['BSCIT','BSCS','BBA','BCOM','BED','BENG','BARCH','BLAW','BMED','BNURS','BSC','BPHARM','BPSYCH','BSOC','BJOUR'];
const SCHOOLS = [
  { value: 'SET', label: 'School of Engineering & Technology' },
  { value: 'SBS', label: 'School of Business Studies' },
  { value: 'SEd', label: 'School of Education' },
  { value: 'SHS', label: 'School of Health Sciences' },
  { value: 'SLA', label: 'School of Law & Arts' },
  { value: 'SSS', label: 'School of Social Sciences' },
];

const EMPTY = { full_name: '', email: '', registration_number: '', phone: '', programme: 'BSCIT', school: 'SET', admission_date: '', current_year: 1, student_id: '', national_id: '' };

export default function RegisterStudents() {
  const [form, setForm] = useState(EMPTY);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    setListLoading(true);
    iebcAPI.getStudents(search ? { search } : {})
      .then(setStudents)
      .finally(() => setListLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      await iebcAPI.registerStudent(form);
      setMsg({ type: 'success', text: `Student ${form.full_name} registered successfully. Default password is their registration number.` });
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Compute year from admission date
  const handleAdmissionChange = (date) => {
    const d = new Date(date);
    if (!isNaN(d)) {
      const years = Math.floor((Date.now() - d) / (365.25 * 24 * 3600 * 1000));
      setForm(f => ({ ...f, admission_date: date, current_year: Math.max(1, Math.min(5, years + 1)) }));
    } else {
      setForm(f => ({ ...f, admission_date: date }));
    }
  };

  return (
    <Layout title="Student Registration">
      <div className="page-enter">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="page-title">Student Registration</h1>
            <p className="page-subtitle">Register new students into the UniVote Kenya system</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            <i className={`bi ${showForm ? 'bi-x-lg' : 'bi-person-plus'}`} />
            {showForm ? 'Cancel' : 'Register New Student'}
          </button>
        </div>

        {msg.text && (
          <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>
            <i className={`bi ${msg.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} />
            {msg.text}
          </div>
        )}

        {/* Registration Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <span className="card-title"><i className="bi bi-person-plus" /> New Student Details</span>
              <div style={{ background: 'var(--green-pale)', border: '1px solid rgba(17,87,64,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.75rem', fontSize: '0.78rem', color: 'var(--green-mid)' }}>
                <i className="bi bi-info-circle" style={{ marginRight: 4 }} />Default password = Registration Number
              </div>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <div className="input-wrap">
                      <input className="form-input" placeholder="e.g. Steve Ongera" required
                        value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
                      <i className="bi bi-person input-icon" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <div className="input-wrap">
                      <input className="form-input" placeholder="e.g. 0757790687" required
                        value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                      <i className="bi bi-telephone input-icon" />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <div className="input-wrap">
                      <input className="form-input" type="email" placeholder="student@university.ac.ke" required
                        value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                      <i className="bi bi-envelope input-icon" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Registration Number *</label>
                    <div className="input-wrap">
                      <input className="form-input" placeholder="e.g. CS/2022/001" required
                        value={form.registration_number} onChange={e => setForm(f => ({ ...f, registration_number: e.target.value }))} />
                      <i className="bi bi-hash input-icon" />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Student ID (Card No.) *</label>
                    <div className="input-wrap">
                      <input className="form-input" placeholder="e.g. STU2022001" required
                        value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} />
                      <i className="bi bi-credit-card-2-front input-icon" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">National ID / Passport</label>
                    <div className="input-wrap">
                      <input className="form-input" placeholder="National ID number"
                        value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} />
                      <i className="bi bi-person-vcard input-icon" />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Programme *</label>
                    <select className="form-input no-icon" required
                      value={form.programme} onChange={e => setForm(f => ({ ...f, programme: e.target.value }))}>
                      {PROGRAMMES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">School *</label>
                    <select className="form-input no-icon" required
                      value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))}>
                      {SCHOOLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Admission Date *</label>
                    <div className="input-wrap">
                      <input className="form-input" type="date" required
                        value={form.admission_date} onChange={e => handleAdmissionChange(e.target.value)} />
                      <i className="bi bi-calendar3 input-icon" />
                    </div>
                    {form.admission_date && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--green-mid)', marginTop: '0.25rem' }}>
                        <i className="bi bi-info-circle" style={{ marginRight: 4 }} />
                        Auto-computed: Year {form.current_year} student
                      </div>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Year</label>
                    <select className="form-input no-icon"
                      value={form.current_year} onChange={e => setForm(f => ({ ...f, current_year: +e.target.value }))}>
                      {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <><span className="spinner" /> Registering…</> : <><i className="bi bi-check-lg" /> Register Student</>}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="card">
          <div className="card-header">
            <span className="card-title"><i className="bi bi-people" /> Registered Students ({students.length})</span>
            <div className="search-bar" style={{ width: 260 }}>
              <input className="form-input" placeholder="Search by name…"
                value={search} onChange={e => setSearch(e.target.value)} />
              <i className="bi bi-search" />
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Reg. No.</th>
                  <th>Phone</th>
                  <th>Programme</th>
                  <th>School</th>
                  <th>Year</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                    <span className="spinner spinner-dark" />
                  </td></tr>
                ) : students.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="avatar avatar-sm">{s.full_name?.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><code style={{ fontSize: '0.8rem', background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4 }}>{s.registration_number}</code></td>
                    <td style={{ fontSize: '0.875rem' }}>{s.phone}</td>
                    <td><span className="badge badge-info">{s.programme}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.school_display}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-grey">Yr {s.current_year}</span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {s.admission_date ? new Date(s.admission_date).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span className={`badge ${s.is_registered_voter ? 'badge-success' : 'badge-grey'}`}>
                        {s.is_registered_voter ? <><i className="bi bi-check-circle" /> Voter</> : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!listLoading && students.length === 0 && (
                  <tr><td colSpan={8} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No students found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}