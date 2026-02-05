'use client';

import { useEffect, useCallback, useRef } from 'react';

const REGISTRY_URL = process.env.NEXT_PUBLIC_REGISTRY_URL || 'http://localhost:3000';

const EVENT_TYPES = [
  'task.created',
  'task.updated',
  'bid.submitted',
  'agent.registered',
  'reputation.updated',
] as const;

export type SseEventType = (typeof EVENT_TYPES)[number];

export interface SseEvent {
  type: SseEventType;
  payload: unknown;
}

export function useEvents(onEvent?: (event: SseEvent) => void) {
  const esRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const es = new EventSource(`${REGISTRY_URL}/events`);
    esRef.current = es;

    for (const type of EVENT_TYPES) {
      es.addEventListener(type, (e) => {
        try {
          const payload = JSON.parse(e.data);
          onEventRef.current?.({ type, payload });
        } catch {
          console.warn(`[sse] Failed to parse event: ${type}`, e.data);
        }
      });
    }

    es.onerror = () => {
      console.warn('[sse] Connection error, reconnecting in 3s...');
      es.close();
      esRef.current = null;
      setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);
}
