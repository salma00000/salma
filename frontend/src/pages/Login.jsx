import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, advisor } = await login(email, password);
      signIn(token, advisor);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>⚙</span>
          <span style={styles.logoText}>SAV Assistant</span>
        </div>
        <p style={styles.tagline}>Outil interne — Gestion des dossiers SAV</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Adresse e-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="advisor@sav.com"
            required
            disabled={loading}
            style={styles.input}
            autoFocus
          />

          <label style={styles.label}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            disabled={loading}
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-sidebar)',
  },
  card: {
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,.4)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px',
  },
  logoIcon: {
    fontSize: '22px',
    color: 'var(--color-accent)',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
    color: 'var(--color-text)',
  },
  tagline: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    marginBottom: '32px',
    fontFamily: 'var(--font-mono)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '10px',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 'var(--radius)',
    border: '1.5px solid var(--color-border)',
    fontSize: '14px',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    transition: 'border-color .15s',
  },
  error: {
    fontSize: '13px',
    color: '#ef4444',
    marginTop: '8px',
    padding: '8px 12px',
    background: 'var(--color-error)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--color-error-border)',
  },
  button: {
    marginTop: '20px',
    padding: '11px',
    background: 'var(--color-accent)',
    color: '#18181b',
    fontWeight: 700,
    fontSize: '14px',
    borderRadius: 'var(--radius)',
    transition: 'background .15s, transform .1s',
    letterSpacing: '0.01em',
  },
};
