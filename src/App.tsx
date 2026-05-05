import { Routes, Route } from 'react-router-dom'
import Landing from './routes/Landing'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<div>Page not found</div>} />
    </Routes>
  )
}

export default App