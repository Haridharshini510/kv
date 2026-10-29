import { useState } from 'react';

export default function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onLogin(pin);
    } catch (err) {
      setError('Invalid PIN. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>KadaiVoice</h1>
        <p className="login-subtitle">Enter your PIN to continue</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            className="pin-input"
            autoFocus
            aria-label="PIN"
          />

          {error && <p className="error-message" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Checking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
