import { norm } from '@/lib/format';

export type ProductKind = 'leche' | 'pan' | 'botella' | 'aceite' | 'harina' | 'grano' | 'cafe' | 'fruta' | 'carne' | 'limpieza' | 'higiene' | 'generico';

/** Palabras clave (sin tildes, en minúscula) por familia; el orden importa: la primera familia que coincide gana. */
const KEYWORDS: [ProductKind, string[]][] = [
  ['aceite', ['aceite']],
  ['cafe', ['cafe', 'espresso', 'cacao', 'chocolate']],
  ['leche', ['leche', 'yogur', 'yogurt', 'queso', 'mantequilla', 'crema', 'lacteo']],
  ['pan', ['pan ', 'pan', 'panaderia', 'galleta', 'torta', 'pastel', 'croissant', 'arepa']],
  ['botella', ['agua', 'refresco', 'jugo', 'gaseosa', 'cola', 'bebida', 'cerveza', 'vino', 'soda', 'te ']],
  ['harina', ['harina', 'azucar', 'sal ', 'sal', 'polvo', 'avena', 'maizena']],
  ['grano', ['arroz', 'pasta', 'fideo', 'espagueti', 'spaghetti', 'macarron', 'lenteja', 'caraota', 'frijol', 'grano', 'cereal', 'despensa']],
  ['fruta', ['fruta', 'verdura', 'tomate', 'cebolla', 'platano', 'banana', 'manzana', 'naranja', 'papa', 'zanahoria', 'lechuga', 'limon', 'cambur']],
  ['carne', ['carne', 'pollo', 'res', 'cerdo', 'pescado', 'jamon', 'salchicha', 'embutido']],
  ['higiene', ['jabon', 'shampoo', 'champu', 'crema dental', 'cepillo', 'desodorante', 'cuidado personal', 'higiene']],
  ['limpieza', ['detergente', 'limpia', 'cloro', 'lavaplatos', 'papel higienico', 'servilleta', 'suavizante', 'desinfectante', 'limpieza']],
];

const words = (s: string) => ` ${norm(s)} `;
const hit = (text: string, k: string) => (k.endsWith(' ') ? text.includes(` ${k}`) : text.includes(` ${k}`) || (k.length > 4 && text.includes(k)));

/** Familia del producto según su nombre y, si no coincide, su categoría. No depende de la presentación ("1 L", "500 ml"). */
export function productKind(nombre: string, categoria = ''): ProductKind {
  for (const texto of [words(nombre), words(categoria)]) {
    // «papel higiénico» es limpieza aunque contenga «higiene»: se evalúa antes por frase completa.
    if (texto.includes('papel higienico')) return 'limpieza';
    for (const [kind, keys] of KEYWORDS) if (keys.some((k) => hit(texto, k))) return kind;
  }
  return 'generico';
}

const P = {
  leche: <><path d="M8 3h8l1 4v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7z" /><path d="M7 7h10M10 12h4M10 15h4" /></>,
  pan: <><path d="M5 11a4 4 0 0 1 2-7h10a4 4 0 0 1 2 7v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M9 9v2M12 9v2M15 9v2" /></>,
  botella: <><path d="M10 3h4v3l1.5 3v11a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V9L10 6z" /><path d="M8.5 13h7" /></>,
  aceite: <><path d="M10 2h4v3h-4zM10 5l-3 4v11a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9l-3-4" /><path d="M12 12c1.5 1.7 2 2.6 2 3.5a2 2 0 0 1-4 0c0-.9.5-1.8 2-3.5z" /></>,
  harina: <><path d="M6 5l1-2h10l1 2 1 14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z" /><path d="M6 5h12M9 12h6M9 15h6" /></>,
  grano: <><path d="M12 21V8M12 8c-2-.5-3-2-3-4 2 .5 3 2 3 4zM12 8c2-.5 3-2 3-4-2 .5-3 2-3 4zM12 14c-2-.5-3-2-3-4 2 .5 3 2 3 4zM12 14c2-.5 3-2 3-4-2 .5-3 2-3 4z" /></>,
  cafe: <><path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M16 10h2a2 2 0 0 1 0 5h-2M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3" /></>,
  fruta: <><path d="M12 8c-4-2-8 1-7 6 .8 4 3.5 6 7 6s6.2-2 7-6c1-5-3-8-7-6z" /><path d="M12 8c0-2 1-3.5 3-4" /></>,
  carne: <><path d="M5 12c0-4 3.5-7 8-7 4 0 6 2.5 6 5 0 4-3.5 8-8 8-3.5 0-6-2.5-6-6z" /><circle cx="14" cy="10.5" r="1.5" /></>,
  limpieza: <><path d="M9 3h4v3H9zM13 4h3l2 2M9 6l-2 3v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9l-2-3" /><path d="M7 14h8" /></>,
  higiene: <><path d="M8 11a4 4 0 0 1 8 0v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" /><path d="M10 7V4h4v3M12 14.5c1 1 1.5 1.7 1.5 2.2a1.5 1.5 0 0 1-3 0c0-.5.5-1.2 1.5-2.2z" /></>,
  generico: <><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
} satisfies Record<ProductKind, React.ReactNode>;

/** SVG ligero e inline: todos los productos de una misma familia comparten exactamente el mismo dibujo. */
export function ProductIcon({ nombre, categoria, className = 'size-10' }: { nombre: string; categoria?: string; className?: string }) {
  const kind = productKind(nombre, categoria);
  return (
    <span aria-hidden="true" data-kind={kind} className={`grid shrink-0 place-items-center rounded-xl bg-brand-soft text-brand ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-[62%]">{P[kind]}</svg>
    </span>
  );
}

/** Avatar del cajero: busto con gorra y credencial. */
export function CajeroAvatar({ className = 'size-10' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-xl bg-brand-soft text-brand ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-[66%]">
        <circle cx="12" cy="9" r="3.2" />
        <path d="M8.5 7.5C8.8 5 10 4 12 4s3.2 1 3.5 3.5M7 20c0-3.5 2.2-5.5 5-5.5s5 2 5 5.5" />
        <path d="M10.5 17.5h3" />
      </svg>
    </span>
  );
}

export function TrofeoIcon({ className = 'size-9' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z" />
    </svg>
  );
}
