'use client'
import Oraculo from '../components/Oraculo'

export default function Home() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0d0d0f',
      padding: '0',
    }}>
      <div style={{ width: '100%', maxWidth: '1200px', height: '100vh' }}>
        <Oraculo />
      </div>
    </main>
  )
}
