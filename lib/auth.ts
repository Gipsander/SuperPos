'use client';
import { useSyncExternalStore } from 'react';
import type { User } from './types';
import { getState, useStore } from './store';

// Cuentas ficticias y públicas. Este acceso solo simula roles, no protege datos.

// La sesión vive solo en memoria: recargar vuelve al acceso.
let current: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function login(username: string, password: string): User | null {
  const state = getState();
  const user = state.usuarios.find((u) => u.username === username.trim().toLowerCase());
  const valid = user?.activo && user.password === password &&
    (user.role === 'admin' || state.sedes.some((s) => s.id === user.sedeId && s.activa)) ? user : null;
  current = valid?.username ?? null;
  emit();
  return valid;
}

export function logout(): void {
  current = null;
  emit();
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function useUser(): User | null {
  const username = useSyncExternalStore(subscribe, () => current, () => null);
  const state = useStore();
  const user = state.usuarios.find((u) => u.username === username);
  return user?.activo && (user.role === 'admin' || state.sedes.some((s) => s.id === user.sedeId && s.activa)) ? user : null;
}
