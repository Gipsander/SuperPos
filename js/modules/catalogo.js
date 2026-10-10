import {icon} from '../icons.js';
import * as store from '../store.js';
import {esc, money, norm, bind, toast, openModal, confirmDialog, showError} from './inv-ui.js';

// Gipsander · Módulo 2: Catálogo de productos (F04 registrar, F05 actualizar, F06 habilitar por sede).
// Solo el administrador edita. Cualquier otro rol lo ve en modo lectura.
// opts.embedded: se muestra dentro de otra vista (usa h2 en lugar de h1).
export function renderCatalogo(container, user, opts = {}){
  const isAdmin = user?.role === 'admin';
  const sedes = store.sedesDeUsuario(user);
  const ui = {q:'', cat:'', estado:'todos', vista:'lista'};
  const H = opts.embedded ? 'h2' : 'h1';

  container.innerHTML = `<section class="inventory-module inv${opts.embedded ? ' is-embedded' : ''}">
<header class="inv-head"><div>${opts.embedded ? '' : `<span class="eyebrow">${isAdmin ? 'Administración' : 'Consulta'}</span>`}<${H}>Catálogo de productos</${H}><p>${isAdmin ? 'Un solo catálogo para toda la cadena. Cada producto tiene un único precio global.' : 'Consulta los productos y su precio global. Solo el administrador puede modificarlos.'}</p></div>
${isAdmin ? `<button type="button" class="inv-btn is-primary" data-nuevo>${icon('plus')}Nuevo producto</button>` : ''}</header>
${isAdmin ? `<div class="inv-seg" role="group" aria-label="Vista del catálogo"><button type="button" data-vista="lista" aria-pressed="true">Productos</button><button type="button" data-vista="sedes" aria-pressed="false">Disponibilidad por sede</button></div>` : '<p class="inv-note">Solo lectura: el catálogo y los precios los gestiona el administrador.</p>'}
<div class="inv-toolbar"><div class="inv-search">${icon('search')}<label class="inv-sr" for="cat-q">Buscar producto</label><input id="cat-q" type="search" placeholder="Buscar por nombre o código" autocomplete="off"></div>
<div><label class="inv-sr" for="cat-cat">Categoría</label><select id="cat-cat"><option value="">Todas las categorías</option>${store.CATEGORIAS.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
<div><label class="inv-sr" for="cat-est">Estado</label><select id="cat-est"><option value="todos">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select></div></div>
<div id="cat-view"></div><p class="inv-count" id="cat-count" role="status"></p></section>`;

  const root = container.firstElementChild;
  const $ = s => container.querySelector(s);
  const view = $('#cat-view');
  const filtrados = () => store.getProductos().filter(p =>
    (!ui.cat || p.categoria === ui.cat) &&
    (ui.estado === 'todos' || (ui.estado === 'activo') === p.activo) &&
    (!ui.q || norm(p.nombre).includes(norm(ui.q)) || norm(p.codigo).includes(norm(ui.q)))
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  function drawList(){
    const list = filtrados();
    const sedeIds = sedes.map(s => s.id);
    view.innerHTML = `<div class="inv-tablewrap"><table class="inv-table"><caption class="inv-sr">Catálogo de productos</caption>
<thead><tr><th scope="col">Producto</th><th scope="col">Categoría</th><th scope="col">Unidad</th><th scope="col" class="num">Precio global</th><th scope="col">Sedes</th><th scope="col">Estado</th>${isAdmin ? '<th scope="col"><span class="inv-sr">Acciones</span></th>' : ''}</tr></thead>
<tbody>${list.length ? list.map(p => {
      const n = store.sedesHabilitadas(p.codigo).filter(id => sedeIds.includes(id)).length;
      return `<tr data-codigo="${esc(p.codigo)}"><th scope="row"><strong>${esc(p.nombre)}</strong><span class="inv-sub">${esc(p.codigo)}</span></th>
<td>${esc(p.categoria)}</td><td>${esc(p.unidadMedida)}</td><td class="num">${money(p.precioGlobal)}</td>
<td>${n} de ${sedeIds.length}</td>
<td>${isAdmin ? `<button type="button" role="switch" class="inv-switch" aria-checked="${p.activo}" data-toggle="${esc(p.codigo)}" aria-label="Producto activo: ${esc(p.nombre)}"><span class="inv-switch-track" aria-hidden="true"></span><span>${p.activo ? 'Activo' : 'Inactivo'}</span></button>` : `<span class="inv-tag ${p.activo ? 'is-in' : 'is-off'}">${p.activo ? 'Activo' : 'Inactivo'}</span>`}</td>
${isAdmin ? `<td class="inv-cell-actions"><button type="button" class="inv-btn is-small" data-editar="${esc(p.codigo)}" aria-label="Editar ${esc(p.nombre)}">${icon('edit')}Editar</button></td>` : ''}</tr>`;
    }).join('') : `<tr><td colspan="7"><div class="inv-empty"><h3>No hay productos para mostrar</h3><p>Cambia la búsqueda o los filtros${isAdmin ? ', o registra un producto nuevo' : ''}.</p></div></td></tr>`}</tbody></table></div>`;
    $('#cat-count').textContent = `${list.length} productos`;
  }

  function drawMatrix(){
    const list = filtrados();
    view.innerHTML = `<p class="inv-muted inv-lead">Marca en qué sedes se vende y se controla cada producto. Cada sede lleva sus existencias de forma independiente.</p>
<div class="inv-tablewrap"><table class="inv-table is-matrix"><caption class="inv-sr">Productos habilitados por sede</caption>
<thead><tr><th scope="col">Producto</th>${sedes.map(s => `<th scope="col" class="ctr">${esc(s.nombre)}</th>`).join('')}</tr></thead>
<tbody>${list.length ? list.map(p => `<tr><th scope="row"><strong>${esc(p.nombre)}</strong><span class="inv-sub">${esc(p.codigo)}${p.activo ? '' : ' · inactivo'}</span></th>${sedes.map(s => `<td class="ctr"><input type="checkbox" class="inv-check" data-sede="${s.id}" data-codigo="${esc(p.codigo)}" aria-label="Habilitar ${esc(p.nombre)} en ${esc(s.nombre)}"></td>`).join('')}</tr>`).join('') : `<tr><td colspan="${sedes.length + 1}"><div class="inv-empty"><p>No hay productos que coincidan.</p></div></td></tr>`}</tbody></table></div>`;
    $('#cat-count').textContent = `${list.length} productos`;
    patchMatrix();
  }
  function patchMatrix(){
    view.querySelectorAll('.inv-check').forEach(cb => {
      cb.checked = !!store.getExistencia(cb.dataset.sede, cb.dataset.codigo)?.habilitado;
    });
  }
  const draw = () => ui.vista === 'lista' ? drawList() : drawMatrix();
  const refresh = () => {
    if (ui.vista === 'sedes') { patchMatrix(); return; }
    const keep = document.activeElement?.dataset?.toggle;
    drawList();
    if (keep) view.querySelector(`[data-toggle="${CSS.escape(keep)}"]`)?.focus();
  };

  /* ---- Formulario de producto (F04 / F05) ---- */
  function formProducto(codigo){
    const p = codigo ? store.getProducto(codigo) : null;
    const opt = (list, sel) => list.map(v => `<option${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');
    const {close, root} = openModal({title:p ? 'Editar producto' : 'Nuevo producto', body:`<form class="inv-form" novalidate>
<div class="inv-grid2">
<div class="inv-field"><label for="pf-codigo">Código</label><input id="pf-codigo" value="${esc(p?.codigo || '')}" ${p ? 'readonly' : 'placeholder="Ej. P-025" maxlength="16" required'} autocomplete="off"></div>
<div class="inv-field"><label for="pf-nombre">Nombre</label><input id="pf-nombre" value="${esc(p?.nombre || '')}" maxlength="60" required autocomplete="off"></div>
<div class="inv-field"><label for="pf-cat">Categoría</label><select id="pf-cat" required>${p ? '' : '<option value="">Selecciona…</option>'}${opt(store.CATEGORIAS, p?.categoria)}</select></div>
<div class="inv-field"><label for="pf-uni">Unidad de medida</label><select id="pf-uni" required>${opt(store.UNIDADES, p?.unidadMedida)}</select></div>
${p ? '' : '<div class="inv-field"><label for="pf-precio">Precio global (USD)</label><input id="pf-precio" type="number" min="0" step="0.01" inputmode="decimal" required placeholder="0.00"></div>'}
</div>
${p ? '<p class="inv-hint">El precio global se modifica desde la sección Precios.</p>' : `<fieldset class="inv-fieldset"><legend>Habilitar en sedes</legend>${store.getSedes().map(s => `<label class="inv-checkline"><input type="checkbox" name="sede" value="${s.id}"> ${esc(s.nombre)}</label>`).join('')}<p class="inv-hint">Cada sede lleva su propio stock. Puedes cambiarlo después.</p></fieldset>`}
<label class="inv-checkline"><input type="checkbox" id="pf-activo" ${!p || p.activo ? 'checked' : ''}> Producto activo</label>
<p class="inv-error" id="pf-err" role="alert" hidden></p>
<div class="inv-actions"><button type="button" class="inv-btn" data-cancel>Cancelar</button><button type="submit" class="inv-btn is-primary">${p ? 'Guardar cambios' : 'Registrar producto'}</button></div></form>`});
    root.querySelector('[data-cancel]').addEventListener('click', close);
    root.querySelector('form').addEventListener('submit', e => {
      e.preventDefault();
      const g = id => root.querySelector(id).value;
      const err = root.querySelector('#pf-err');
      const activo = root.querySelector('#pf-activo').checked;
      let r;
      if (p) {
        r = store.actualizarProducto(p.codigo, {nombre:g('#pf-nombre'), categoria:g('#pf-cat'), unidadMedida:g('#pf-uni')});
        if (r.ok) store.setActivo(p.codigo, activo);
      } else {
        r = store.crearProducto({codigo:g('#pf-codigo'), nombre:g('#pf-nombre'), categoria:g('#pf-cat'), unidadMedida:g('#pf-uni'), precioGlobal:g('#pf-precio'), activo});
        if (r.ok) root.querySelectorAll('[name="sede"]:checked').forEach(c => store.habilitarEnSede(c.value, r.codigo, true));
      }
      if (!r.ok) { showError(err, r.error); return; }
      close();
      toast(p ? `Cambios guardados en ${g('#pf-nombre')}` : `Producto ${r.codigo} registrado`);
    });
  }

  /* ---- Eventos ---- */
  $('#cat-q').addEventListener('input', e => { ui.q = e.target.value; draw(); });
  $('#cat-cat').addEventListener('change', e => { ui.cat = e.target.value; draw(); });
  $('#cat-est').addEventListener('change', e => { ui.estado = e.target.value; draw(); });
  root.addEventListener('click', async e => {
    const seg = e.target.closest('[data-vista]');
    if (seg) {
      ui.vista = seg.dataset.vista;
      container.querySelectorAll('[data-vista]').forEach(b => b.setAttribute('aria-pressed', b === seg));
      draw();
      return;
    }
    if (!isAdmin) return;
    if (e.target.closest('[data-nuevo]')) { formProducto(null); return; }
    const ed = e.target.closest('[data-editar]');
    if (ed) { formProducto(ed.dataset.editar); return; }
    const tg = e.target.closest('[data-toggle]');
    if (tg) {
      const p = store.getProducto(tg.dataset.toggle);
      store.setActivo(p.codigo, !p.activo);
      toast(`${p.nombre}: ${p.activo ? 'desactivado' : 'activado'}`);
    }
  });
  root.addEventListener('change', async e => {
    const cb = e.target.closest('.inv-check');
    if (!cb || !isAdmin) return;
    const {sede, codigo} = cb.dataset;
    const want = cb.checked;
    const ex = store.getExistencia(sede, codigo);
    if (!want && ex?.habilitado && ex.cantidad > 0) {
      const sure = await confirmDialog({title:'Quitar de la sede', danger:true, confirmText:'Quitar',
        message:`${store.getProducto(codigo).nombre} tiene ${ex.cantidad} unidades en ${store.getSede(sede).nombre}. Si lo quitas, dejará de mostrarse en su inventario (el stock se conserva por si lo habilitas de nuevo).`});
      if (!sure) { cb.checked = true; return; }
    }
    store.habilitarEnSede(sede, codigo, want);
    toast(`${store.getProducto(codigo).nombre} ${want ? 'habilitado en' : 'quitado de'} ${store.getSede(sede).nombre}`);
  });
  bind(container, store.subscribe, refresh);
  draw();
}
