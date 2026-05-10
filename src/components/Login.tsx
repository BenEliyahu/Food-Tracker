import { useState } from 'react';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
      } else if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else {
        setError(`Sign-in failed: ${code || 'unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-500 to-emerald-700 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <div className="text-8xl mb-4">🥗</div>
        <h1 className="text-3xl font-bold text-white mb-2">Food Tracker AI</h1>
        <p className="text-emerald-100 text-sm">Track your nutrition with AI-powered food scanning</p>
      </div>

      <button
        onClick={signIn}
        disabled={loading}
        className="bg-white text-gray-700 font-semibold px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 text-base hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
        )}
        Continue with Google
      </button>

      {error && (
        <div className="mt-4 bg-white/20 text-white text-sm px-4 py-2 rounded-xl max-w-xs text-center">
          {error}
        </div>
      )}

      <p className="text-emerald-200 text-xs mt-6">Your data is synced across all your devices</p>
    </div>
  );
}
