import { useState, useRef, useCallback } from 'react'

const JUNK = new Set(['\r\n', '\n', '\r', '+', 'ACCEPT', 'OVER', '+enter', ''])

type ScaleState = 'disconnected' | 'connected' | 'reading'

interface UseSerialScaleReturn {
  state: ScaleState
  error: string | null
  supported: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  readWeight: () => Promise<number | null>
}

export function useSerialScale(): UseSerialScaleReturn {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator
  const [state, setState] = useState<ScaleState>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const portRef = useRef<SerialPort | null>(null)

  const connect = useCallback(async () => {
    if (!supported) {
      setError('Web Serial API is not supported. Use Chrome or Edge on desktop.')
      return
    }
    try {
      setError(null)
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' })
      portRef.current = port
      setState('connected')
    } catch (e) {
      setError((e as Error).message)
    }
  }, [supported])

  const disconnect = useCallback(async () => {
    try {
      await portRef.current?.close()
    } catch {
      // ignore close errors
    }
    portRef.current = null
    setState('disconnected')
    setError(null)
  }, [])

  const readWeight = useCallback(async (): Promise<number | null> => {
    const port = portRef.current
    if (!port) return null

    setState('reading')
    setError(null)

    try {
      // Send "P" command to request weight from scale
      const writer = port.writable?.getWriter()
      if (writer) {
        await writer.write(new TextEncoder().encode('P\r\n'))
        writer.releaseLock()
      }

      // Read response line with 2s timeout
      const reader = port.readable?.getReader()
      if (!reader) { setState('connected'); return null }

      let line = ''
      const decoder = new TextDecoder()
      let timedOut = false
      const timer = setTimeout(() => { timedOut = true; reader.cancel() }, 2000)

      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done || timedOut) break
          line += decoder.decode(value)
          if (line.includes('\n')) break
        }
      } finally {
        clearTimeout(timer)
        reader.releaseLock()
      }

      if (timedOut || !line.trim()) {
        setError('No response from scale — check cable and COM port')
        setState('connected')
        return null
      }

      // Parse: split by whitespace, filter junk tokens
      const tokens = line.trim().split(/\s+/).filter((t) => !JUNK.has(t))

      // More than 4 tokens or contains "?" means scale is not stable
      if (tokens.length > 4 || tokens.some((t) => t.includes('?'))) {
        setError('Scale not stable — wait for reading to settle')
        setState('connected')
        return null
      }

      if (tokens.length < 2) {
        setError(`Unexpected response: "${line.trim()}"`)
        setState('connected')
        return null
      }

      const rawValue = parseFloat(tokens[0])
      const unit = tokens[1].toUpperCase()

      if (isNaN(rawValue)) {
        setError(`Could not parse weight value from: "${tokens[0]}"`)
        setState('connected')
        return null
      }

      // Convert to kg
      const kg = unit === 'G' ? rawValue / 1000 : rawValue

      setState('connected')
      return Math.round(kg * 1000) / 1000
    } catch (e) {
      setError((e as Error).message)
      setState('connected')
      return null
    }
  }, [])

  return { state, error, supported, connect, disconnect, readWeight }
}
