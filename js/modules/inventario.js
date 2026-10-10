import {icon} from '../icons.js';
import * as store from '../store.js';
import {esc, money, num, fechaHora, norm, badge, bind, toast, openModal, showError} from './inv-ui.js';
import {renderCatalogo} from './catalogo.js';

// Gipsander · Módulo 5: Inventario y reposición (F11 stock y faltantes, F12 ingreso, F13 mínimos).
// Lo usan el encargado de inventario (solo sus sedes) y el administrador (todas las sedes).
// container es el elemento de montaje; user es el usuario autenticado ({role, sedes?}).
const memo = {sedeId:null, tab:'stock'};
const ORDEN = {agotado:0, bajo:1, ok:2};

export function renderInventario(container, user){
  const isAdmin = user?.role === 'admin';
  const sedes = store.sedesDeUsuario(user);
  if (!sedes.length) {
    container.innerHTML = '<section class="inventory-module inv"><div class="inv-empty"><h2>Sin sedes asignadas</h2><p>Pide al administrador que te asigne una sede para gestionar su inventario.</p></div></section>';
    return;
  }
  if (!sedes.some(s => s.id === memo.sedeId)) memo.sedeId = sedes[0].id;
  const tabs = [['stock', 'Stock y faltantes'], ['ingreso', 'Ingreso de mercancía'], ['minimos', 'Stock mínimo']];
  if (!isAdmin) tabs.push(['catalogo', 'Catálogo y precios']);
  if (!tabs.some(t => t[0] === memo.tab)) memo.tab = 'stock';

  container.innerHTML = `<section class="inventory-module inv">
<header class="inv-head"><div>${isAdmin ? '<span class="eyebrow">Administración · todas las sedes</span>' : ''}<h1>Inventario</h1><p>Consulta existencias, registra mercancía recibida y define cuándo reponer.</p></div>
<div class="inv-sede"><label for="inv-sede">Sede</label><select id="inv-sede">${sedes.map(s => `<option value="${s.id}">${esc(s.nombre)}</option>`).join('')}</select></div></header>
<div class="inv-tabs" role="tablist" aria-label="Secciones de inventario">${tabs.map(([id, label]) => `<button type="button" role="tab" id="tab-${id}" data-tab="${id}" aria-controls="inv-panel">${label}</button>`).join('')}</div>
<div class="inv-panel" id="inv-panel" role="tabpanel" tabindex="-1"></div></section>`;

  let panel = container.querySelector('#inv-panel');
  const select = container.querySelector('#inv-sede');
  select.value = memo.sedeId;
  const view = {refresh:null};

  function showTab(id){
    memo.tab = id;
    panel.__invUnsub?.();
    const fresh = panel.cloneNode(false); // panel nuevo: descarta los listeners de la pestaña anterior
    panel.replaceWith(fresh);
    panel = fresh;
    view.refresh = null;
    container.querySelectorAll('[role="tab"]').forEach(b => {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', 'tab-' + id);
    if (id === 'stock') tabStock(panel, view);
    else if (id === 'ingreso') tabIngreso(panel, view);
    else if (id === 'minimos') tabMinimos(panel, view);
    else renderCatalogo(panel, user, {embedded:true});
  }
  container.querySelector('.inv-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab);
  });
  container.querySelector('.inv-tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const ids = tabs.map(t => t[0]);
    const next = ids[(ids.indexOf(memo.tab) + (e.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
    showTab(next);
    container.querySelector(`#tab-${next}`).focus();
  });
  select.addEventListener('change', () => { memo.sedeId = select.value; showTab(memo.tab); });
  bind(container, store.subscribe, () => view.refresh?.());
  showTab(memo.tab);
}

const categoriasOptions = rows => '<option value="">Todas las categorías</option>' +
  [...new Set(rows.map(r => r.producto.categoria))].sort().map(c => `<option>${esc(c)}</option>`).join('');

function coincide(r, q, cat){
  if (cat && r.producto.categoria !== cat) return false;
  if (!q) return true;
  const t = norm(q);
  return norm(r.producto.nombre).includes(t) || norm(r.productoCodigo).includes(t);
}

/* ===================== F11 · Stock y faltantes ===================== */
function tabStock(panel, view){
  const ui = {q:'', cat:'', filtro:'todos', flash:new Set()};
  panel.innerHTML = `<div class="inv-cards" id="st-cards"></div>
<div class="inv-toolbar"><div class="inv-search">${icon('search')}<label class="inv-sr" for="st-q">Buscar producto</label><input id="st-q" type="search" placeholder="Buscar por nombre o código" autocomplete="off"></div>
<div><label class="inv-sr" for="st-cat">Categoría</label><select id="st-cat"></select></div></div>
<div class="inv-chips" role="group" aria-label="Filtrar por estado">${[['todos', 'Todos'], ['agotado', 'Agotados'], ['bajo', 'Stock bajo'], ['ok', 'Disponibles']].map(([f, l]) => `<button type="button" class="inv-chip" data-f="${f}" aria-pressed="${f === 'todos'}">${l} <span data-n="${f}">0</span></button>`).join('')}</div>
<div class="inv-tablewrap"><table class="inv-table"><caption class="inv-sr">Existencias de la sede seleccionada</caption>
<thead><tr><th scope="col">Producto</th><th scope="col">Categoría</th><th scope="col" class="num">Precio global</th><th scope="col" class="num">Existencia</th><th scope="col" class="num">Mínimo</th><th scope="col" class="num">Faltan</th><th scope="col">Estado</th><th scope="col"><span class="inv-sr">Acciones</span></th></tr></thead><tbody id="st-body"></tbody></table></div>
<p class="inv-count" id="st-count" role="status"></p>`;
  const $ = s => panel.querySelector(s);
  const all = () => store.getStock(memo.sedeId);
  $('#st-cat').innerHTML = categoriasOptions(all());

  function draw(){
    const rows = all();
    const n = {todos:rows.length, agotado:0, bajo:0, ok:0};
    let reponer = 0;
    rows.forEach(r => { n[r.estado]++; reponer += r.faltan; });
    $('#st-cards').innerHTML = `
<div class="inv-card"><span>Productos en la sede</span><strong>${num(n.todos)}</strong></div>
<div class="inv-card is-agotado"><span>Agotados</span><strong>${num(n.agotado)}</strong></div>
<div class="inv-card is-bajo"><span>Con stock bajo</span><strong>${num(n.bajo)}</strong></div>
<div class="inv-card"><span>Unidades por reponer</span><strong>${num(reponer)}</strong></div>`;
    panel.querySelectorAll('[data-n]').forEach(s => { s.textContent = n[s.dataset.n]; });
    panel.querySelectorAll('[data-f]').forEach(b => b.setAttribute('aria-pressed', b.dataset.f === ui.filtro));
    const list = rows.filter(r => coincide(r, ui.q, ui.cat) && (ui.filtro === 'todos' || r.estado === ui.filtro))
      .sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || b.faltan - a.faltan || a.producto.nombre.localeCompare(b.producto.nombre, 'es'));
    $('#st-body').innerHTML = list.length ? list.map(r => `<tr data-codigo="${esc(r.productoCodigo)}" class="${ui.flash.has(r.productoCodigo) ? 'is-flash' : ''}">
<th scope="row"><strong>${esc(r.producto.nombre)}</strong><span class="inv-sub">${esc(r.productoCodigo)}</span></th>
<td>${esc(r.producto.categoria)}</td><td class="num">${money(r.producto.precioGlobal)}</td>
<td class="num"><strong>${num(r.cantidad)}</strong> <span class="inv-unit">${esc(r.producto.unidadMedida)}</span></td>
<td class="num">${num(r.stockMinimo)}</td>
<td class="num">${r.faltan ? `<span class="inv-falta is-${r.estado}">${num(r.faltan)} <small>faltan</small></span>` : '<span class="inv-muted" aria-label="Ninguna">—</span>'}</td>
<td>${badge(r.estado)}</td>
<td class="inv-cell-actions"><button type="button" class="inv-btn is-small" data-ingreso="${esc(r.productoCodigo)}" aria-label="Ingresar mercancía de ${esc(r.producto.nombre)}">${icon('download')}Ingresar</button></td></tr>`).join('')
      : `<tr><td colspan="8"><div class="inv-empty"><h3>No hay productos para mostrar</h3><p>Prueba con otra búsqueda o limpia los filtros.</p><button type="button" class="inv-btn" data-clear>Limpiar filtros</button></div></td></tr>`;
    $('#st-count').textContent = `${list.length} de ${rows.length} productos`;
    ui.flash.clear();
  }
  $('#st-q').addEventListener('input', e => { ui.q = e.target.value; draw(); });
  $('#st-cat').addEventListener('change', e => { ui.cat = e.target.value; draw(); });
  panel.addEventListener('click', e => {
    const chip = e.target.closest('[data-f]');
    if (chip) { ui.filtro = chip.dataset.f; draw(); return; }
    if (e.target.closest('[data-clear]')) { ui.q = ''; ui.cat = ''; ui.filtro = 'todos'; $('#st-q').value = ''; $('#st-cat').value = ''; draw(); return; }
    const b = e.target.closest('[data-ingreso]');
    if (b) abrirIngreso(b.dataset.ingreso, ui.flash);
  });
  view.refresh = draw;
  draw();
}

function abrirIngreso(codigo, flash){
  const e = store.getExistencia(memo.sedeId, codigo), p = store.getProducto(codigo);
  if (!e || !p) return;
  const falta = store.faltan(e);
  const {close, root} = openModal({title:'Ingresar mercancía', body:`
<p class="inv-modal-text"><strong>${esc(p.nombre)}</strong> · ${esc(codigo)}<br>${esc(store.getSede(memo.sedeId).nombre)} · Existencia actual: <strong>${num(e.cantidad)} ${esc(p.unidadMedida)}</strong> · Mínimo: ${num(e.stockMinimo)}${falta ? ` · <span class="inv-falta is-bajo">Faltan ${num(falta)}</span>` : ''}</p>
<form class="inv-form" novalidate>
<div class="inv-field"><label for="mi-cant">Cantidad recibida (${esc(p.unidadMedida)})</label><input id="mi-cant" type="number" min="1" step="1" inputmode="numeric" required${falta ? ` value="${falta}"` : ''} aria-describedby="mi-err"></div>
<div class="inv-field"><label for="mi-motivo">Motivo</label><input id="mi-motivo" type="text" value="Recepción de proveedor" maxlength="80"></div>
<p class="inv-error" id="mi-err" role="alert" hidden></p>
<div class="inv-actions"><button type="button" class="inv-btn" data-cancel>Cancelar</button><button type="submit" class="inv-btn is-primary">Registrar ingreso</button></div></form>`});
  root.querySelector('[data-cancel]').addEventListener('click', close);
  root.querySelector('form').addEventListener('submit', ev => {
    ev.preventDefault();
    flash?.add(codigo); // se marca antes de guardar: el store notifica y la fila se repinta resaltada
    const r = store.registrarEntrada(memo.sedeId, codigo, root.querySelector('#mi-cant').value, root.querySelector('#mi-motivo').value);
    if (!r.ok) {
      flash?.delete(codigo); showError(root.querySelector('#mi-err'), r.error); root.querySelector('#mi-cant').setAttribute('aria-invalid', 'true'); return; }
    close();
    toast(`${p.nombre}: ${num(r.anterior)} → ${num(r.nueva)} ${p.unidadMedida}`);
  });
}

/* ===================== F12 · Registrar mercancía ===================== */
function tabIngreso(panel, view){
  const rows0 = store.getStock(memo.sedeId).sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es'));
  panel.innerHTML = `<div class="inv-split">
<form class="inv-box inv-form" id="ing-form" novalidate>
<h2>Registrar ingreso</h2><p class="inv-muted">La cantidad se suma al stock de <strong>${esc(store.getSede(memo.sedeId).nombre)}</strong> y queda guardada como movimiento de entrada.</p>
<div class="inv-field"><label for="ing-prod">Producto</label><select id="ing-prod" required aria-describedby="ing-info"><option value="">Selecciona un producto…</option>${rows0.map(r => `<option value="${esc(r.productoCodigo)}">${esc(r.producto.nombre)} · ${esc(r.productoCodigo)}</option>`).join('')}</select>
<p class="inv-hint" id="ing-info">Elige un producto para ver su existencia actual.</p></div>
<div class="inv-field"><label for="ing-cant">Cantidad recibida</label><div class="inv-inline"><input id="ing-cant" type="number" min="1" step="1" inputmode="numeric" required aria-describedby="ing-err"><button type="button" class="inv-btn" id="ing-fill" hidden></button></div></div>
<div class="inv-field"><label for="ing-motivo">Motivo</label><input id="ing-motivo" type="text" value="Recepción de proveedor" maxlength="80"></div>
<p class="inv-error" id="ing-err" role="alert" hidden></p>
<button type="submit" class="inv-btn is-primary">${icon('download')}Registrar ingreso</button></form>
<div class="inv-box"><h2>Últimos movimientos</h2><div class="inv-tablewrap"><table class="inv-table is-compact"><caption class="inv-sr">Movimientos de inventario de la sede</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Producto</th><th scope="col">Tipo</th><th scope="col" class="num">Cantidad</th><th scope="col">Motivo</th></tr></thead><tbody id="ing-mov"></tbody></table></div></div></div>`;
  const $ = s => panel.querySelector(s);
  const sel = $('#ing-prod'), cant = $('#ing-cant'), err = $('#ing-err'), fill = $('#ing-fill');

  function info(){
    const ex = sel.value && store.getExistencia(memo.sedeId, sel.value);
    const p = sel.value && store.getProducto(sel.value);
    if (!ex || !p) { $('#ing-info').textContent = 'Elige un producto para ver su existencia actual.'; fill.hidden = true; return; }
    const f = store.faltan(ex);
    $('#ing-info').textContent = `Existencia actual: ${num(ex.cantidad)} ${p.unidadMedida} · Mínimo: ${num(ex.stockMinimo)}${f ? ` · Faltan ${num(f)}` : ' · Stock suficiente'}`;
    fill.hidden = !f;
    fill.textContent = `Reponer faltante (${num(f)})`;
    fill.dataset.n = f;
  }
  function movs(){
    const list = store.getMovimientos({sedeId:memo.sedeId, limit:10});
    $('#ing-mov').innerHTML = list.length ? list.map(m => {
      const p = store.getProducto(m.productoCodigo);
      return `<tr><td>${fechaHora(m.fecha)}</td><td>${esc(p?.nombre || m.productoCodigo)}<span class="inv-sub">${esc(m.productoCodigo)}</span></td><td><span class="inv-tag is-${m.tipo === 'ENTRADA' ? 'in' : 'out'}">${m.tipo}</span></td><td class="num">${m.tipo === 'ENTRADA' ? '+' : '−'}${num(m.cantidad)}</td><td>${esc(m.motivo)}</td></tr>`;
    }).join('') : '<tr><td colspan="5"><div class="inv-empty"><p>Aún no hay movimientos en esta sede.</p></div></td></tr>';
  }
  sel.addEventListener('change', () => { info(); showError(err, ''); });
  fill.addEventListener('click', () => { cant.value = fill.dataset.n; cant.focus(); });
  $('#ing-form').addEventListener('submit', ev => {
    ev.preventDefault();
    if (!sel.value) { showError(err, 'Selecciona el producto que recibiste.'); sel.focus(); return; }
    const p = store.getProducto(sel.value);
    const r = store.registrarEntrada(memo.sedeId, sel.value, cant.value, $('#ing-motivo').value);
    if (!r.ok) { showError(err, r.error); cant.setAttribute('aria-invalid', 'true'); cant.focus(); return; }
    showError(err, ''); cant.removeAttribute('aria-invalid');
    toast(`${p.nombre}: ${num(r.anterior)} → ${num(r.nueva)} ${p.unidadMedida}`);
    cant.value = ''; cant.focus();
  });
  view.refresh = () => { info(); movs(); };
  movs();
}

/* ===================== F13 · Configurar mínimos ===================== */
function tabMinimos(panel, view){
  const ui = {q:'', cat:''};
  panel.innerHTML = `<p class="inv-muted inv-lead">Define a partir de qué cantidad un producto debe reponerse en esta sede. Las alertas se actualizan al instante.</p>
<div class="inv-toolbar"><div class="inv-search">${icon('search')}<label class="inv-sr" for="mn-q">Buscar producto</label><input id="mn-q" type="search" placeholder="Buscar por nombre o código" autocomplete="off"></div>
<div><label class="inv-sr" for="mn-cat">Categoría</label><select id="mn-cat"></select></div></div>
<div class="inv-tablewrap"><table class="inv-table"><caption class="inv-sr">Stock mínimo por producto en la sede seleccionada</caption>
<thead><tr><th scope="col">Producto</th><th scope="col" class="num">Existencia</th><th scope="col" class="num">Stock mínimo</th><th scope="col" class="num">Faltan</th><th scope="col">Estado</th></tr></thead><tbody id="mn-body"></tbody></table></div>
<p class="inv-count" id="mn-count" role="status"></p>`;
  const $ = s => panel.querySelector(s);
  const body = $('#mn-body');
  const all = () => store.getStock(memo.sedeId);
  $('#mn-cat').innerHTML = categoriasOptions(all());

  const qty = r => `<strong>${num(r.cantidad)}</strong> <span class="inv-unit">${esc(r.producto.unidadMedida)}</span>`;
  function build(){
    const rows = all().filter(r => coincide(r, ui.q, ui.cat)).sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre, 'es'));
    body.dataset.codes = rows.map(r => r.productoCodigo).join();
    body.innerHTML = rows.length ? rows.map(r => `<tr data-codigo="${esc(r.productoCodigo)}">
<th scope="row"><strong>${esc(r.producto.nombre)}</strong><span class="inv-sub">${esc(r.productoCodigo)}</span></th>
<td class="num" data-c="qty">${qty(r)}</td>
<td class="num"><label class="inv-sr" for="min-${esc(r.productoCodigo)}">Stock mínimo de ${esc(r.producto.nombre)}</label><input class="inv-min" id="min-${esc(r.productoCodigo)}" type="number" min="0" step="1" inputmode="numeric" value="${r.stockMinimo}" data-codigo="${esc(r.productoCodigo)}"></td>
<td class="num" data-c="falta"></td><td data-c="estado"></td></tr>`).join('')
      : '<tr><td colspan="5"><div class="inv-empty"><p>No hay productos que coincidan.</p></div></td></tr>';
    $('#mn-count').textContent = `${rows.length} productos`;
    patch();
  }
  function patch(){
    const byCode = new Map(all().map(x => [x.productoCodigo, x]));
    body.querySelectorAll('tr[data-codigo]').forEach(tr => {
      const r = byCode.get(tr.dataset.codigo);
      if (!r) return;
      tr.querySelector('[data-c="qty"]').innerHTML = qty(r);
      tr.querySelector('[data-c="falta"]').innerHTML = r.faltan ? `<span class="inv-falta is-${r.estado}">${num(r.faltan)} <small>faltan</small></span>` : '<span class="inv-muted" aria-label="Ninguna">—</span>';
      tr.querySelector('[data-c="estado"]').innerHTML = badge(r.estado);
      const input = tr.querySelector('.inv-min');
      if (document.activeElement !== input) input.value = r.stockMinimo;
    });
  }
  $('#mn-q').addEventListener('input', e => { ui.q = e.target.value; build(); });
  $('#mn-cat').addEventListener('change', e => { ui.cat = e.target.value; build(); });
  body.addEventListener('change', e => {
    const input = e.target.closest('.inv-min'); if (!input) return;
    const r = store.setStockMinimo(memo.sedeId, input.dataset.codigo, input.value);
    if (!r.ok) {
      input.value = store.getExistencia(memo.sedeId, input.dataset.codigo).stockMinimo;
      toast(r.error, 'error');
    } else {
      toast(`Mínimo de ${store.getProducto(input.dataset.codigo).nombre}: ${num(Number(input.value))}`);
    }
  });
  body.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.closest('.inv-min')) return;
    e.preventDefault();
    const inputs = [...body.querySelectorAll('.inv-min')];
    (inputs[inputs.indexOf(e.target) + 1] || e.target).focus();
    if (inputs.at(-1) === e.target) e.target.blur();
  });
  view.refresh = () => { if (body.dataset.codes === all().filter(r => coincide(r, ui.q, ui.cat)).map(r => r.productoCodigo).join()) patch(); else build(); };
  build();
}
