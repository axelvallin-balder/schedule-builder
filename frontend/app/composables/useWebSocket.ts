import { ref, readonly, onUnmounted } from 'vue'

interface WebSocketMessage {
  type: string
  data: any
  timestamp?: string
}

interface UseWebSocketOptions {
  reconnectAttempts?: number
  reconnectDelay?: number
  onConnect?: () => void
  onDisconnect?: () => void
  onMessage?: (message: WebSocketMessage) => void
  onError?: (error: Event) => void
}

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const connectionStatus = ref<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const lastError = ref<string | null>(null)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = ref(5)
  const reconnectDelay = ref(1000)

  let reconnectTimeout: NodeJS.Timeout | null = null
  let heartbeatInterval: NodeJS.Timeout | null = null
  let messageQueue: WebSocketMessage[] = []

  const messageHandlers = new Map<string, ((data: any) => void)[]>()

  const connect = (url: string, options: UseWebSocketOptions = {}) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket is already connected')
      return
    }

    connectionStatus.value = 'connecting'
    maxReconnectAttempts.value = options.reconnectAttempts || 5
    reconnectDelay.value = options.reconnectDelay || 1000

    try {
      // Create WebSocket URL (handle both ws:// and wss://)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.host
      const wsUrl = url.startsWith('/') ? `${protocol}//${host}${url}` : url

      ws.value = new WebSocket(wsUrl)

      ws.value.onopen = () => {
        isConnected.value = true
        connectionStatus.value = 'connected'
        reconnectAttempts.value = 0
        lastError.value = null
        
        console.log('WebSocket connected')
        options.onConnect?.()

        // Start heartbeat
        startHeartbeat()

        // Send queued messages
        flushMessageQueue()
      }

      ws.value.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          
          // Handle heartbeat responses
          if (message.type === 'pong') {
            return
          }

          // Call global message handler
          options.onMessage?.(message)

          // Call type-specific handlers
          const handlers = messageHandlers.get(message.type) || []
          handlers.forEach(handler => handler(message.data))
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.value.onclose = (event) => {
        isConnected.value = false
        connectionStatus.value = 'disconnected'
        
        console.log('WebSocket disconnected:', event.code, event.reason)
        options.onDisconnect?.()

        // Stop heartbeat
        stopHeartbeat()

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && reconnectAttempts.value < maxReconnectAttempts.value) {
          scheduleReconnect(url, options)
        }
      }

      ws.value.onerror = (error) => {
        connectionStatus.value = 'error'
        lastError.value = 'Connection error occurred'
        
        console.error('WebSocket error:', error)
        options.onError?.(error)
      }
    } catch (error) {
      connectionStatus.value = 'error'
      lastError.value = `Failed to create WebSocket: ${(error as Error).message}`
      console.error('Failed to create WebSocket:', error)
    }
  }

  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    stopHeartbeat()

    if (ws.value) {
      ws.value.close(1000, 'Manual disconnect')
      ws.value = null
    }

    isConnected.value = false
    connectionStatus.value = 'disconnected'
    reconnectAttempts.value = 0
  }

  const send = (type: string, data: any = {}) => {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString()
    }

    if (isConnected.value && ws.value?.readyState === WebSocket.OPEN) {
      try {
        ws.value.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
        // Queue message for retry
        messageQueue.push(message)
      }
    } else {
      // Queue message for when connection is restored
      messageQueue.push(message)
      console.warn('WebSocket not connected, message queued:', type)
    }
  }

  const on = (type: string, handler: (data: any) => void) => {
    if (!messageHandlers.has(type)) {
      messageHandlers.set(type, [])
    }
    messageHandlers.get(type)!.push(handler)

    // Return unsubscribe function
    return () => {
      const handlers = messageHandlers.get(type) || []
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  const off = (type: string, handler?: (data: any) => void) => {
    if (!handler) {
      messageHandlers.delete(type)
    } else {
      const handlers = messageHandlers.get(type) || []
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  const scheduleReconnect = (url: string, options: UseWebSocketOptions) => {
    reconnectAttempts.value++
    const delay = reconnectDelay.value * Math.pow(2, reconnectAttempts.value - 1) // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.value}/${maxReconnectAttempts.value})`)
    
    reconnectTimeout = setTimeout(() => {
      connect(url, options)
    }, delay)
  }

  const startHeartbeat = () => {
    heartbeatInterval = setInterval(() => {
      if (isConnected.value) {
        send('ping')
      }
    }, 30000) // Send ping every 30 seconds
  }

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  const flushMessageQueue = () => {
    while (messageQueue.length > 0 && isConnected.value) {
      const message = messageQueue.shift()!
      try {
        ws.value?.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send queued message:', error)
        // Put message back at the front of the queue
        messageQueue.unshift(message)
        break
      }
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    // State
    isConnected: readonly(isConnected),
    connectionStatus: readonly(connectionStatus),
    lastError: readonly(lastError),
    reconnectAttempts: readonly(reconnectAttempts),

    // Methods
    connect,
    disconnect,
    send,
    on,
    off
  }
}