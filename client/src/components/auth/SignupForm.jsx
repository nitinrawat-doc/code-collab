import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../ui/Toast';
import { Spinner } from '../ui/Spinner';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export function SignupForm() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toasts, removeToast, error: showError } = useToast();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const redirectTarget = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { showError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await register(form);
      navigate(redirectTarget);
    } catch (err) {
      // Show the most specific error available:
      // 1. First item from the validation errors array
      // 2. The message field from the API response
      // 3. HTTP network-level error
      // 4. Generic fallback
      const errData = err.response?.data;
      const detail =
        errData?.errors?.[0] ||
        errData?.message ||
        err.message ||
        'Registration failed. Please try again.';
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
          <label className="label" htmlFor="signup-name">Full Name</label>
          <input
            id="signup-name"
            className="input"
            type="text"
            placeholder="Nitin Sharma"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            className="input"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            className="input"
            type="password"
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? <Spinner size="sm" /> : 'Create Account'}
        </button>
        <p className="text-center text-slate-400 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
        </p>
      </form>
    </>
  );
}
