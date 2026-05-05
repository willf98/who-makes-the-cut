const ROOM_CODE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ROOM_CODE_LENGTH = 4

export function generateRoomCode(): string {
  let code = ''

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const letterIndex = Math.floor(Math.random() * ROOM_CODE_LETTERS.length)
    code += ROOM_CODE_LETTERS[letterIndex]
  }

  return code
}
