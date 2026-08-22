import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toasts, removeToast, error: showError } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      navigate(redirectTarget);
    } catch (err) {
      const errData = err.response?.data;
      const detail =
        errData?.errors?.[0] ||
        errData?.message ||
        err.message ||
        'Login failed. Please try again.';
      showError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="input"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            autoComplete="current-password"
          />
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner size="sm" /> : 'Sign In'}
        </button>
        <p className="text-center text-slate-400 text-sm">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium">Sign up</Link>
        </p>
      </form>
    </>
  );
}
