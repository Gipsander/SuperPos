'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { Check, TriangleAlert } from 'lucide-react';

type ToastType = 'ok' | 'error';
interface Item { id: number; message: string; type: ToastType }
const Ctx = createContext<(message: string, type?: ToastType) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const push = useCallback((message: string, type: ToastType = 'ok') => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((i) => i.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-[1100] flex max-w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="flex animate-pop items-start gap-2 rounded-xl bg-strong px-3.5 py-2.5 font-semibold text-white shadow-lg">
            {t.type === 'ok'
              ? <Check className="mt-0.5 size-4 shrink-0 text-[#7de0b4]" aria-hidden="true" />
              : <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#ffb4ab]" aria-hidden="true" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
