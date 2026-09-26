import { useEffect, useRef, useState } from 'react';

import NativeCarScreens from './NativeCarScreens';
import type { CarAlert, CarEvent, CarTemplate } from './types';
import { validateAlert, validateTemplate } from './validate';

export * from './types';
export {
  CarTemplateError,
  LIMITS,
  validateAlert,
  validateTemplate,
} from './validate';

/** False on web, in Expo Go, or when the native module isn't linked. */
export const isSupported = NativeCarScreens != null;

type Listener = (event: CarEvent) => void;
const listeners = new Set<Listener>();
let nativeSubscription: { remove(): void } | null = null;

function ensureSubscribed(): void {
  if (nativeSubscription || !NativeCarScreens) return;
  nativeSubscription = NativeCarScreens.onCarEvent((json) => {
    let event: CarEvent;
    try {
      event = JSON.parse(json);
    } catch {
      return;
    }
    listeners.forEach((l) => l(event));
  });
}

/**
 * Sets the root template. Sending a template with the same id and type again
 * updates the screen in place (throttled natively to about once a second).
 * The latest root is kept natively, so it is shown even if the car connects later.
 */
function setRoot(template: CarTemplate): void {
  validateTemplate(template);
  NativeCarScreens?.setRoot(JSON.stringify(template));
}

/** Pushes a template on top of the root (e.g. a detail list). */
function push(template: CarTemplate): void {
  validateTemplate(template);
  NativeCarScreens?.push(JSON.stringify(template));
}

function pop(): void {
  NativeCarScreens?.pop();
}

function showAlert(alert: CarAlert): void {
  validateAlert(alert);
  NativeCarScreens?.showAlert(JSON.stringify(alert));
}

function dismissAlert(): void {
  NativeCarScreens?.dismissAlert();
}

function isConnected(): boolean {
  return NativeCarScreens?.isConnected() ?? false;
}

/** Subscribes to car events. Returns an unsubscribe function. */
function addListener(listener: Listener): () => void {
  ensureSubscribed();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const CarScreens = {
  setRoot,
  push,
  pop,
  showAlert,
  dismissAlert,
  isConnected,
  addListener,
};

/** Whether a CarPlay / Android Auto screen is currently connected. */
export function useCarConnected(): boolean {
  const [connected, setConnected] = useState(isConnected);
  useEffect(
    () =>
      addListener((e) => {
        if (e.type === 'connect') setConnected(true);
        else if (e.type === 'disconnect') setConnected(false);
      }),
    []
  );
  return connected;
}

/** Keeps the root template in sync with `template`, skipping identical updates. */
export function useCarRootTemplate(template: CarTemplate | null): void {
  const last = useRef<string | null>(null);
  const json = template ? JSON.stringify(template) : null;
  useEffect(() => {
    if (!template || json === last.current) return;
    last.current = json;
    setRoot(template);
    // `json` captures every change in `template`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json]);
}

/** Calls `handler` for car events; the latest handler is always used. */
export function useCarEvents(handler: Listener): void {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => addListener((e) => ref.current(e)), []);
}
