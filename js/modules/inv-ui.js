// Utilidades de interfaz del módulo de Gipsander (catálogo, precios e inventario).
import {icon} from '../icons.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf = new Intl.NumberFormat('es', {style:'currency', currency:'USD'});
const nn = new Intl.NumberFormat('es');
export const money = n => nf.format(n);
export const num = n => nn.format(n);
export const fechaHora = iso => new Date(iso).toLocaleString('es', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'});
export const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const BADGES = {
  agotado:['alert', 'Agotado'],
  bajo:['alert', 'Stock bajo'],
  ok:['check', 'Disponible']
};
export const badge = estado => `<span class="inv-badge is-${estado}">${icon(BADGES[estado][0])}${BADGES[estado][1]}</span>`;

// Cancela la suscripción anterior de un contenedor y registra la nueva (se limpia sola si el contenedor sale del DOM).
export function bind(container, subscribe, fn){
  container.__invUnsub?.();
  const root = container.firstElementChild; // si la vista se reemplaza, la suscripción se cancela sola
  const off = subscribe(() => { if (!root?.isConnected) { off(); return; } fn(); });
  container.__invUnsub = off;
}

let toastHost;
export function toast(message, type = 'ok'){
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.className = 'inventory-module inv-toasts';
    toastHost.setAttribute('role', 'status');
    toastHost.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastHost);
  }
  const t = document.createElement('div');
  t.className = `inv-toast is-${type}`;
  t.innerHTML = `${icon(type === 'ok' ? 'check' : 'alert')}<span>${esc(message)}</span>`;
  toastHost.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
export function openModal({title, body, onClose}){
  const previous = document.activeElement;
  const host = document.createElement('div');
  host.className = 'inventory-module inv-overlay';
  host.innerHTML = `<div class="inv-modal" role="dialog" aria-modal="true" aria-labelledby="inv-modal-title"><header><h2 id="inv-modal-title">${esc(title)}</h2><button type="button" class="inv-icon-btn" data-close aria-label="Cerrar">${icon('close')}</button></header><div class="inv-modal-body">${body}</div></div>`;
  document.body.appendChild(host);
  const dialog = host.querySelector('.inv-modal');
  const close = () => { host.remove(); document.removeEventListener('keydown', onKey); previous?.focus?.(); onClose?.(); };
  function onKey(e){
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener('keydown', onKey);
  host.addEventListener('mousedown', e => { if (e.target === host) close(); });
  host.querySelector('[data-close]').addEventListener('click', close);
  (dialog.querySelector('input:not([readonly]),select,textarea') || dialog.querySelector('.inv-modal-body button') || dialog).focus();
  return {close, root:dialog.querySelector('.inv-modal-body')};
}

export function confirmDialog({title, message, confirmText = 'Confirmar', danger = false}){
  return new Promise(resolve => {
    let done = false;
    let result = false;
    const {close, root} = openModal({title, onClose:() => { if (!done) { done = true; resolve(result); } },
      body:`<p class="inv-modal-text">${esc(message)}</p><div class="inv-actions"><button type="button" class="inv-btn" data-no>Cancelar</button><button type="button" class="inv-btn ${danger ? 'is-danger' : 'is-primary'}" data-yes>${esc(confirmText)}</button></div>`});
    root.querySelector('[data-no]').addEventListener('click', close);
    root.querySelector('[data-yes]').addEventListener('click', () => { result = true; close(); });
  });
}

// Muestra un error de formulario junto al campo/bloque y lo anuncia a lectores de pantalla.
export function showError(box, message){
  box.textContent = message || '';
  box.hidden = !message;
}
