import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'iebc') navigate('/iebc/dashboard');
      else navigate('/student/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      const d = await authAPI.passwordReset({ email: resetEmail });
      setResetMsg(d.message);
    } catch (err) {
      setResetMsg(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Banner */}
      <div className="auth-banner">
        <div className="auth-banner-logo">🗳️</div>
        <h1 className="auth-banner-title">
          University Electoral Commission
        </h1>
        <p className="auth-banner-sub">
          The Official Student Elections Portal — Secure, Transparent, Democratic
        </p>
        <div className="auth-banner-flags">
          <div className="flag-dot" style={{ background: '#006600' }} />
          <div className="flag-dot" style={{ background: '#ffffff' }} />
          <div className="flag-dot" style={{ background: '#bb1e3d' }} />
          <div className="flag-dot" style={{ background: '#000000' }} />
        </div>
        <div style={{ marginTop: '2.5rem', padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.08)', borderRadius: '12px', maxWidth: '280px' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>Login with</div>
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span><i className="bi bi-mortarboard" style={{ color: '#e8b84b', marginRight: '0.5rem' }} />Students — Email + Password</span>
            <span><i className="bi bi-bank" style={{ color: '#e8b84b', marginRight: '0.5rem' }} />IEBC Officials — Official Email</span>
            <span><i className="bi bi-shield-check" style={{ color: '#e8b84b', marginRight: '0.5rem' }} />Admin — Admin Credentials</span>
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="auth-form-side">
        {!showReset ? (
          <div className="auth-form-inner">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.75rem' }}>
              <div style={{ width: 40, height: 40, background: 'var(--green-mid)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#fff' }}>
                <i className="bi bi-ballot-fill" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--green-deep)', fontWeight: 700 }}>UniVote Kenya</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Electoral Portal</div>
              </div>
            </div>

            <h1 className="auth-form-title">Welcome Back</h1>
            <p className="auth-form-sub">Sign in with your email and registration number as password (first-time login)</p>

            <div className="kenya-stripe" style={{ marginBottom: '1.5rem', borderRadius: 4 }} />

            {error && (
              <div className="alert alert-error">
                <i className="bi bi-exclamation-circle-fill" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrap">
                  <input
                    className="form-input"
                    type="email"
                    placeholder="student@university.ac.ke"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required autoFocus
                  />
                  <i className="bi bi-envelope input-icon" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password / Registration No.</label>
                <div className="input-wrap">
                  <input
                    className={`form-input has-right`}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Your password or reg. no."
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <i className="bi bi-lock input-icon" />
                  <button
                    type="button"
                    className="input-icon-right"
                    onClick={() => setShowPw(s => !s)}
                    tabIndex={-1}
                  >
                    <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: '1.25rem', marginTop: '-0.25rem' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReset(true)}>
                  <i className="bi bi-question-circle" /> Forgot Password?
                </button>
              </div>

              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                {loading ? <><span className="spinner" /> Signing in…</> : <><i className="bi bi-arrow-right-circle" /> Sign In to Portal</>}
              </button>
            </form>

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--green-pale)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--green-mid)' }}>
              <i className="bi bi-info-circle" style={{ marginRight: '0.4rem' }} />
              First time? Your default password is your <strong>registration number</strong>. Change it after first login.
            </div>
          </div>
        ) : (
          /* ── Forgot Password Form ── */
          <div className="auth-form-inner">
            <button className="btn btn-ghost btn-sm" onClick={() => { setShowReset(false); setResetMsg(''); }} style={{ marginBottom: '1.5rem' }}>
              <i className="bi bi-arrow-left" /> Back to Login
            </button>
            <h1 className="auth-form-title">Reset Password</h1>
            <p className="auth-form-sub">Enter your registered email address and we'll send you a reset link.</p>
            <div className="kenya-stripe" style={{ margin: '1.25rem 0', borderRadius: 4 }} />

            {resetMsg && (
              <div className="alert alert-success">
                <i className="bi bi-envelope-check-fill" />
                {resetMsg}
              </div>
            )}

            {!resetMsg && (
              <form onSubmit={handleResetRequest}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-wrap">
                    <input
                      className="form-input"
                      type="email"
                      placeholder="your@email.ac.ke"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required autoFocus
                    />
                    <i className="bi bi-envelope input-icon" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={resetLoading}>
                  {resetLoading ? <><span className="spinner" /> Sending…</> : <><i className="bi bi-send" /> Send Reset Link</>}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}