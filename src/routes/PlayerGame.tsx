import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

export default function PlayerGame() {
  const { code } = useParams<{ code: string }>()
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoadingGame, setIsLoadingGame] = useState(true)
  const [needsRejoin, setNeedsRejoin] = useState(false)

  const roomCode = code?.toUpperCase() ?? ''

  async function fetchPlayers(gameId: string): Promise<Player[] | null> {
    const { data, error } = await supabase
      .from('players')
      .select('id, game_id, name, is_host, is_cut, is_connected, draft_position, joined_at')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true })
      .returns<Player[]>()

    if (error) {
      setErrorMessage('Unable to load players')
      return null
    }

    setPlayers(data)
    return data
  }

  useEffect(() => {
    async function fetchGameAndPlayers() {
      setIsLoadingGame(true)
      setErrorMessage('')
      setNeedsRejoin(false)
      setGame(null)

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

      const storedPlayerId = localStorage.getItem('wmtc_player_id')
      setCurrentPlayerId(storedPlayerId)

      const loadedPlayers = await fetchPlayers(gameData.id)

      if (!loadedPlayers) {
        setIsLoadingGame(false)
        return
      }

      if (!storedPlayerId || !loadedPlayers.some((player) => player.id === storedPlayerId)) {
        setIsLoadingGame(false)
        setNeedsRejoin(true)
        return
      }

      setGame(gameData)
      setIsLoadingGame(false)
    }

    void fetchGameAndPlayers()
  }, [roomCode])

  useEffect(() => {
    if (!game?.id) return

    const channel = supabase
      .channel(`player-lobby-${game.id}`)
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.id}`,
        },
        (payload) => {
          const updatedGame = payload.new as Game
          setGame(updatedGame)
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

  if (needsRejoin) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '500px' }}>
          <h1>We can't find you in this game.</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>
            <Link to="/play">Click here</Link> to rejoin.
          </p>
        </div>
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
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '500px' }}>
          <h1>{errorMessage || 'Game not found'}</h1>
        </div>
      </div>
    )
  }

  const statusMessage =
    game.status === 'lobby'
      ? 'Waiting for host to start...'
      : game.status === 'profile_creation'
        ? 'Game starting...'
        : 'Game in progress...'

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem 1rem',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <header style={{ textAlign: 'center' }}>
          <p style={{ color: '#666', margin: 0 }}>Room Code</p>
          <h1
            style={{
              fontSize: '3rem',
              letterSpacing: '0.25rem',
              margin: '0.25rem 0 1rem',
            }}
          >
            {game.room_code}
          </h1>
          <p style={{ color: '#666', fontSize: '1.25rem', margin: 0 }}>{statusMessage}</p>
        </header>

        <section>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
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
              {players.map((player) => {
                const isCurrentPlayer = player.id === currentPlayerId

                return (
                  <li
                    key={player.id}
                    style={{
                      border: isCurrentPlayer ? '2px solid #111' : '1px solid #ddd',
                      borderRadius: '0.75rem',
                      fontSize: '1.1rem',
                      padding: '0.9rem 1rem',
                    }}
                  >
                    {player.name}
                    {isCurrentPlayer ? <span style={{ color: '#666' }}> (you)</span> : null}
                    {player.is_host ? <span style={{ color: '#666' }}> (host)</span> : null}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {errorMessage ? (
          <p role="alert" style={{ color: '#b00020', margin: 0, textAlign: 'center' }}>
            {errorMessage}
          </p>
        ) : null}
      </main>
    </div>
  )
}
