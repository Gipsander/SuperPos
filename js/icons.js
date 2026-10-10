const paths = {
cart:'<path d="M3 3h2l3 12h11l3-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/>',
grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5"/>',
store:'<path d="m3 9 2-6h14l2 6M3 9h18v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V9ZM5 15v6h14v-6M10 21v-5h4v5"/>',
box:'<path d="m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9M8 5l9 5"/>',
inventory:'<path d="M4 8h16v13H4zM3 3h18v5H3zM9 12h6"/>',
price:'<path d="M3 3h9l10 10-9 9L3 12V3Z"/><circle cx="8" cy="8" r="1"/>',
chart:'<path d="M4 3v18h17M9 16v-5M14 16V7M19 16v-8"/>',
exit:'<path d="M9 21H4V3h5M10 12h11m-4-4 4 4-4 4"/>',
arrow:'<path d="M19 12H5m6-6-6 6 6 6"/>'
};
export function icon(name){return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;}
export const brand = '<span class="brand"><img src="./assets/logo.svg" alt="" width="40" height="40">Superpos</span>';
