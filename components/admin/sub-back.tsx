'use client';
import { createContext, useContext, useEffect, useRef } from 'react';

/** Retroceso de una sub-vista interna (p. ej. el detalle de una sede). Lo muestra el único botón «Volver» del panel. */
export interface SubBack { label: string; onBack: () => void }

export const SubBackContext = createContext<(back: SubBack | null) => void>(() => {});

/** Registra la sub-vista activa mientras `back` no sea null; al salir de ella el botón vuelve a su comportamiento normal. */
export function useSubBack(back: SubBack | null) {
  const register = useContext(SubBackContext);
  const onBack = useRef(back?.onBack);
  onBack.current = back?.onBack;
  const label = back?.label;
  useEffect(() => {
    if (!label) return;
    register({ label, onBack: () => onBack.current?.() });
    return () => register(null);
  }, [label, register]);
}
