import { ArrowLeft, Hammer } from 'lucide-react';
import type { AdminModule } from './modules';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/ui/layout';

/** Módulos de Rafael (usuarios y sedes): aún sin desarrollar, se muestran como pendientes. */
export function ModulePlaceholder({ module, onBack }: { module: AdminModule; onBack: () => void }) {
  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <PageHeading eyebrow="Administración" title={module.title} description={module.description} />
      <div className="mx-auto max-w-[780px] rounded-[20px] border border-line bg-white px-7 py-14 text-center">
        <span className="mx-auto mb-5 grid size-[70px] place-items-center rounded-[22px] bg-brand-soft text-brand"><Hammer className="size-8" aria-hidden="true" /></span>
        <span className="mb-4 inline-block rounded-full border border-line bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-muted">Próximamente</span>
        <h2 className="mb-2.5 text-[22px] font-bold text-strong">Este espacio está listo para crecer</h2>
        <p className="mx-auto mb-5 max-w-[44ch] text-muted">El módulo de {module.title.toLowerCase()} se desarrollará en una próxima etapa.</p>
        <p className="mb-5 text-[13px] font-semibold text-muted">Responsable: {module.owner}</p>
        <Button onClick={onBack}><ArrowLeft aria-hidden="true" />Volver al inicio</Button>
      </div>
    </section>
  );
}
