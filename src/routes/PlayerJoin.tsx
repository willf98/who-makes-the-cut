import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'



type GameRow = {
  id: string
  room_code: string
  status: string
}

type PlayerRow = {
  id: string
  game_id: string
  name: string
}

export default function PlayerJoin() {
  const navigate = useNavigate()
  const [roomCode, setRoomCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [game, setGame] = useState<GameRow | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCheckingRoom, setIsCheckingRoom] = useState(false)
  const [isJoiningGame, setIsJoiningGame] = useState(false)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setRoomCode(codeFromUrl.toUpperCase().slice(0, 4))
    }
  }, [searchParams])
  const normalizedRoomCode = roomCode.trim().toUpperCase()
  const trimmedPlayerName = playerName.trim()

  async function handleRoomCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (normalizedRoomCode.length !== 4) {
      setErrorMessage('Enter a 4-letter room code')
      return
    }

    setIsCheckingRoom(true)

    const { data, error } = await supabase
      .from('games')
      .select('id, room_code, status')
      .eq('room_code', normalizedRoomCode)
      .maybeSingle<GameRow>()

    setIsCheckingRoom(false)

    if (error) {
      setErrorMessage('Room not found')
      return
    }

    if (!data) {
      setErrorMessage('Room not found')
      return
    }

    setGame(data)
  }

  async function handlePlayerNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!game || trimmedPlayerName.length === 0) {
      setErrorMessage('Enter your name')
      return
    }

    setIsJoiningGame(true)

    const { data: existingPlayer, error: existingPlayerError } = await supabase
      .from('players')
      .select('id, game_id, name')
      .eq('game_id', game.id)
      .eq('name', trimmedPlayerName)
      .maybeSingle<PlayerRow>()

    if (existingPlayerError) {
      setIsJoiningGame(false)
      setErrorMessage('Name already taken')
      return
    }

    if (existingPlayer) {
      setIsJoiningGame(false)
      setErrorMessage('Name already taken')
      return
    }

    const { data: newPlayer, error: insertPlayerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        name: trimmedPlayerName,
        is_connected: true,
        is_host: false,
      })
      .select('id, game_id, name')
      .single<PlayerRow>()

    setIsJoiningGame(false)

    if (insertPlayerError || !newPlayer) {
      setErrorMessage(
        insertPlayerError?.code === '23505' ? 'Name already taken' : 'Unable to join game',
      )
      return
    }

    localStorage.setItem('wmtc_player_id', newPlayer.id)
    localStorage.setItem('wmtc_game_id', newPlayer.game_id)
    navigate(`/play/${game.room_code}`)
  }

  function handleRoomCodeChange(value: string) {
    setRoomCode(value.toUpperCase().slice(0, 4))
    setErrorMessage('')
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Join a Game</h1>
      <p style={{ marginBottom: '1rem', color: '#666' }}>
        {game ? `Room ${game.room_code} found. Enter your name.` : 'Enter your room code.'}
      </p>

      {!game ? (
        <form
          onSubmit={handleRoomCodeSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            width: '280px',
          }}
        >
          <input
            aria-label="Room code"
            autoComplete="off"
            disabled={isCheckingRoom}
            maxLength={4}
            onChange={(event) => handleRoomCodeChange(event.target.value)}
            placeholder="ABCD"
            style={{
              fontSize: '1.75rem',
              letterSpacing: '0.35rem',
              padding: '0.75rem 1rem',
              textAlign: 'center',
              textTransform: 'uppercase',
            }}
            value={roomCode}
          />
          <button
            disabled={isCheckingRoom || normalizedRoomCode.length !== 4}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.25rem',
              cursor: isCheckingRoom ? 'not-allowed' : 'pointer',
            }}
            type="submit"
          >
            {isCheckingRoom ? 'Checking...' : 'Continue'}
          </button>
        </form>
      ) : (
        <form
          onSubmit={handlePlayerNameSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            width: '280px',
          }}
        >
          <input
            aria-label="Player name"
            autoComplete="name"
            disabled={isJoiningGame}
            onChange={(event) => {
              setPlayerName(event.target.value)
              setErrorMessage('')
            }}
            placeholder="Your name"
            style={{
              fontSize: '1.25rem',
              padding: '0.75rem 1rem',
            }}
            value={playerName}
          />
          <button
            disabled={isJoiningGame || trimmedPlayerName.length === 0}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.25rem',
              cursor: isJoiningGame ? 'not-allowed' : 'pointer',
            }}
            type="submit"
          >
            {isJoiningGame ? 'Joining...' : 'Join Game'}
          </button>
        </form>
      )}

      {errorMessage ? (
        <p role="alert" style={{ color: '#b00020', marginTop: '0.5rem' }}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
