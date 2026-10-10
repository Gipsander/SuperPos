import {login,getUser,logout} from './auth.js';
import {brand,icon} from './icons.js';
import {adminModules,renderAdminHome,renderAdminPlaceholder} from './modules/admin.js';
import {renderInventario} from './modules/inventario.js';
import {renderVentas} from './modules/ventas.js';
import {renderCatalogo} from './modules/catalogo.js';
import {renderPrecios} from './modules/precios.js';
const app=document.querySelector('#app');

function renderLogin(){
document.title='SuperPOS · Iniciar sesión';
app.innerHTML=`<main class="login-screen"><div class="store-mark" aria-hidden="true"><img src="./assets/logo.svg" alt=""><strong>Superpos</strong><span>Tu supermercado</span></div><div class="login-wrap">${brand}<section class="login-card" aria-labelledby="login-title"><h1 id="login-title">¡Hola de nuevo!</h1><p class="login-intro">Inicia sesión para entrar a Superpos.</p><form id="login-form"><div class="field"><label for="username">Usuario</label><input id="username" name="username" placeholder="Ingresa tu usuario" autocomplete="username" autocapitalize="none" spellcheck="false" required></div><div class="field"><label for="password">Contraseña</label><input id="password" name="password" type="password" placeholder="Ingresa tu contraseña" autocomplete="current-password" required></div><p id="login-error" class="login-error" role="alert"></p><button class="primary-button" type="submit">Iniciar sesión</button></form></section><p class="login-footer">Tu supermercado de todos los días.</p><span class="login-note">Prototipo · Acceso de demostración</span></div></main>`;
const form=document.querySelector('#login-form');
form.addEventListener('submit',event=>{
event.preventDefault();
const user=login(form.elements.username.value,form.elements.password.value);
if(user){renderWorkspace();return;}
document.querySelector('#login-error').textContent='Usuario o contraseña incorrectos. Inténtalo de nuevo.';
for(const input of form.querySelectorAll('input')){input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby','login-error');}
form.elements.password.focus();
});
form.addEventListener('input',()=>{
document.querySelector('#login-error').textContent='';
for(const input of form.querySelectorAll('input')){input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');}
});
}
function profile(user){return `<div class="profile"><span class="avatar" aria-hidden="true">${user.name.slice(0,1)}</span><div><p class="profile-name">${user.name}</p><p class="profile-role">${user.label}</p></div><button class="logout-button" id="logout" aria-label="Cerrar sesión" title="Cerrar sesión">${icon('exit')}<span>Salir</span></button></div>`;}

function renderWorkspace(){
const user=getUser();
if(!user){renderLogin();return;}
if(user.role==='admin'){
app.innerHTML=`<div class="app-shell"><aside class="sidebar">${brand}<nav aria-label="Navegación del administrador"><button class="nav-button" data-page="inicio">${icon('grid')}Inicio</button><p class="nav-heading">Administración</p>${adminModules.map(module=>`<button class="nav-button" data-page="${module.id}">${icon(module.icon)}${module.title}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="demo-label">Modo demostración</span><p>Un espacio para cada operación.</p></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb"><span>Superpos</span><span aria-hidden="true">/</span><strong id="current-page">Inicio</strong></div>${profile(user)}</header><main id="content" class="content" tabindex="-1"></main></div></div>`;
showAdminPage('inicio',false);
app.addEventListener('click',handleNavigation);
}else{
app.removeEventListener('click',handleNavigation);
app.innerHTML=`<div class="role-shell"><header class="topbar">${brand}${profile(user)}</header><main class="role-content" id="content" tabindex="-1"><p class="eyebrow">Tu espacio de trabajo</p><div id="role-module"></div></main></div>`;
const container=document.querySelector('#role-module');
if(user.role==='inventario'){renderInventario(container,user);}else{renderVentas(container,user);}
document.title=`SuperPOS · ${user.label}`;
}
document.querySelector('#logout').addEventListener('click',()=>{
logout();app.removeEventListener('click',handleNavigation);renderLogin();document.querySelector('#username').focus();
});
document.querySelector('#content').focus({preventScroll:true});
}
function handleNavigation(event){
const button=event.target.closest('[data-page]');
if(button){showAdminPage(button.dataset.page);}
}
function showAdminPage(id,focus=true){
if(getUser()?.role!=='admin'){return;}
const container=document.querySelector('#content');
const module=adminModules.find(module=>module.id===id);
if(id!=='inicio'&&!module){return;}
// Módulos de Gipsander (catálogo, inventario y precios) reutilizados por el administrador.
const gipsander={productos:renderCatalogo,inventario:renderInventario,precios:renderPrecios};
if(id==='inicio'){renderAdminHome(container);}else if(gipsander[id]){gipsander[id](container,getUser());}else{renderAdminPlaceholder(container,module);}
document.querySelector('#current-page').textContent=module?.title || 'Inicio';
document.title=`SuperPOS · ${module?.title || 'Administración'}`;
document.querySelectorAll('.nav-button').forEach(button=>{
if(button.dataset.page===id){button.setAttribute('aria-current','page');}else{button.removeAttribute('aria-current');}
});
if(focus){container.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
// Solo memoria: recargar vuelve al login, sin almacenamiento ni base de datos.
renderLogin();
