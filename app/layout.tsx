import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Oráculo — Procedimentos Operacionais',
  description: 'ChatGPT corporativo para procedimentos operacionais internos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, background: '#0d0d0f' }}>
        {children}
      </body>
    </html>
  )
}
