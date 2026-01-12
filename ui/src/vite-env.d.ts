/// <reference types="vite/client" />

// Vercel/CI builds may omit devDependencies, so this shim prevents TS7016
// when `canvas-confetti` types are not present.
declare module 'canvas-confetti' {
  interface ConfettiOptions {
    particleCount?: number
    spread?: number
    origin?: { x: number; y: number }
    angle?: number
    colors?: string[]
    startVelocity?: number
    decay?: number
    gravity?: number
    drift?: number
    ticks?: number
    shapes?: Array<'square' | 'circle'>
    scalar?: number
    zIndex?: number
    disableForReducedMotion?: boolean
  }

  function confetti(options?: ConfettiOptions): Promise<null> | null
  export default confetti
}
