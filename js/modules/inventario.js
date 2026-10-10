import {icon} from '../icons.js';
// Gipsander: desarrolla aquí tu módulo y conserva esta función exportada.
// container es tu elemento de montaje; user es el usuario ficticio autenticado.
export function renderInventario(container,user){
container.innerHTML=`<section class="module-empty inventory-module"><div class="empty-icon">${icon('inventory')}</div><span class="demo-label">Módulo de inventario</span><h1>Eres de inventario</h1><p>Bienvenido, ${user.name}. Este es tu espacio para consultar productos y gestionar la mercancía de tu tienda.</p><span class="module-owner">Gipsander, aquí comienza tu módulo.</span><span class="demo-label">En desarrollo</span></section>`;
}
