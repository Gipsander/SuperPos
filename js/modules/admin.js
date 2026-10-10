import {icon} from '../icons.js';
export const adminModules = [
{id:'usuarios',title:'Usuarios y roles',icon:'users',description:'Administra los accesos, los perfiles y las asignaciones de tu equipo.',owner:'Rafael'},
{id:'sedes',title:'Sedes',icon:'store',description:'Organiza las tiendas y consulta la información de cada sede.',owner:'Rafael'},
{id:'productos',title:'Productos',icon:'box',description:'Explora el catálogo y los productos de tu supermercado.',owner:'Gipsander'},
{id:'inventario',title:'Inventario',icon:'inventory',description:'Consulta existencias, ingresos de mercancía y alertas de stock.',owner:'Gipsander'},
{id:'precios',title:'Precios',icon:'price',description:'Consulta y administra los precios de los productos por tienda.',owner:'Gipsander'},
{id:'ventas',title:'Punto de venta',icon:'cart',description:'Accede a caja para preparar y registrar las compras.',owner:'Luis'},
{id:'reportes',title:'Reportes',icon:'chart',description:'Revisa las ventas, los productos más vendidos y los resultados por sede.',owner:'Luis'}
];
export function renderAdminHome(container){
container.innerHTML=`<div class="page-heading"><div><span class="eyebrow">Panel de administración</span><h1>Hola, Rafael</h1><p>Todo lo que necesitas para administrar tu supermercado, en un solo lugar.</p></div><span class="demo-label">Modo demostración</span></div>
<div class="welcome-banner"><div><h2>Bienvenido a Superpos</h2><p>Este es tu espacio de administración. Explora las opciones del sistema; cada módulo irá tomando forma en las próximas etapas.</p></div><span class="welcome-symbol">${icon('store')}</span></div>
<div class="section-heading"><h2>¿Por dónde empezamos?</h2><span>7 módulos por desarrollar</span></div>
<div class="module-grid">${adminModules.map(module=>`<button class="module-card" data-page="${module.id}"><span class="card-top"><span class="card-icon">${icon(module.icon)}</span><span class="card-arrow" aria-hidden="true">↗</span></span><h3>${module.title}</h3><p>${module.description}</p></button>`).join('')}</div>
<footer class="content-footer"><span>Superpos · Tu supermercado de todos los días.</span><span>Prototipo interactivo · Sin datos reales</span></footer>`;
}
export function renderAdminPlaceholder(container,module){
container.innerHTML=`<div class="admin-placeholder"><div class="page-heading"><div><span class="eyebrow">Administración</span><h1>${module.title}</h1><p>${module.description}</p></div></div><section class="module-empty"><div class="empty-icon">${icon(module.icon)}</div><span class="demo-label">Próximamente</span><h2>Este espacio está listo para crecer</h2><p>El módulo de ${module.title.toLowerCase()} se desarrollará en la siguiente etapa del prototipo.</p><span class="module-owner">Responsable: ${module.owner}</span><button class="secondary-button" data-page="inicio">${icon('arrow')} Volver al inicio</button></section></div>`;
}
