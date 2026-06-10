/**
 * app.js — Estado global, API calls, filtros
 */
const App = {
  metric: 'cop',
  currentPage: 0,
  filters: { year:'2026', mes:'', zona:'', gerente:'', asesor:'', linea:'' },
  cache: {},
};

// ── Formato ───────────────────────────────────────────────────────────────────
function fmt(v) {
  if (v == null) return '—';
  const n = parseFloat(v); if (isNaN(n)) return '—';
  if (App.metric === 'units') {
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M u';
    if (n >= 1e3) return Math.round(n/1e3)+'K u';
    return Math.round(n)+' u';
  }
  if (n >= 1e9) return '$'+(n/1e9).toFixed(1)+'B';
  if (n >= 1e6) return '$'+Math.round(n/1e6)+'M';
  if (n >= 1e3) return '$'+Math.round(n/1e3)+'K';
  return '$'+Math.round(n);
}
function fmtPct(v) { if(v==null)return'—'; return (v>0?'+':'')+parseFloat(v).toFixed(1)+'%'; }
function getVal(row) { return App.metric==='cop'?(row.v||0):(row.u||0); }

function loadingStart() { const b=document.getElementById('loading-bar'); if(b)b.className='loading-bar active'; }
function loadingDone()  { const b=document.getElementById('loading-bar'); if(b){b.className='loading-bar done'; setTimeout(()=>b.className='loading-bar',600);} }

// ── API ───────────────────────────────────────────────────────────────────────
function buildQS(extra={}) {
  const p = {...App.filters, ...extra};
  const qs = Object.entries(p).filter(([,v])=>v).map(([k,v])=>`${k}=${encodeURIComponent(v)}`).join('&');
  return qs ? '?'+qs : '';
}
async function apiFetch(endpoint, extra={}, useFilters=true) {
  const qs = useFilters ? buildQS(extra) : (Object.keys(extra).length?'?'+new URLSearchParams(extra):'');
  const url = `/api/${endpoint}${qs}`;
  if (App.cache[url]) return App.cache[url];
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    App.cache[url] = data;
    return data;
  } catch(e) { console.error(`[${url}]`, e); return null; }
}
function clearCache() { App.cache = {}; }

// ── Filters ───────────────────────────────────────────────────────────────────
function applyFilters() {
  ['year','mes','zona','gerente','asesor','linea'].forEach(k => {
    const el = document.getElementById('f-'+k);
    if (el) App.filters[k] = el.value;
  });
  const count = Object.values(App.filters).filter(x=>x).length;
  const badge = document.getElementById('filter-badge');
  badge.textContent = count+' filtro'+(count!==1?'s':'');
  badge.className = 'filter-badge'+(count>0?' show':'');
  clearCache(); Charts.destroyAll(); Pages.rebuild(App.currentPage);
}

function resetFilters() {
  ['year','mes','zona','gerente','asesor','linea'].forEach(k => {
    const el = document.getElementById('f-'+k);
    if(el) el.value = k==='year'?'2026':'';
  });
  App.filters = {year:'2026',mes:'',zona:'',gerente:'',asesor:'',linea:''};
  document.getElementById('filter-badge').className='filter-badge';
  clearCache(); Charts.destroyAll(); Pages.rebuild(App.currentPage);
}

function setMetric(m) {
  App.metric = m;
  document.getElementById('btn-cop').classList.toggle('active',m==='cop');
  document.getElementById('btn-units').classList.toggle('active',m==='units');
  clearCache(); Charts.destroyAll(); Pages.rebuild(App.currentPage);
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showPage(n) {
  App.currentPage = n;
  document.querySelectorAll('.page').forEach((p,i)=>p.classList.toggle('active',i===n));
  document.querySelectorAll('.tab').forEach((t,i)=>t.classList.toggle('active',i===n));
  Pages.rebuild(n);
}

// ── Load filter options ───────────────────────────────────────────────────────
async function loadFilterOptions() {
  const opts = await apiFetch('filters',{},false);
  if (!opts) return;

  const yrSel = document.getElementById('f-year');
  yrSel.innerHTML = '<option value="">Todos los años</option>';
  opts.years.forEach(y => {
    const o = document.createElement('option');
    o.value=y; o.textContent=y; if(y===2026)o.selected=true;
    yrSel.appendChild(o);
  });

  const mesSel = document.getElementById('f-mes');
  mesSel.innerHTML = '<option value="">Todos los meses</option>';
  (opts.meses||[]).forEach(m => {
    const o = document.createElement('option');
    o.value=m; o.textContent=m.charAt(0)+m.slice(1).toLowerCase();
    mesSel.appendChild(o);
  });

  const asvSel = document.getElementById('f-asesor');
  asvSel.innerHTML = '<option value="">Todos los asesores</option>';
  (opts.asesores||[]).forEach(a => {
    const o = document.createElement('option');
    o.value=a; o.textContent=a.split(' ').slice(0,3).join(' ');
    asvSel.appendChild(o);
  });

  const linSel = document.getElementById('f-linea');
  linSel.innerHTML = '<option value="">Todas las líneas</option>';
  (opts.lineas||[]).forEach(l => {
    const o = document.createElement('option');
    o.value=l; o.textContent=l.replace('MAGISTRALES ','Mag. ');
    linSel.appendChild(o);
  });

  // Mirror asesores to advisor-select in page 1
  const advSel = document.getElementById('adv-select');
  if(advSel){
    advSel.innerHTML='<option value="">Selecciona asesor…</option>';
    (opts.asesores||[]).forEach(a=>{
      const o=document.createElement('option');
      o.value=a; o.textContent=a.split(' ').slice(0,3).join(' ');
      advSel.appendChild(o);
    });
  }
}

async function checkStatus() {
  const s = await apiFetch('status',{},false);
  const el = document.getElementById('status-info');
  if(s&&s.ok) el.textContent=`${(s.rows||0).toLocaleString()} registros · ${(s.years||[]).join(', ')}`;
  else if(s&&!s.ok){
    const e=document.getElementById('app-error');
    e.style.display='block';
    e.innerHTML=`<div class="alert alert-r" style="margin:20px"><div class="alert-title" style="color:var(--red)">⚠️ Archivos Excel no encontrados</div><div style="font-size:12px">${s.error||''}</div></div>`;
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await checkStatus();
  await loadFilterOptions();
  Pages.rebuild(0);
});
