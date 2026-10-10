'use client';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button, IconButton } from './button';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Diálogo accesible: foco atrapado, Escape, cierre al pulsar fuera y restitución del foco. */
export function Modal({ title, onClose, children, wide, printable }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; printable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    (dialog.querySelector<HTMLElement>('input:not([readonly]),select,textarea') ?? dialog.querySelector<HTMLElement>('[data-autofocus]') ?? dialog).focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus?.(); };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] grid animate-fade place-items-center bg-[rgb(20_40_60/0.52)] p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`max-h-[calc(100dvh-2rem)] w-full animate-pop overflow-auto rounded-2xl bg-white shadow-2xl outline-none ${wide ? 'max-w-[640px]' : 'max-w-[560px]'} ${printable ? 'print-area' : ''}`}
      >
        <header className="flex items-center justify-between gap-3 pt-3.5 pr-3.5 pl-[22px]">
          <h2 id={titleId} className="m-0 text-[19px] font-bold tracking-tight text-strong">{title}</h2>
          <IconButton onClick={onClose} aria-label="Cerrar" className="print:hidden"><X aria-hidden="true" /></IconButton>
        </header>
        <div className="px-[22px] pt-3 pb-[22px]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmModal({ title, message, confirmText = 'Confirmar', danger, onConfirm, onCancel }: {
  title: string; message: string; confirmText?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-4 text-ink">{message}</p>
      <div className="flex flex-wrap justify-end gap-2.5">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} data-autofocus>{confirmText}</Button>
      </div>
    </Modal>
  );
}
