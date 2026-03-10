import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function ResetPassword() {
  const { uidb64, token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ new_password: '', new_password2: '' });
  const [showPw, setShowPw] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const d = await authAPI.passwordResetConfirm({ ...form, uidb64, token });
      setMsg(d.message);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-banner">
        <div className="auth-banner-logo">🔑</div>
        <h1 className="auth-banner-title">Password Reset</h1>
        <p className="auth-banner-sub">Create a new secure password for your UniVote Kenya account</p>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-inner">
          <h1 className="auth-form-title">New Password</h1>
          <p className="auth-form-sub">Choose a strong password (min. 6 characters)</p>
          <div className="kenya-stripe" style={{ margin: '1.25rem 0', borderRadius: 4 }} />

          {error && <div className="alert alert-error"><i className="bi bi-exclamation-circle-fill" />{error}</div>}
          {msg && (
            <div className="alert alert-success">
              <i className="bi bi-check-circle-fill" />
              {msg} Redirecting to login…
            </div>
          )}

          {!msg && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="input-wrap">
                  <input className="form-input has-right" type={showPw ? 'text' : 'password'}
                    placeholder="Min. 6 characters" required
                    value={form.new_password} onChange={e => setForm(f => ({ ...f, new_password: e.target.value }))} />
                  <i className="bi bi-lock input-icon" />
                  <button type="button" className="input-icon-right" onClick={() => setShowPw(s => !s)}>
                    <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-wrap">
                  <input className="form-input" type="password" placeholder="Repeat password" required
                    value={form.new_password2} onChange={e => setForm(f => ({ ...f, new_password2: e.target.value }))} />
                  <i className="bi bi-lock-fill input-icon" />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                {loading ? <><span className="spinner" /> Setting password…</> : <><i className="bi bi-check-lg" /> Set New Password</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}