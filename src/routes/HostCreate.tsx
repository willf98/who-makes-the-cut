import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateRoomCode } from '../lib/roomCode'
import { supabase } from '../lib/supabase'

const MAX_ROOM_CODE_ATTEMPTS = 5

type ExistingGameRow = {
  id: string
}

type CreatedGameRow = {
  id: string
  room_code: string
}

type HostPlayerRow = {
  id: string
  game_id: string
  name: string
}

type UpdatedGameRow = {
  id: string
  host_player_id: string
}

type CreateGameResult =
  | {
      game: CreatedGameRow
      errorMessage: null
    }
  | {
      game: null
      errorMessage: string
    }

export default function HostCreate() {
  const navigate = useNavigate()
  const [hostName, setHostName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isCreatingGame, setIsCreatingGame] = useState(false)

  const trimmedHostName = hostName.trim()

  async function createGameWithUniqueCode(): Promise<CreateGameResult> {
    for (let attempt = 0; attempt < MAX_ROOM_CODE_ATTEMPTS; attempt += 1) {
      const roomCode = generateRoomCode()

      const { data: existingGame, error: existingGameError } = await supabase
        .from('games')
        .select('id')
        .eq('room_code', roomCode)
        .maybeSingle<ExistingGameRow>()

      if (existingGameError) {
        return { game: null, errorMessage: 'Unable to create game' }
      }

      if (existingGame) {
        continue
      }

      const { data: createdGame, error: createdGameError } = await supabase
        .from('games')
        .insert({ room_code: roomCode })
        .select('id, room_code')
        .single<CreatedGameRow>()

      if (createdGameError?.code === '23505') {
        continue
      }

      if (createdGameError || !createdGame) {
        return { game: null, errorMessage: 'Unable to create game' }
      }

      return { game: createdGame, errorMessage: null }
    }

    return { game: null, errorMessage: 'Unable to generate a unique room code' }
  }

  async function handleCreateGameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (trimmedHostName.length === 0) {
      setErrorMessage('Enter your name')
      return
    }

    setIsCreatingGame(true)

    const { game, errorMessage: createGameErrorMessage } = await createGameWithUniqueCode()

    if (!game) {
      setIsCreatingGame(false)
      setErrorMessage(createGameErrorMessage)
      return
    }

    const { data: hostPlayer, error: hostPlayerError } = await supabase
      .from('players')
      .insert({
        game_id: game.id,
        name: trimmedHostName,
        is_host: true,
        is_connected: true,
      })
      .select('id, game_id, name')
      .single<HostPlayerRow>()

    if (hostPlayerError || !hostPlayer) {
      setIsCreatingGame(false)
      setErrorMessage('Unable to create game')
      return
    }

    const { data: updatedGame, error: updateGameError } = await supabase
      .from('games')
      .update({ host_player_id: hostPlayer.id })
      .eq('id', game.id)
      .select('id, host_player_id')
      .single<UpdatedGameRow>()

    setIsCreatingGame(false)

    if (updateGameError || !updatedGame) {
      setErrorMessage('Unable to create game')
      return
    }

    localStorage.setItem('wmtc_player_id', hostPlayer.id)
    localStorage.setItem('wmtc_game_id', hostPlayer.game_id)
    navigate(`/host/${game.room_code}`)
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
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Host a Game</h1>
      <p style={{ marginBottom: '1rem', color: '#666' }}>Enter your name to create a room.</p>

      <form
        onSubmit={handleCreateGameSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '280px',
        }}
      >
        <input
          aria-label="Host name"
          autoComplete="name"
          disabled={isCreatingGame}
          onChange={(event) => {
            setHostName(event.target.value)
            setErrorMessage('')
          }}
          placeholder="Your name"
          style={{
            fontSize: '1.25rem',
            padding: '0.75rem 1rem',
          }}
          value={hostName}
        />
        <button
          disabled={isCreatingGame || trimmedHostName.length === 0}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.25rem',
            cursor: isCreatingGame ? 'not-allowed' : 'pointer',
          }}
          type="submit"
        >
          {isCreatingGame ? 'Creating...' : 'Create Game'}
        </button>
      </form>

      {errorMessage ? (
        <p role="alert" style={{ color: '#b00020', marginTop: '0.5rem' }}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
