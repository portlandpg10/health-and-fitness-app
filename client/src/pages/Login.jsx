import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { login, loading, authEnabled } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(pin);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid PIN');
    }
  };

  if (!loading && !authEnabled) {
    navigate('/');
    return null;
  }
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-slate-800 mb-6">Health App</h1>
        <label className="block text-sm font-medium text-slate-600 mb-2">Enter PIN</label>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={8}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          placeholder="••••"
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button type="submit" className="mt-6 w-full py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700">
          Login
        </button>
      </form>
    </div>
  );
}
