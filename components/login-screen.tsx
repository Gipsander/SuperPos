'use client';
import { useRef, useState } from 'react';
import { login } from '@/lib/auth';
import { asset } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';

export function LoginScreen() {
  const [error, setError] = useState('');
  const pass = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!login(String(f.get('username')), String(f.get('password')))) {
      setError('Usuario o contraseña incorrectos. Inténtalo de nuevo.');
      pass.current?.focus();
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-b from-brand-soft to-page px-4 py-10">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="inline-flex items-center gap-3 text-[23px] font-bold tracking-tight text-brand"><img src={asset('/logo.svg')} alt="" width={40} height={40} />Superpos</span>
        <section aria-labelledby="login-title" className="w-full rounded-[20px] border border-line bg-white p-7 shadow-sm">
          <h1 id="login-title" className="mb-1 text-[26px] font-bold tracking-tight text-strong">¡Hola de nuevo!</h1>
          <p className="mb-5 text-muted">Inicia sesión para entrar a Superpos.</p>
          <form onSubmit={submit} onChange={() => setError('')} className="flex flex-col gap-4" noValidate>
            <Field label="Usuario">
              {(id) => <Input id={id} name="username" placeholder="Ingresa tu usuario" autoComplete="username" autoCapitalize="none" spellCheck={false} required aria-invalid={!!error} />}
            </Field>
            <Field label="Contraseña">
              {(id) => <Input id={id} ref={pass} name="password" type="password" placeholder="Ingresa tu contraseña" autoComplete="current-password" required aria-invalid={!!error} />}
            </Field>
            <p role="alert" className="m-0 min-h-5 text-[13px] font-semibold text-danger">{error}</p>
            <Button type="submit" variant="primary">Iniciar sesión</Button>
          </form>
        </section>
        <p className="m-0 text-muted">Tu supermercado de todos los días.</p>
        <span className="rounded-full border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-muted">Prototipo · Acceso de demostración</span>
      </div>
    </main>
  );
}
