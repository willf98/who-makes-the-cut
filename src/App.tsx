import { Routes, Route } from 'react-router-dom'
import HostCreate from './routes/HostCreate'
import HostGame from './routes/HostGame'
import Landing from './routes/Landing'
import PlayerGame from './routes/PlayerGame'
import PlayerJoin from './routes/PlayerJoin'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/host" element={<HostCreate />} />
      <Route path="/host/:code" element={<HostGame />} />
      <Route path="/play" element={<PlayerJoin />} />
      <Route path="/play/:code" element={<PlayerGame />} />
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  )
}

export default App