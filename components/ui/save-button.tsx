'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';
import { Button } from './button';

/**
 * Botón de guardado con estado de carga (~400 ms, deshabilitado y con spinner) y confirmación visual,
 * para evitar dobles clics. `onSave` corre al terminar la espera y devuelve `true` si se guardó.
 */
export function SaveButton({ onSave, children = 'Guardar', savedText = 'Guardado', disabled, small, className, variant = 'primary', type = 'button', form }: {
  onSave: () => boolean; children?: React.ReactNode; savedText?: string; disabled?: boolean; small?: boolean; className?: string;
  variant?: 'default' | 'primary'; type?: 'button' | 'submit'; form?: string;
}) {
  const [fase, setFase] = useState<'idle' | 'saving' | 'saved'>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function click(e: React.MouseEvent) {
    if (type === 'submit') e.preventDefault();
    if (fase !== 'idle') return;
    setFase('saving');
    timers.current.push(setTimeout(() => {
      if (onSave()) {
        setFase('saved');
        timers.current.push(setTimeout(() => setFase('idle'), 1600));
      } else setFase('idle');
    }, 400));
  }
  return (
    <Button type={type} form={form} variant={fase === 'saved' ? 'default' : variant} small={small} onClick={click} disabled={disabled || fase === 'saving'} aria-busy={fase === 'saving'}
      className={`${fase === 'saved' ? 'border-ok bg-ok-bg text-ok ' : ''}${className ?? ''}`}>
      {fase === 'saving' ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Guardando...</>
        : fase === 'saved' ? <><Check aria-hidden="true" />{savedText}</> : children}
    </Button>
  );
}
