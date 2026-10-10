'use client';
import { useSyncExternalStore } from 'react';
import type { User } from './types';

// Cuentas ficticias y públicas. Este acceso solo simula roles, no protege datos.
export const USERS: User[] = [
  { username: 'rafael', name: 'Rafael', role: 'admin', label: 'Administrador' },
  { username: 'gipsander', name: 'Gipsander', role: 'inventario', label: 'Inventario', sedes: ['s1', 's2'] },
  { username: 'luis', name: 'Luis', role: 'cajero', label: 'Cajero', sedes: ['s1'] },
];

// La sesión vive solo en memoria: recargar vuelve al acceso.
let current: User | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function login(username: string, password: string): User | null {
  const user = USERS.find((u) => u.username === username.trim().toLowerCase());
  current = user && password === 'admin' ? { ...user } : null;
  emit();
  return current;
}

export function logout(): void {
  current = null;
  emit();
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

export function useUser(): User | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
