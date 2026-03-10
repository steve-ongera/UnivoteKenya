import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { electionAPI, candidateAPI, studentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const POSITIONS = [
  { key: 'president', label: 'Student President', icon: 'bi-star-fill', desc: 'University-wide. Selecting president auto-selects Deputy.' },
  { key: 'secretary_general', label: 'Secretary General', icon: 'bi-journal-text', desc: 'University-wide position.' },
  { key: 'finance_director', label: 'Finance Director', icon: 'bi-cash-coin', desc: 'University-wide position.' },
  { key: 'governor', label: 'School Governor', icon: 'bi-building', desc: 'School-specific. Vote for your school.' },
  { key: 'mca', label: 'Programme Director (MCA)', icon: 'bi-diagram-3', desc: 'Programme-specific. Vote for your programme.' },
  { key: 'senator', label: 'School Senator', icon: 'bi-bank', label2: 'Senator', desc: 'School-specific.' },
];

export default function VotePage() {
  const { user } = useAuth();
  const [election, setElection] = useState(null);
  const [candidates, setCandidates] = useState({});
  const [selections, setSelections] = useState({});
  const [activePos, setActivePos] = useState('president');
  const [voterStatus, setVoterStatus] = useState(null);
  const [myVotes, setMyVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    electionAPI.active().then(async (elections) => {
      if (!elections.length) { setLoading(false); return; }
      const el = elections[0];
      setElection(el);
      const [status, votes] = await Promise.all([
        studentAPI.voterStatus(el.id),
        studentAPI.myVotes(el.id),
      ]);
      setVoterStatus(status);
      setMyVotes(votes.map(v => v.position));
      if (votes.length > 0) setSubmitted(true);

      // Load all candidates
      const byPos = {};
      for (const pos of POSITIONS) {
        const params = { election_id: el.id, position: pos.key };
        if (pos.key === 'governor' || pos.key === 'senator') params.school = user.school;
        if (pos.key === 'mca') params.programme = user.programme;
        const list = await candidateAPI.list(params).catch(() => []);
        byPos[pos.key] = list;
      }
      setCandidates(byPos);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const selectCandidate = (posKey, candidateId) => {
    setSelections(s => ({ ...s, [posKey]: candidateId }));
    // Auto-link running mate display
    if (posKey === 'president') {
      const pres = candidates.president?.find(c => c.id === candidateId);
      if (pres?.running_mate_id) {
        setSelections(s => ({ ...s, deputy_president: pres.running_mate_id }));
      }
    }
  };

  const handleSubmit = async () => {
    setError('');
    const votes = Object.entries(selections).map(([position, candidate_id]) => ({ position, candidate_id }));
    if (!votes.length) { setError('Please select at least one candidate.'); return; }
    setSubmitting(true);
    try {
      await studentAPI.castVote({ election_id: election.id, votes });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const posVoted = (posKey) => myVotes.includes(posKey) || (submitted && selections[posKey]);

  if (loading) return (
    <Layout title="Cast Vote">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem' }}>
        <span className="spinner spinner-dark" /> Loading voting booth…
      </div>
    </Layout>
  );

  if (!election) return (
    <Layout title="Cast Vote">
      <div className="card"><div className="card-body">
        <div className="alert alert-info"><i className="bi bi-info-circle" />No active election at this time. Check back later.</div>
      </div></div>
    </Layout>
  );

  if (voterStatus?.status !== 'approved') return (
    <Layout title="Cast Vote">
      <div className="card"><div className="card-body">
        <div className="alert alert-warning">
          <i className="bi bi-lock" />
          You must be an approved voter to cast votes. Current status: <strong>{voterStatus?.status || 'Not registered'}</strong>
        </div>
      </div></div>
    </Layout>
  );

  if (submitted) return (
    <Layout title="Cast Vote">
      <div className="page-enter">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
            Your Vote Has Been Cast!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Thank you for participating in <strong>{election.title}</strong>. Your vote is anonymous and secure.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <a href="/student/results" className="btn btn-primary">
              <i className="bi bi-bar-chart-line" /> View Live Results
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );

  const currentPos = POSITIONS.find(p => p.key === activePos);
  const currentCandidates = candidates[activePos] || [];

  return (
    <Layout title="Cast Your Vote">
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title">🗳️ Voting Booth</h1>
          <p className="page-subtitle">{election.title} · {election.academic_year}</p>
        </div>

        {/* Kenya Banner */}
        <div style={{ background: 'var(--green-deep)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ color: '#fff' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>University Electoral Commission of Kenya</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>Your vote is secret, secure and permanent. You can only vote once per position.</div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {POSITIONS.map(p => (
                <div key={p.key} style={{ textAlign: 'center' }}>
                <div
                    style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: posVoted(p.key)
                        ? '#22c55e'
                        : (selections[p.key] ? '#e8b84b' : 'rgba(255,255,255,0.2)'),
                    margin: '0 auto 3px'
                    }}
                />
                </div>
            ))}
            </div>
        </div>

        {error && <div className="alert alert-error"><i className="bi bi-exclamation-circle-fill" />{error}</div>}

        {/* Position Tabs */}
        <div className="position-tabs">
          {POSITIONS.map(p => (
            <button
              key={p.key}
              className={`position-tab ${activePos === p.key ? 'active' : ''}`}
              onClick={() => setActivePos(p.key)}
            >
              {posVoted(p.key) && <i className="bi bi-check-circle-fill" style={{ marginRight: '0.3rem', color: posVoted(p.key) ? 'inherit' : '#22c55e' }} />}
              <i className={`bi ${p.icon}`} style={{ marginRight: '0.3rem' }} />
              {p.label}
              {selections[p.key] && !posVoted(p.key) && <span style={{ marginLeft: '0.3rem', fontSize: '0.65rem', background: 'var(--gold)', color: '#fff', borderRadius: 10, padding: '0 5px' }}>Selected</span>}
            </button>
          ))}
        </div>

        {/* Current Position */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <i className={`bi ${currentPos?.icon}`} style={{ color: 'var(--gold)' }} />
              {currentPos?.label}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{currentPos?.desc}</span>
          </div>
          <div className="card-body">
            {activePos === 'deputy_president' ? (
              <div className="alert alert-info">
                <i className="bi bi-info-circle" />
                The Deputy President is automatically selected when you choose a President. They run as a ticket.
                {selections.deputy_president && (
                  <div style={{ marginTop: '0.5rem', fontWeight: 700 }}>
                    Auto-selected: {candidates.president?.find(c => c.running_mate_id === selections.deputy_president)?.running_mate_name || '—'}
                  </div>
                )}
              </div>
            ) : currentCandidates.length === 0 ? (
              <div className="alert alert-warning"><i className="bi bi-exclamation-triangle" />No approved candidates for this position yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {currentCandidates.map(c => (
                  <div
                    key={c.id}
                    className={`candidate-card ${selections[activePos] === c.id ? 'selected' : ''}`}
                    onClick={() => selectCandidate(activePos, c.id)}
                  >
                    <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                      <div className="avatar avatar-md" style={{ background: 'var(--green-pale)' }}>
                        {c.photo_url ? <img src={c.photo_url} alt="" /> : c.student_name?.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="candidate-name">{c.student_name}</div>
                        <div className="candidate-info">{c.student_programme} · Year {c.student?.current_year || ''}</div>
                        <div className="candidate-info">{c.student_school}</div>
                        {c.manifesto && (
                          <div style={{ marginTop: '0.5rem', fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            "{c.manifesto.slice(0, 100)}{c.manifesto.length > 100 ? '…' : ''}"
                          </div>
                        )}
                      </div>
                    </div>
                    {activePos === 'president' && c.running_mate_name && (
                      <div className="candidate-running-mate">
                        <i className="bi bi-people-fill" style={{ marginRight: '0.4rem', color: 'var(--green-mid)' }} />
                        Running Mate: <strong>{c.running_mate_name}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Vote Summary + Submit */}
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header">
            <span className="card-title"><i className="bi bi-list-check" /> Your Selections</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{Object.keys(selections).length} / {POSITIONS.length} positions selected</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {POSITIONS.map(p => {
                const sel = selections[p.key];
                const cand = candidates[p.key]?.find(c => c.id === sel);
                return (
                  <div key={p.key} style={{ padding: '0.75rem', background: sel ? 'var(--green-pale)' : 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: `1px solid ${sel ? 'rgba(17,87,64,0.2)' : 'var(--border)'}` }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.label}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginTop: '0.2rem', color: sel ? 'var(--green-mid)' : 'var(--text-muted)' }}>
                      {p.key === 'deputy_president'
                        ? (selections.deputy_president
                            ? candidates.president?.find(c => c.running_mate_id === selections.deputy_president)?.running_mate_name || 'Auto-selected'
                            : 'Auto-selected with President')
                        : cand ? cand.student_name : '— Not selected'}
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSubmit}
              disabled={submitting || Object.keys(selections).length === 0}
            >
              {submitting
                ? <><span className="spinner" /> Submitting ballot…</>
                : <><i className="bi bi-check2-square" /> Submit My Ballot</>
              }
            </button>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
              <i className="bi bi-shield-lock" style={{ marginRight: '0.3rem' }} />
              Your vote is anonymous and cannot be changed after submission.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}