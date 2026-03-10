import { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import { electionAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const COLORS = ['#115740', '#c9952a', '#1a7a58', '#e8b84b', '#0a3d2b', '#bb1e3d'];

export default function IEBCResults() {
  const [elections, setElections] = useState([]);
  const [selectedElection, setSelectedElection] = useState('');
  const [results, setResults] = useState(null);
  const [activePos, setActivePos] = useState('president');
  const intervalRef = useRef(null);

  const fetchResults = (id) => electionAPI.liveResults(id).then(setResults).catch(() => {});

  useEffect(() => {
    electionAPI.list().then(els => {
      setElections(els);
      const active = els.find(e => e.status === 'active') || els[0];
      if (active) { setSelectedElection(String(active.id)); fetchResults(active.id); }
    });
  }, []);

  useEffect(() => {
    if (!selectedElection) return;
    intervalRef.current = setInterval(() => fetchResults(selectedElection), 5000);
    return () => clearInterval(intervalRef.current);
  }, [selectedElection]);

  const pos = results?.results?.find(r => r.position === activePos);
  const chartData = pos?.candidates?.map(c => ({ name: c.name.split(' ')[0], votes: c.votes, percentage: c.percentage })) || [];
  const turnoutData = results ? [
    { name: 'Voted', value: results.total_voted },
    { name: 'Not Voted', value: Math.max(0, results.total_approved_voters - results.total_voted) },
  ] : [];

  return (
    <Layout title="Live Results Monitor">
      <div className="page-enter">
        <div className="page-header">
          <h1 className="page-title">
            <span className="live-dot" style={{ marginRight: 8 }} />
            Results Monitor
          </h1>
          <p className="page-subtitle">Real-time election results — auto-refreshes every 5 seconds</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="form-label" style={{ margin: 0 }}>Election:</label>
          <select className="form-input no-icon" style={{ width: 300 }}
            value={selectedElection} onChange={e => { setSelectedElection(e.target.value); fetchResults(e.target.value); }}>
            {elections.map(el => <option key={el.id} value={el.id}>{el.title}</option>)}
          </select>
        </div>

        {results && (
          <>
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <div className="stat-icon green"><i className="bi bi-people-fill" /></div>
                <div><div className="stat-value">{results.total_approved_voters}</div><div className="stat-label">Eligible Voters</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon gold"><i className="bi bi-ballot-fill" /></div>
                <div><div className="stat-value">{results.total_voted}</div><div className="stat-label">Votes Cast</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue"><i className="bi bi-percent" /></div>
                <div><div className="stat-value">{results.turnout}%</div><div className="stat-label">Turnout</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red"><i className="bi bi-patch-check" /></div>
                <div><div className="stat-value" style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>{results.election?.status_display}</div><div className="stat-label">Status</div></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <div className="position-tabs">
                  {results.results?.map(r => (
                    <button key={r.position} className={`position-tab ${activePos === r.position ? 'active' : ''}`} onClick={() => setActivePos(r.position)}>
                      {r.position_display}
                    </button>
                  ))}
                </div>
                {pos && (
                  <div className="card">
                    <div className="card-header">
                      <span className="card-title">{pos.position_display}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pos.total_votes} votes</span>
                    </div>
                    <div className="card-body">
                      {pos.winner && (
                        <div className="winner-banner">
                          <span className="winner-trophy">🏆</span>
                          <div>
                            <div className="winner-label">LEADING</div>
                            <div className="winner-name">{pos.winner.name}</div>
                          </div>
                          <div style={{ marginLeft: 'auto' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)' }}>{pos.winner.percentage}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pos.winner.votes} votes</div>
                          </div>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 20 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                          <Tooltip formatter={(val) => [`${val} votes`]} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                          <Bar dataKey="votes" radius={[6,6,0,0]}>
                            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>

                      {/* Ranked table */}
                      {pos.candidates.map((c, i) => (
                        <div key={c.id} className="result-bar-wrap">
                          <div className="result-bar-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div style={{ width: 22, height: 22, borderRadius: '50%', background: i===0?'var(--gold)':'var(--green-pale)', color: i===0?'#fff':'var(--green-mid)', display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.72rem',fontWeight:700 }}>{i+1}</div>
                              <span className="result-bar-name">{c.name}</span>
                            </div>
                            <span className="result-bar-pct">{c.percentage}%</span>
                          </div>
                          <div className="result-bar-track">
                            <div className={`result-bar-fill ${i===0?'leading':''}`} style={{ width: `${c.percentage}%` }} />
                          </div>
                          <div className="result-bar-votes">{c.votes} votes</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Turnout donut */}
              <div className="card">
                <div className="card-header"><span className="card-title"><i className="bi bi-pie-chart" /> Turnout</span></div>
                <div className="card-body" style={{ textAlign: 'center' }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={turnoutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                        <Cell fill="var(--green-mid)" />
                        <Cell fill="#e0e0e0" />
                      </Pie>
                      <Legend />
                      <Tooltip formatter={val => [`${val} voters`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--green-mid)', marginTop: '0.5rem' }}>
                    {results.turnout}%
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {results.total_voted} of {results.total_approved_voters} voters
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}