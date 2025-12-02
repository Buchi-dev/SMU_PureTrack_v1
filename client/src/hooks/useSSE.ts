/**
 * useSSE - Server-Sent Events Hook with Singleton Manager
 */
import { useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { API_BASE_URL } from '../config/api.config';
import { auth } from '../config/firebase.config';

export type SSEConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface SSEEvent<T = any> { type: string; data: T; timestamp?: string; }
export interface UseSSEOptions { enabled?: boolean; autoReconnect?: boolean; maxReconnectDelay?: number; initialReconnectDelay?: number; }
export interface UseSSEReturn { state: SSEConnectionState; error: Error | null; subscribe: <T = any>(eventType: string, handler: (event: SSEEvent<T>) => void) => () => void; reconnect: () => void; disconnect: () => void; }

class SSEManager {
  private static instance: SSEManager | null = null;
  private eventSource: EventSource | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay: number = 1000;
  private readonly maxReconnectDelay: number = 30000;
  private readonly initialReconnectDelay: number = 1000;
  private state: SSEConnectionState = 'disconnected';
  private error: Error | null = null;
  private subscribers: Map<string, Set<(event: any) => void>> = new Map();
  private stateListeners: Set<() => void> = new Set();
  private refCount: number = 0;
  private snapshot: { state: SSEConnectionState; error: Error | null } = { state: 'disconnected', error: null };
  
  private constructor() {}
  static getInstance(): SSEManager { if (!SSEManager.instance) { SSEManager.instance = new SSEManager(); } return SSEManager.instance; }
  subscribe(listener: () => void): () => void { this.stateListeners.add(listener); return () => { this.stateListeners.delete(listener); }; }
  getSnapshot(): { state: SSEConnectionState; error: Error | null } { return this.snapshot; }
  private notifyStateChange(): void { this.stateListeners.forEach(listener => listener()); }
  private setState(newState: SSEConnectionState): void { if (this.state !== newState) { this.state = newState; this.snapshot = { state: this.state, error: this.error }; this.notifyStateChange(); } }
  private setError(newError: Error | null): void { if (this.error !== newError) { this.error = newError; this.snapshot = { state: this.state, error: this.error }; this.notifyStateChange(); } }
  
  addRef(): void {
    this.refCount++;
    if (this.refCount === 1) { console.log('[SSEManager] First subscriber, connecting...'); this.connect(); }
    else { console.log(`[SSEManager] Subscriber added, total: ${this.refCount}`); }
  }
  
  removeRef(): void {
    this.refCount--;
    console.log(`[SSEManager] Subscriber removed, total: ${this.refCount}`);
    if (this.refCount === 0) { console.log('[SSEManager] No more subscribers, disconnecting...'); this.cleanup(); }
  }
  
  private cleanup(): void {
    if (this.reconnectTimeout) { clearTimeout(this.reconnectTimeout); this.reconnectTimeout = null; }
    if (this.eventSource) { this.eventSource.close(); this.eventSource = null; }
    this.setState('disconnected');
  }
  
  async connect(): Promise<void> {
    this.cleanup();
    this.setState('connecting');
    this.setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      const url = new URL(`${API_BASE_URL}/api/v1/sse/events`);
      url.searchParams.set('token', token);
      const eventSource = new EventSource(url.toString());
      this.eventSource = eventSource;
      eventSource.onopen = () => { console.log('[SSE] Connection established'); this.setState('connected'); this.reconnectDelay = this.initialReconnectDelay; };
      eventSource.onerror = () => { console.error('[SSE] Connection error'); this.setState('error'); this.setError(new Error('SSE connection failed')); if (this.refCount > 0) this.scheduleReconnect(); };
      const eventTypes = ['device:new', 'device:updated', 'reading:new', 'alert:new', 'alert:updated'];
      eventTypes.forEach(eventType => { eventSource.addEventListener(eventType, (e: MessageEvent) => { try { const data = JSON.parse(e.data); this.notifySubscribers(eventType, { type: eventType, data, timestamp: new Date().toISOString() }); } catch (parseError) { console.error(`[SSE] Failed to parse ${eventType} event:`, parseError); } }); });
      eventSource.addEventListener('heartbeat', () => { console.log('[SSE] Heartbeat received'); });
    } catch (err) { console.error('[SSE] Connection failed:', err); this.setState('error'); this.setError(err instanceof Error ? err : new Error('Unknown error')); if (this.refCount > 0) this.scheduleReconnect(); }
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;
    console.log(`[SSE] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimeout = setTimeout(() => { this.reconnectTimeout = null; this.connect(); }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }
  
  subscribeToEvent<T = any>(eventType: string, handler: (event: SSEEvent<T>) => void): () => void {
    if (!this.subscribers.has(eventType)) this.subscribers.set(eventType, new Set());
    this.subscribers.get(eventType)!.add(handler);
    return () => { const handlers = this.subscribers.get(eventType); if (handlers) { handlers.delete(handler); if (handlers.size === 0) this.subscribers.delete(eventType); } };
  }
  
  private notifySubscribers(eventType: string, event: any): void {
    const handlers = this.subscribers.get(eventType);
    if (handlers) handlers.forEach(handler => { try { handler(event); } catch (error) { console.error(`[SSE] Error in ${eventType} handler:`, error); } });
  }
  
  reconnect(): void { this.connect(); }
  disconnect(): void { this.cleanup(); }
}

const DEFAULT_OPTIONS: Required<UseSSEOptions> = { enabled: true, autoReconnect: true, maxReconnectDelay: 30000, initialReconnectDelay: 1000 };

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const managerRef = useRef(SSEManager.getInstance());
  const { state, error } = useSyncExternalStore((callback) => managerRef.current.subscribe(callback), () => managerRef.current.getSnapshot());
  const subscribe = useCallback(<T = any>(eventType: string, handler: (event: SSEEvent<T>) => void): (() => void) => { return managerRef.current.subscribeToEvent(eventType, handler); }, []);
  const reconnect = useCallback(() => { managerRef.current.reconnect(); }, []);
  const disconnect = useCallback(() => { managerRef.current.disconnect(); }, []);
  useEffect(() => { if (opts.enabled) { managerRef.current.addRef(); return () => { managerRef.current.removeRef(); }; } }, [opts.enabled]);
  return { state, error, subscribe, reconnect, disconnect };
}
