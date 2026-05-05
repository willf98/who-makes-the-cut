import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '1rem',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>Who Makes the Cut</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        A party game for 4–10 players
      </p>
      <button
        onClick={() => navigate('/host')}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.25rem',
          width: '250px',
          cursor: 'pointer',
        }}
      >
        Host a Game
      </button>
      <button
        onClick={() => navigate('/play')}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.25rem',
          width: '250px',
          cursor: 'pointer',
        }}
      >
        Join a Game
      </button>
    </div>
  )
}