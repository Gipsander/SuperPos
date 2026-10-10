import {icon} from '../icons.js';
// Luis: desarrolla aquí el punto de venta y conserva esta función exportada.
export function renderVentas(container,user){
container.innerHTML=`<section class="module-empty sales-module"><div class="empty-icon">${icon('cart')}</div><span class="demo-label">Punto de venta</span><h1>Eres vendedor</h1><p>Bienvenido, ${user.name}. Este es tu espacio para atender a los clientes y registrar las ventas de tu tienda.</p><span class="module-owner">Luis, aquí comienza tu módulo.</span><span class="demo-label">En desarrollo</span></section>`;
}
