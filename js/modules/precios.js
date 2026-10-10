import {icon} from '../icons.js';
import * as store from '../store.js';
import {esc, money, norm, fechaHora, bind, toast, openModal, showError} from './inv-ui.js';

// Gipsander · Módulo 3: Gestión de precios (F07 modificar precio global).
// Un único precio por producto, válido en todas las sedes y aplicable a nuevas ventas.
// Solo el administrador puede cambiarlo; los demás roles lo consultan.
export function renderPrecios(container, user){
  const isAdmin = user?.role === 'admin';
  const ui = {q:'', flash:null};
  container.innerHTML = `<section class="inventory-module inv">
<header class="inv-head"><div><span class="eyebrow">${isAdmin ? 'Administración' : 'Consulta'}</span><h1>Precios</h1><p>El precio global se actualiza una sola vez y vale para todas las sedes. Las ventas ya registradas no cambian.</p></div></header>
${isAdmin ? '' : '<p class="inv-note">Solo lectura: únicamente el administrador puede modificar el precio global.</p>'}
<div class="inv-split is-prices"><div>
<div class="inv-toolbar"><div class="inv-search">${icon('search')}<label class="inv-sr" for="pr-q">Buscar producto</label><input id="pr-q" type="search" placeholder="Buscar por nombre o código" autocomplete="off"></div></div>
<div class="inv-tablewrap"><table class="inv-table"><caption class="inv-sr">Precio global por producto</caption>
<thead><tr><th scope="col">Producto</th><th scope="col">Categoría</th><th scope="col" class="num">Precio global</th>${isAdmin ? '<th scope="col"><span class="inv-sr">Acciones</span></th>' : ''}</tr></thead><tbody id="pr-body"></tbody></table></div>
<p class="inv-count" id="pr-count" role="status"></p></div>
<aside class="inv-box"><h2>${icon('history')} Cambios recientes</h2><ul class="inv-history" id="pr-hist"></ul></aside></div></section>`;
  const root = container.firstElementChild;
  const $ = s => container.querySelector(s);

  function draw(){
    const list = store.getProductos().filter(p => !ui.q || norm(p.nombre).includes(norm(ui.q)) || norm(p.codigo).includes(norm(ui.q)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    $('#pr-body').innerHTML = list.length ? list.map(p => `<tr data-codigo="${esc(p.codigo)}" class="${ui.flash === p.codigo ? 'is-flash' : ''}">
<th scope="row"><strong>${esc(p.nombre)}</strong><span class="inv-sub">${esc(p.codigo)}${p.activo ? '' : ' · inactivo'}</span></th><td>${esc(p.categoria)}</td>
<td class="num"><strong>${money(p.precioGlobal)}</strong> <span class="inv-unit">/ ${esc(p.unidadMedida)}</span></td>
${isAdmin ? `<td class="inv-cell-actions"><button type="button" class="inv-btn is-small" data-precio="${esc(p.codigo)}" aria-label="Cambiar precio de ${esc(p.nombre)}">${icon('price')}Cambiar precio</button></td>` : ''}</tr>`).join('')
      : `<tr><td colspan="4"><div class="inv-empty"><p>No hay productos que coincidan.</p></div></td></tr>`;
    $('#pr-count').textContent = `${list.length} productos`;
    ui.flash = null;
    const h = store.getHistorialPrecios(8);
    $('#pr-hist').innerHTML = h.length ? h.map(x => `<li><strong>${esc(x.nombre)}</strong><span>${money(x.anterior)} → <b class="${x.nuevo > x.anterior ? 'is-up' : 'is-down'}">${money(x.nuevo)}</b> <i class="inv-sr">${x.nuevo > x.anterior ? 'subió' : 'bajó'}</i></span><time datetime="${x.fecha}">${fechaHora(x.fecha)} · ${esc(x.usuario)}</time></li>`).join('')
      : '<li class="inv-muted">Todavía no hay cambios de precio.</li>';
  }

  function formPrecio(codigo){
    const p = store.getProducto(codigo);
    const {close, root} = openModal({title:'Modificar precio global', body:`
<p class="inv-modal-text"><strong>${esc(p.nombre)}</strong> · ${esc(p.codigo)}<br>Precio actual: <strong>${money(p.precioGlobal)}</strong> por ${esc(p.unidadMedida)}. El nuevo precio aplica a todas las sedes en las próximas ventas.</p>
<form class="inv-form" novalidate><div class="inv-field"><label for="pp-precio">Nuevo precio (USD)</label><input id="pp-precio" type="number" min="0" step="0.01" inputmode="decimal" value="${p.precioGlobal}" required aria-describedby="pp-err"></div>
<p class="inv-error" id="pp-err" role="alert" hidden></p>
<div class="inv-actions"><button type="button" class="inv-btn" data-cancel>Cancelar</button><button type="submit" class="inv-btn is-primary">Guardar precio</button></div></form>`});
    const input = root.querySelector('#pp-precio');
    input.select();
    root.querySelector('[data-cancel]').addEventListener('click', close);
    root.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      ui.flash = codigo;
      const r = store.setPrecioGlobal(codigo, input.value, user?.name || 'Administrador');
      if (!r.ok) { ui.flash = null; input.setAttribute('aria-invalid', 'true'); showError(root.querySelector('#pp-err'), r.error); return; }
      close();
      toast(`${p.nombre}: ${money(r.anterior)} → ${money(r.nuevo)}`);
    });
  }

  $('#pr-q').addEventListener('input', e => { ui.q = e.target.value; draw(); });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-precio]');
    if (b && isAdmin) formPrecio(b.dataset.precio);
  });
  bind(container, store.subscribe, draw);
  draw();
}
