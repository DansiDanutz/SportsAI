/// <reference types="vite/client" />

// Vercel/CI builds may omit devDependencies, so this shim prevents TS7016
// when `canvas-confetti` types are not present.
declare module 'canvas-confetti' {
  const confetti: (options?: Record<string, unknown>) => unknown
  export default confetti
}
