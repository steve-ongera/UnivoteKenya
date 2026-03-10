import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { electionAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const POSITION_LABELS = {
  president: 'Student President',
  deputy_president: 'Deputy President',
  secretary_general: 'Secretary General',
  finance_director: 'Finance Director',
  governor: 'School Governor',
  mca: 'Programme Director (MCA)',
  senator: 'School Senator',
};

const COLORS = ['#115740', '#1a7a58', '#c9952a', '#e8b84b', '#0a3d2b', '#bb1e3d', '#4a90d9'];

export default function LiveResults() {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState(null);
  const [results, setResults] = useState(null);
  const [activePos, setActivePos] = useState('president');
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchResults = async (electionId) => {
    try {
      const data = await electionAPI.liveResults(electionId);
      setResults(data);
    } catch (err) {}
  };

  useEffect(() => {
    electionAPI.list().then(els => {
      setElections(els);
      const active = els.find(e => e.status === 'active') || els[0];
      if (active) {
        setSelectedElection(active);
        fetchResults(active.id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedElection) return;
    // Poll every 5 seconds for live updates
    intervalRef.current = setInterval(() => fetchResults(selectedElection.id), 5000);
    return () => clearInterval(intervalRef.current);
  }, [selectedElection]);

  const positionData = results?.results?.find(r => r.position === activePos);

  const chartData = positionData?.candidates?.map(c => ({
    name: c.name.split(' ').slice(0, 2).join(' '),
    fullName: c.name,
    votes: c.votes,
    percentage: c.percentage,
  })) || [];

  return (
    <Layout title="Live Results">
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title">
            <span className="live-dot" style={{ marginRight: 8 }} />
            Live Election Results
          </h1>
          <p className="page-subtitle">Results update automatically every 5 seconds</p>
        </div>

        {/* Election selector */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Election:</span>
          {elections.map(el => (
            <button
              key={el.id}
              className={`position-tab ${selectedElection?.id === el.id ? 'active' : ''}`}
              onClick={() => { setSelectedElection(el); fetchResults(el.id); }}
            >
              {el.title}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '2rem' }}>
            <span className="spinner spinner-dark" /> Loading results…
          </div>
        )}

        {results && (
          <>
            {/* Turnout stats */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <div className="stat-icon green"><i className="bi bi-people-fill" /></div>
                <div>
                  <div className="stat-value">{results.total_approved_voters}</div>
                  <div className="stat-label">Registered Voters</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon gold"><i className="bi bi-ballot-fill" /></div>
                <div>
                  <div className="stat-value">{results.total_voted}</div>
                  <div className="stat-label">Votes Cast</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><i className="bi bi-percent" /></div>
                <div>
                  <div className="stat-value">{results.turnout}%</div>
                  <div className="stat-label">Voter Turnout</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><i className="bi bi-patch-check" /></div>
                <div>
                  <div className="stat-value" style={{ textTransform: 'capitalize' }}>{results.election?.status_display}</div>
                  <div className="stat-label">Election Status</div>
                </div>
              </div>
            </div>

            {/* Position tabs */}
            <div className="position-tabs">
              {results.results?.map(r => (
                <button
                  key={r.position}
                  className={`position-tab ${activePos === r.position ? 'active' : ''}`}
                  onClick={() => setActivePos(r.position)}
                >
                  {r.position_display}
                </button>
              ))}
            </div>

            {positionData && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                {/* Bar chart */}
                <div className="card">
                  <div className="card-header">
                    <span className="card-title">
                      <i className="bi bi-bar-chart-fill" style={{ color: 'var(--gold)' }} />
                      {positionData.position_display}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {positionData.total_votes} total votes
                    </span>
                  </div>
                  <div className="card-body">
                    {chartData.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No votes cast yet.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 30 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} angle={-25} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} />
                          <Tooltip
                            formatter={(val, name, props) => [`${val} votes (${props.payload.percentage}%)`, props.payload.fullName]}
                            contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 12 }}
                          />
                          <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                            {chartData.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Progress bars + winner */}
                <div className="card">
                  <div className="card-header">
                    <span className="card-title"><i className="bi bi-trophy" style={{ color: 'var(--gold)' }} /> Standings</span>
                  </div>
                  <div className="card-body">
                    {/* Winner banner */}
                    {positionData.winner && (
                      <div className="winner-banner">
                        <span className="winner-trophy">🏆</span>
                        <div>
                          <div className="winner-label">WINNER · {positionData.position_display}</div>
                          <div className="winner-name">{positionData.winner.name}</div>
                          {positionData.winner.running_mate && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Running Mate: {positionData.winner.running_mate}
                            </div>
                          )}
                        </div>
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)' }}>{positionData.winner.percentage}%</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{positionData.winner.votes} votes</div>
                        </div>
                      </div>
                    )}

                    {positionData.candidates.map((c, i) => (
                      <div key={c.id} className="result-bar-wrap">
                        <div className="result-bar-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <div className="avatar avatar-sm" style={{ background: i === 0 ? 'var(--gold-pale)' : 'var(--green-pale)' }}>
                              {c.photo ? <img src={c.photo} alt="" /> : c.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                            </div>
                            <div>
                              <div className="result-bar-name">
                                {i === 0 && <i className="bi bi-trophy-fill" style={{ color: 'var(--gold)', marginRight: 4 }} />}
                                {c.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.programme} · {c.school}</div>
                            </div>
                          </div>
                          <span className="result-bar-pct">{c.percentage}%</span>
                        </div>
                        <div className="result-bar-track">
                          <div className={`result-bar-fill ${i === 0 ? 'leading' : ''}`} style={{ width: `${c.percentage}%` }} />
                        </div>
                        <div className="result-bar-votes">{c.votes} vote{c.votes !== 1 ? 's' : ''}</div>
                      </div>
                    ))}

                    {positionData.candidates.length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No candidates for this position yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}