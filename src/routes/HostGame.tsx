import { useParams } from 'react-router-dom'

export default function HostGame() {
  const { code } = useParams<{ code: string }>()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1>Hosting game {code}</h1>
    </div>
  )
}
