import { useSearchParams } from 'react-router-dom';
import { SignupForm } from '../components/auth/SignupForm';

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '';
  const isInvite = redirect.includes('/join/');

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">CodeCollab</span>
          </div>

          {isInvite && (
            <div className="mb-4 p-3 bg-brand-500/20 border border-brand-500/30 rounded-xl text-xs text-brand-300 font-medium">
              👥 Create account to join your friend's collaborative coding room!
            </div>
          )}

          <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
          <p className="text-slate-400">Join and start solving DSA problems together</p>
        </div>
        <div className="card">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
