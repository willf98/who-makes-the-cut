import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type Game = {
  id: string
  room_code: string
  status: string
}

type Player = {
  id: string
  game_id: string
  name: string
  is_host: boolean
  is_cut: boolean
  is_connected: boolean
  draft_position: number | null
  joined_at: string
}

export default function HostGame() {
  const { code } = useParams<{ code: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoadingGame, setIsLoadingGame] = useState(true)
  const [isStartingGame, setIsStartingGame] = useState(false)

  const roomCode = code?.toUpperCase() ?? ''
  const joinUrl = `${window.location.origin}/play?code=${roomCode}`
  const canStartGame = players.length >= 4

  async function fetchPlayers(gameId: string) {
    const { data, error } = await supabase
      .from('players')
      .select('id, game_id, name, is_host, is_cut, is_connected, draft_position, joined_at')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true })
      .returns<Player[]>()

    if (error) {
      setErrorMessage('Unable to load players')
      return
    }

    setPlayers(data)
  }

  useEffect(() => {
    async function fetchGameAndPlayers() {
      setIsLoadingGame(true)
      setErrorMessage('')

      if (!roomCode) {
        setIsLoadingGame(false)
        setErrorMessage('Game not found')
        return
      }

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id, room_code, status')
        .eq('room_code', roomCode)
        .maybeSingle<Game>()

      if (gameError || !gameData) {
        setIsLoadingGame(false)
        setErrorMessage('Game not found')
        return
      }

      setGame(gameData)
      await fetchPlayers(gameData.id)
      setIsLoadingGame(false)
    }

    void fetchGameAndPlayers()
  }, [roomCode])

  useEffect(() => {
    if (!game?.id) return

    const channel = supabase
      .channel(`game-players-${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${game.id}`,
        },
        (payload) => {
          const newPlayer = payload.new as Player
          setPlayers((prev) => {
            if (prev.some((player) => player.id === newPlayer.id)) return prev
            return [...prev, newPlayer]
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${game.id}`,
        },
        (payload) => {
          const updatedPlayer = payload.new as Player
          setPlayers((prev) =>
            prev.map((player) => (player.id === updatedPlayer.id ? updatedPlayer : player)),
          )
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void fetchPlayers(game.id)
        }
      })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [game?.id])

  async function handleStartGame() {
    if (!game || !canStartGame) return

    setIsStartingGame(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('games')
      .update({ status: 'profile_creation' })
      .eq('id', game.id)
      .select('id, room_code, status')
      .single<Game>()

    setIsStartingGame(false)

    if (error || !data) {
      setErrorMessage('Unable to start game')
      return
    }

    setGame(data)
  }

  if (isLoadingGame) {
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
        <h1>Loading game...</h1>
      </div>
    )
  }

  if (!game) {
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
        <h1>Game not found</h1>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        minHeight: '100vh',
        padding: '3rem',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <header style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>Who Makes the Cut</h1>
        <p style={{ color: '#666', fontSize: '1.25rem', margin: '0.75rem 0 0' }}>
          Waiting for players to join
        </p>
      </header>

      <main
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '4rem',
          margin: '3rem 0',
        }}
      >
        <section style={{ textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '1.25rem', margin: '0 0 0.5rem' }}>
            Room Code
          </p>
          <div
            style={{
              fontSize: '6rem',
              fontWeight: 800,
              letterSpacing: '0.5rem',
              lineHeight: 1,
            }}
          >
            {game.room_code}
          </div>
          <p style={{ color: '#666', fontSize: '1.1rem', marginTop: '1rem' }}>
            Join at {window.location.origin}/play
          </p>
        </section>

        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <QRCodeSVG value={joinUrl} size={220} />
          <p style={{ color: '#666', margin: 0 }}>Scan to join</p>
        </section>

        <section style={{ minWidth: '280px', maxWidth: '360px', width: '100%' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
            {players.length} / 10 players
          </h2>
          {players.length === 0 ? (
            <p style={{ color: '#666' }}>No players yet.</p>
          ) : (
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                listStyle: 'none',
                margin: 0,
                padding: 0,
              }}
            >
              {players.map((player) => (
                <li
                  key={player.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '0.75rem',
                    fontSize: '1.25rem',
                    padding: '0.9rem 1rem',
                  }}
                >
                  {player.name}
                  {player.is_host ? <span style={{ color: '#666' }}> (host)</span> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer style={{ textAlign: 'center' }}>
        {errorMessage ? (
          <p role="alert" style={{ color: '#b00020', marginBottom: '1rem' }}>
            {errorMessage}
          </p>
        ) : null}
        <button
          disabled={!canStartGame || isStartingGame}
          onClick={handleStartGame}
          style={{
            padding: '1rem 2.5rem',
            fontSize: '1.25rem',
            cursor: !canStartGame || isStartingGame ? 'not-allowed' : 'pointer',
          }}
          type="button"
        >
          {isStartingGame ? 'Starting...' : 'Start Game'}
        </button>
        {!canStartGame ? (
          <p style={{ color: '#666', marginTop: '0.75rem' }}>Need at least 4 players to start.</p>
        ) : null}
      </footer>
    </div>
  )
}
