import { create } from 'zustand'

/**
 * Lightweight owner gate: a local PIN that keeps children (and casual
 * borrowers of the device) out of the admin workshop.
 *
 * ⚠️ This is a convenience barrier, not security. The PIN never protects
 * remotely hosted assets — private books only ever live on this device.
 * See docs/privacy-notes.md.
 */

const PIN_KEY = 'storytime-owner-pin'
const SESSION_KEY = 'storytime-owner-unlocked'
const ITERATIONS = 150_000

interface StoredPin {
  saltB64: string
  hashB64: string
  iterations: number
}

function toB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromB64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  )
  return toB64(bits)
}

export function hasPin(): boolean {
  return localStorage.getItem(PIN_KEY) !== null
}

export async function setPin(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hashB64 = await derive(pin, salt, ITERATIONS)
  const stored: StoredPin = { saltB64: toB64(salt.buffer), hashB64, iterations: ITERATIONS }
  localStorage.setItem(PIN_KEY, JSON.stringify(stored))
}

export async function verifyPin(pin: string): Promise<boolean> {
  const raw = localStorage.getItem(PIN_KEY)
  if (!raw) return false
  try {
    const stored = JSON.parse(raw) as StoredPin
    const hash = await derive(pin, fromB64(stored.saltB64), stored.iterations)
    return hash === stored.hashB64
  } catch {
    return false
  }
}

export function clearPin(): void {
  localStorage.removeItem(PIN_KEY)
}

interface OwnerGateState {
  unlocked: boolean
  unlock: () => void
  lock: () => void
}

export const useOwnerGate = create<OwnerGateState>((set) => ({
  unlocked: sessionStorage.getItem(SESSION_KEY) === 'true',
  unlock: () => {
    sessionStorage.setItem(SESSION_KEY, 'true')
    set({ unlocked: true })
  },
  lock: () => {
    sessionStorage.removeItem(SESSION_KEY)
    set({ unlocked: false })
  },
}))
