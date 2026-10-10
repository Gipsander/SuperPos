// Cuentas ficticias y públicas. Este acceso solo simula roles, no protege datos.
const users = [
{username:'rafael',name:'Rafael',role:'admin',label:'Administrador'},
{username:'gipsander',name:'Gipsander',role:'inventario',label:'Inventario',sedes:['s1','s2']},
{username:'luis',name:'Luis',role:'cajero',label:'Cajero'}
];
let currentUser = null;
export function login(username,password){
const user=users.find(user=>user.username===username.trim().toLowerCase());
currentUser=user && password==='admin' ? {...user} : null;
return getUser();
}
export function getUser(){return currentUser ? {...currentUser} : null;}
export function logout(){currentUser=null;}
