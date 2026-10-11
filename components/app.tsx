'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3, Box, Boxes, LayoutGrid, LogOut, Store, Tag, Users, type LucideIcon,
} from 'lucide-react';
import { logout, useUser } from '@/lib/auth';
import type { User } from '@/lib/types';
import { asset, cx } from '@/lib/format';
import { ToastProvider } from '@/components/ui/toast';
import { LoginScreen } from '@/components/login-screen';
import { AdminHome } from '@/components/admin/admin-home';
import { ADMIN_MODULES, type AdminPage } from '@/components/admin/modules';
import { ModulePlaceholder } from '@/components/admin/module-placeholder';
import { Dashboard } from '@/components/admin/dashboard';
import { UsersPanel } from '@/components/admin/users-panel';
import { BranchesPanel } from '@/components/admin/branches-panel';
import { CatalogPanel } from '@/components/inventory/catalog-panel';
import { InventoryPanel } from '@/components/inventory/inventory-panel';
import { PricesPanel } from '@/components/inventory/prices-panel';
import { PosTerminal } from '@/components/pos/pos-terminal';

const ICONS: Record<string, LucideIcon> = { inicio: LayoutGrid, users: Users, store: Store, box: Box, inventory: Boxes, price: Tag, chart: BarChart3 };
const PAGES = new Set<string>(['inicio', ...ADMIN_MODULES.map((m) => m.id)]);

const Brand = () => (
  // eslint-disable-next-line @next/next/no-img-element
  <span className="inline-flex items-center gap-2.5 text-[23px] font-bold tracking-tight text-brand"><img src={asset('/logo.svg')} alt="" width={40} height={40} />Superpos</span>
);

function Profile({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-brand-soft font-bold text-brand">{user.name.slice(0, 1)}</span>
      <div className="hidden leading-tight sm:block"><p className="m-0 text-[13px] font-bold text-strong">{user.name}</p><p className="m-0 text-[11px] text-muted">{user.label}</p></div>
      <button type="button" onClick={logout} aria-label="Cerrar sesión" title="Cerrar sesión"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border-l border-line pl-3 text-muted hover:text-strong [&_svg]:size-5"><LogOut aria-hidden="true" /><span className="text-[13px]">Salir</span></button>
    </div>
  );
}

function AdminShell({ user }: { user: User }) {
  const [page, setPage] = useState<AdminPage>('inicio');
  const [selectedSede, setSelectedSede] = useState('');
  const go = useCallback((p: AdminPage, sedeId = '') => {
    setSelectedSede(sedeId);
    setPage(p);
    window.history.replaceState(null, '', `#${p}`);
    window.scrollTo({ top: 0 });
    document.getElementById('content')?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (PAGES.has(h)) setPage(h as AdminPage);
    const onHash = () => { const x = window.location.hash.slice(1); if (PAGES.has(x)) setPage(x as AdminPage); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const current = ADMIN_MODULES.find((m) => m.id === page);
  useEffect(() => { document.title = `SuperPOS · ${current?.title ?? 'Administración'}`; }, [current]);
  const nav: { id: AdminPage; title: string; icon: string }[] = [{ id: 'inicio', title: 'Inicio', icon: 'inicio' }, ...ADMIN_MODULES];

  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-[244px_minmax(0,1fr)]">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-white focus:p-2">Saltar al contenido</a>
      <aside className="flex flex-col border-b border-line bg-white p-4 md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0 md:px-4 md:py-6">
        <div className="mb-4 md:mb-6"><Brand /></div>
        <nav aria-label="Navegación del administrador" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {nav.map((n, i) => {
            const Icon = ICONS[n.icon];
            return (
              <div key={n.id} className="contents">
                {i === 1 && <p className="mt-3 mb-1 hidden px-3 text-[11px] font-bold tracking-[1.6px] text-muted uppercase md:block">Administración</p>}
                <button type="button" onClick={() => go(n.id)} aria-current={page === n.id ? 'page' : undefined}
                  className={cx('flex min-h-11 flex-none items-center gap-3 rounded-xl px-3 text-left font-semibold whitespace-nowrap [&_svg]:size-5',
                    page === n.id ? 'bg-brand-soft text-brand-dark' : 'text-muted hover:bg-soft hover:text-strong')}>
                  <Icon aria-hidden="true" />{n.title}
                </button>
              </div>
            );
          })}
        </nav>
        <div className="mt-auto hidden pt-6 md:block"><span className="rounded-full border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-muted">Modo demostración</span></div>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-3 md:px-8">
          <div className="flex items-center gap-2 text-[13px] text-muted"><span>Superpos</span><span aria-hidden="true">/</span><strong className="text-strong">{current?.title ?? 'Inicio'}</strong></div>
          <Profile user={user} />
        </header>
        <main id="content" tabIndex={-1} className="px-5 py-6 outline-none md:px-8 md:py-8">
          {page === 'inicio' && <AdminHome name={user.name} onNavigate={go} />}
          {page === 'usuarios' && <UsersPanel key={selectedSede} user={user} initialSedeId={selectedSede} />}
          {page === 'sedes' && <BranchesPanel user={user} onNavigate={go} />}
          {page === 'productos' && <CatalogPanel key={selectedSede} user={user} initialSedeId={selectedSede} />}
          {page === 'inventario' && <InventoryPanel key={selectedSede} user={user} initialSedeId={selectedSede} />}
          {page === 'precios' && <PricesPanel user={user} />}
          {page === 'reportes' && <Dashboard />}
          {current && !current.ready && <ModulePlaceholder module={current} onBack={() => go('inicio')} />}
        </main>
      </div>
    </div>
  );
}

function RoleShell({ user }: { user: User }) {
  useEffect(() => { document.title = `SuperPOS · ${user.label}`; }, [user.label]);
  return (
    <div className="min-h-dvh">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded-lg focus:bg-white focus:p-2">Saltar al contenido</a>
      <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-3 md:px-8"><Brand /><Profile user={user} /></header>
      <main id="content" tabIndex={-1} className="px-5 py-6 outline-none md:px-8 md:py-8">
        {user.role === 'inventario' ? <InventoryPanel user={user} /> : <PosTerminal user={user} />}
      </main>
    </div>
  );
}

export function App() {
  const user = useUser();
  useEffect(() => { if (!user) document.title = 'SuperPOS · Iniciar sesión'; }, [user]);
  return (
    <ToastProvider>
      {!user ? <LoginScreen /> : user.role === 'admin' ? <AdminShell key={user.username} user={user} /> : <RoleShell key={user.username} user={user} />}
    </ToastProvider>
  );
}
