/**
 * charts.js — Todas las gráficas del dashboard
 * Usa Chart.js 4.x
 */

const Charts = (() => {
  const _charts = {};

  const RED = '#E43733', GRAY = '#9C9E9F', DARK = '#4B4B4B';
  const SILVER = '#C6C7C8', SALMON = '#F5AA9A';
  const GREEN = '#27AE60', AMBER = '#F39C12', BLUE = '#1a73e8';

  const LINE_COLORS = {
    'MAGISTRALES ORALES':   RED,
    'MAGISTRALES TOPICAS':  SALMON,
    'COSMETICOS':           AMBER,
    'ACTIVOS':              GREEN,
    'OTRAS VENTAS':         GRAY,
    'MAQUILA':              SILVER,
  };

  function lineColor(linea) {
    return LINE_COLORS[linea] || GRAY;
  }

  function productColor(prod) {
    if (!prod) return GRAY;
    const p = prod.toUpperCase();
    if (p.includes('MINOXIDIL')) return RED;
    if (p.includes('ABSORB'))   return AMBER;
    if (p.includes('SUNGLASS') || p.includes('FRESH SKIN')) return AMBER;
    if (p.includes('ACTIVOS'))  return GREEN;
    return SALMON;
  }

  const BASE = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed) } },
    },
    scales: {
      y: { ticks: { callback: v => fmt(v) }, grid: { color: '#f0f0f0' } },
      x: { grid: { display: false } },
    },
  };

  const DONUT = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'right', labels: { font: { size: 10 }, boxWidth: 12 } } },
    scales: {},
  };

  function mk(id, type, data, opts = {}) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    if (_charts[id]) { _charts[id].destroy(); delete _charts[id]; }
    const fresh = document.createElement('canvas');
    fresh.id = id;
    canvas.parentNode.replaceChild(fresh, canvas);
    _charts[id] = new Chart(fresh, { type, data, options: { responsive: true, maintainAspectRatio: false, ...opts } });
    return _charts[id];
  }

  function destroyAll() {
    Object.values(_charts).forEach(c => { try { c.destroy(); } catch (e) {} });
    Object.keys(_charts).forEach(k => delete _charts[k]);
  }

  // ── Yearly bar ──────────────────────────────────────────────────────────────
  function yearly(id, data) {
    if (!data || !data.length) return;
    mk(id, 'bar', {
      labels: data.map(d => d.yr),
      datasets: [{
        data: data.map(d => getVal(d)),
        backgroundColor: data.map(d => d.yr === 2026 ? GREEN : d.yr === 2025 ? AMBER : RED),
        borderRadius: 4,
      }],
    }, {
      ...BASE,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y) } } },
    });
  }

  // ── Monthly line comparison ─────────────────────────────────────────────────
  function monthlyComparison(id, monthly, yr1, yr2) {
    if (!monthly || !monthly.length) return;
    const MES_ORDER = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const get = (yr, mes) => { const r = monthly.find(d => d.yr === yr && d.mes === mes); return r ? getVal(r) : null; };
    const labels = MES_ORDER.filter(m => monthly.some(d => d.yr === yr2 && d.mes === m));
    mk(id, 'line', {
      labels: labels.map(m => m.slice(0, 3)),
      datasets: [
        { label: String(yr1), data: labels.map(m => get(yr1, m)), borderColor: SILVER, borderDash: [4, 4], tension: 0.3, borderWidth: 1.5, pointRadius: 3, fill: false },
        { label: String(yr2), data: labels.map(m => get(yr2, m)), borderColor: RED, tension: 0.3, borderWidth: 2.5, pointRadius: 4, fill: false },
      ],
    }, {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { font: { size: 10 }, boxWidth: 10 } }, tooltip: { callbacks: { label: ctx => ctx.parsed.y != null ? fmt(ctx.parsed.y) : '' } } },
      scales: { y: { ticks: { callback: v => fmt(v) }, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } },
    });
  }

  // ── Monthly trend (single series) ──────────────────────────────────────────
  function monthlyTrend(id, monthly) {
    if (!monthly || !monthly.length) return;
    const sorted = [...monthly].sort((a, b) => a.yr - b.yr || a.mn - b.mn);
    mk(id, 'line', {
      labels: sorted.map(d => d.mes.slice(0, 3) + ' ' + String(d.yr).slice(2)),
      datasets: [{ data: sorted.map(d => getVal(d)), borderColor: RED, tension: 0.3, borderWidth: 2, pointRadius: 3, fill: false }],
    }, BASE);
  }

  // ── Zone bar (horizontal) ────────────────────────────────────────────────────
  function zoneBar(id, zones) {
    if (!zones || !zones.length) return;
    const colorMap = { PERIFERIA: RED, CENTRO: DARK, MP: GREEN };
    mk(id, 'bar', {
      labels: zones.map(z => z.zona),
      datasets: [{ data: zones.map(z => getVal(z)), backgroundColor: zones.map(z => colorMap[z.zona] || GRAY), borderRadius: 4 }],
    }, { ...BASE, indexAxis: 'y', scales: { x: { ticks: { callback: v => fmt(v) }, grid: { color: '#f0f0f0' } }, y: { grid: { display: false } } } });
  }

  // ── Donut ───────────────────────────────────────────────────────────────────
  function donut(id, labels, values, colors) {
    mk(id, 'doughnut', {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }],
    }, DONUT);
  }

  // ── Line mix donut ───────────────────────────────────────────────────────────
  function lineMix(id, lines) {
    if (!lines || !lines.length) return;
    donut(id, lines.map(l => l.linea.replace('MAGISTRALES ', 'Mag. ')), lines.map(l => getVal(l)), lines.map(l => lineColor(l.linea)));
  }

  // ── Top products (horizontal bar) ───────────────────────────────────────────
  function topProducts(id, prods) {
    if (!prods || !prods.length) return;
    mk(id, 'bar', {
      labels: prods.map(p => p.familia),
      datasets: [{ data: prods.map(p => getVal(p)), backgroundColor: prods.map(p => productColor(p.familia)), borderRadius: 3 }],
    }, { ...BASE, indexAxis: 'y', scales: { x: { ticks: { callback: v => fmt(v) }, grid: { color: '#f0f0f0' } }, y: { grid: { display: false } } } });
  }

  // ── Top clients (horizontal bar) ─────────────────────────────────────────────
  function topClients(id, clients) {
    if (!clients || !clients.length) return;
    mk(id, 'bar', {
      labels: clients.map(c => c.cliente.length > 22 ? c.cliente.slice(0, 20) + '…' : c.cliente),
      datasets: [{ data: clients.map(c => getVal(c)), backgroundColor: RED, borderRadius: 3 }],
    }, { ...BASE, indexAxis: 'y', scales: { x: { ticks: { callback: v => fmt(v) }, grid: { color: '#f0f0f0' } }, y: { grid: { display: false } } } });
  }

  // ── Advisor monthly (line) ──────────────────────────────────────────────────
  function advisorMonthly(id, data25, data26) {
    const MES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const get25 = m => data25 && data25[m] ? (App.metric === 'cop' ? data25[m].v : data25[m].u) : null;
    const get26 = m => data26 && data26[m] ? (App.metric === 'cop' ? data26[m].v : data26[m].u) : null;
    mk(id, 'line', {
      labels: MES.map(m => m.slice(0, 3)),
      datasets: [
        { label: '2025', data: MES.map(get25), borderColor: SILVER, borderDash: [4, 4], tension: 0.3, borderWidth: 1.5, pointRadius: 3, fill: false },
        { label: '2026', data: MES.map(get26), borderColor: RED, tension: 0.3, borderWidth: 2.5, pointRadius: 4, fill: false },
      ],
    }, {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { font: { size: 10 }, boxWidth: 10 } }, tooltip: { callbacks: { label: ctx => ctx.parsed.y != null ? fmt(ctx.parsed.y) : '' } } },
      scales: { y: { ticks: { callback: v => fmt(v) }, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } },
    });
  }

  // ── Zone trend (grouped bar) ─────────────────────────────────────────────────
  function zoneTrend(id, zoneData) {
    if (!zoneData || !zoneData.length) return;
    const years  = [...new Set(zoneData.map(d => d.yr))].sort();
    const zones  = [...new Set(zoneData.map(d => d.zona))];
    const cmap   = { PERIFERIA: RED, CENTRO: DARK, MP: GREEN };
    mk(id, 'bar', {
      labels: years.map(String),
      datasets: zones.map(z => ({
        label: z,
        data: years.map(yr => { const r = zoneData.find(d => d.zona === z && d.yr === yr); return r ? getVal(r) : 0; }),
        backgroundColor: cmap[z] || GRAY,
        borderRadius: 2,
      })),
    }, {
      ...BASE,
      plugins: { legend: { display: true, labels: { font: { size: 10 }, boxWidth: 10 } }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y) } } },
    });
  }

  // ── Specialties bar ─────────────────────────────────────────────────────────
  function specialties(id, data) {
    if (!data || !data.length) return;
    mk(id, 'bar', {
      labels: data.map(s => s.esp.length > 20 ? s.esp.slice(0, 18) + '…' : s.esp),
      datasets: [{ data: data.map(s => getVal(s)), backgroundColor: [RED, SALMON, AMBER, GREEN, GRAY, SILVER], borderRadius: 3 }],
    }, { ...BASE, indexAxis: 'y', scales: { x: { ticks: { callback: v => fmt(v) }, grid: { color: '#f0f0f0' } }, y: { grid: { display: false } } } });
  }

  // ── Forecast line ────────────────────────────────────────────────────────────
  function forecast(id, monthly, forecastData) {
    const MES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
    const MES_FULL = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

    const real25 = MES_FULL.map(m => { const r = monthly.find(d => d.yr === 2025 && d.mes === m); return r ? getVal(r) : null; });
    const real26 = MES_FULL.map(m => { const r = monthly.find(d => d.yr === 2026 && d.mes === m); return r ? getVal(r) : null; });
    const fc_c   = MES_FULL.map(m => { const r = forecastData.find(d => d.mes === m); return r ? r.conservador : null; });
    const fc_e   = MES_FULL.map(m => { const r = forecastData.find(d => d.mes === m); return r ? r.esperado    : null; });
    const fc_a   = MES_FULL.map(m => { const r = forecastData.find(d => d.mes === m); return r ? r.acelerado   : null; });

    mk(id, 'line', {
      labels: MES,
      datasets: [
        { label: '2025',       data: real25, borderColor: SILVER, borderDash: [3,3], tension: 0.3, borderWidth: 1.5, pointRadius: 2, fill: false },
        { label: '2026 Real',  data: real26, borderColor: RED,    tension: 0.3, borderWidth: 2.5, pointRadius: 4, fill: false },
        { label: 'Conserv.',   data: fc_c,   borderColor: GRAY,   borderDash: [5,5], tension: 0.3, borderWidth: 1.5, pointRadius: 3, fill: false },
        { label: 'Esperado',   data: fc_e,   borderColor: DARK,   tension: 0.3, borderWidth: 2, pointRadius: 3, fill: false },
        { label: 'Acelerado',  data: fc_a,   borderColor: GREEN,  tension: 0.3, borderWidth: 2.5, pointRadius: 3, fill: false },
      ],
    }, {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { font: { size: 10 }, boxWidth: 12 } }, tooltip: { callbacks: { label: ctx => ctx.parsed.y != null ? fmt(ctx.parsed.y) : '' } } },
      scales: { y: { ticks: { callback: v => fmt(v) }, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } },
    });
  }

  // ── Colsubsidio bars ─────────────────────────────────────────────────────────
  function colsubSO(id, data) {
    if (!data || !data.length) return;
    mk(id, 'bar', {
      labels: data.map(d => d.DESCRIPCION.length > 20 ? d.DESCRIPCION.slice(0, 18) + '…' : d.DESCRIPCION),
      datasets: [{ data: data.map(d => d.unidades), backgroundColor: [RED, ...Array(14).fill(SALMON)], borderRadius: 3 }],
    }, {
      ...BASE,
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => (ctx.parsed.x || 0).toLocaleString() + ' u' } } },
      scales: { x: { ticks: { callback: v => v.toLocaleString() }, grid: { color: '#f0f0f0' } }, y: { grid: { display: false } } },
    });
  }

  function colsubInv(id, data) {
    if (!data || !data.length) return;
    mk(id, 'bar', {
      labels: data.map(d => d.DESCRIPCION.length > 18 ? d.DESCRIPCION.slice(0, 16) + '…' : d.DESCRIPCION),
      datasets: [{ data: data.map(d => d.inventario), backgroundColor: DARK, borderRadius: 3 }],
    }, {
      ...BASE,
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => (ctx.parsed.x || 0).toLocaleString() + ' u' } } },
      scales: { x: { ticks: { callback: v => v.toLocaleString() }, grid: { color: '#f0f0f0' } }, y: { grid: { display: false } } },
    });
  }

  // ── Gerentes comparison ─────────────────────────────────────────────────────
  function gerentes(id, advisors) {
    if (!advisors || !advisors.length) return;
    const gMap = {};
    advisors.forEach(a => {
      const g = a.gerente;
      if (!gMap[g]) gMap[g] = { v: 0, u: 0 };
      gMap[g].v += a.v || 0;
      gMap[g].u += a.u || 0;
    });
    const data = Object.entries(gMap)
      .filter(([g]) => g === 'ERIKA LOPEZ' || g === 'BEATRIZ SALAS')
      .map(([g, vals]) => ({ g, v: vals.v, u: vals.u }))
      .sort((a, b) => b.v - a.v);

    mk(id, 'bar', {
      labels: data.map(d => [d.g.split(' ')[0] + ' ' + d.g.split(' ')[1], d.g.includes('ERIKA') ? 'Periferia' : 'Centro+MP']),
      datasets: [{ data: data.map(d => getVal(d)), backgroundColor: data.map(d => d.g === 'ERIKA LOPEZ' ? RED : DARK), borderRadius: 4, barPercentage: 0.5 }],
    }, {
      ...BASE,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.parsed.y) } } },
    });
  }

  // ── Clients type donut ──────────────────────────────────────────────────────
  function clientType(id, clients) {
    if (!clients || !clients.length) return;
    const tipos = [
      { t: 'CORPORATIVO',             c: RED   },
      { t: 'LOGISTICO/INSTITUCIONES', c: DARK  },
      { t: 'PARTICULAR',              c: AMBER },
      { t: 'OTROS',                   c: GRAY  },
    ];
    donut(id,
      tipos.map(t => t.t.split('/')[0]),
      tipos.map(t => clients.filter(c => c.tipo === t.t).reduce((s, c) => s + getVal(c), 0)),
      tipos.map(t => t.c)
    );
  }

  // ── Client frequency bar ────────────────────────────────────────────────────
  function clientFreq(id, clients) {
    if (!clients || !clients.length) return;
    const top = clients.slice(0, 6);
    mk(id, 'bar', {
      labels: top.map(c => c.cliente.length > 16 ? c.cliente.slice(0, 14) + '…' : c.cliente),
      datasets: [{ data: top.map(c => c.pedidos || 0), backgroundColor: SALMON, borderRadius: 3 }],
    }, {
      ...BASE,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => (ctx.parsed.y || 0).toLocaleString() + ' pedidos' } } },
      scales: { y: { ticks: { callback: v => v.toLocaleString() }, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } },
    });
  }

  return {
    yearly, monthlyComparison, monthlyTrend,
    zoneBar, zoneTrend,
    donut, lineMix, topProducts, topClients,
    advisorMonthly, gerentes,
    specialties, forecast,
    colsubSO, colsubInv,
    clientType, clientFreq,
    destroyAll,
  };
})();

// ── Sell-In vs Sell-Out monthly (stacked/grouped bar) ─────────────────────────
Charts.sellInOutMonthly = function(id, clientsMonthly) {
  if(!clientsMonthly||!clientsMonthly.length) return;
  const MES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const yr=App.filters.year?parseInt(App.filters.year):2026;
  // Sum all clients per month
  const byMonth={};
  clientsMonthly.filter(r=>r.yr===yr).forEach(r=>{
    if(!byMonth[r.mes]) byMonth[r.mes]={v:0,u:0};
    byMonth[r.mes].v+=r.v; byMonth[r.mes].u+=r.u;
  });
  const avail=MES.filter(m=>byMonth[m]);
  mk(id,'bar',{
    labels:avail.map(m=>m.slice(0,3)),
    datasets:[{
      label:'Sell-In COP',
      data:avail.map(m=>App.metric==='cop'?byMonth[m].v:byMonth[m].u),
      backgroundColor:'#1a73e8',borderRadius:3
    }]
  },{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,labels:{font:{size:10},boxWidth:10}},tooltip:{callbacks:{label:ctx=>fmt(ctx.parsed.y)}}},
    scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}}});
};

// ── Colsubsidio monthly sell-out ───────────────────────────────────────────────
Charts.colsubMonthly = function(id, monthly_so) {
  if(!monthly_so||!monthly_so.length) return;
  const sorted=[...monthly_so].sort((a,b)=>a.yr-b.yr||a.mn-b.mn);
  mk(id,'line',{
    labels:sorted.map(d=>d.mes.slice(0,3)+' '+String(d.yr).slice(2)),
    datasets:[{label:'Sell-Out (u)',data:sorted.map(d=>d.so),borderColor:'#E43733',backgroundColor:'#E4373322',tension:0.3,borderWidth:2,pointRadius:3,fill:true}]
  },{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,labels:{font:{size:10},boxWidth:10}},tooltip:{callbacks:{label:ctx=>ctx.parsed.y.toLocaleString()+' u'}}},
    scales:{y:{ticks:{callback:v=>v.toLocaleString()},grid:{color:'#f0f0f0'}},x:{grid:{display:false},ticks:{maxTicksLimit:12}}}});
};

// ── Molecule yearly (multi-line) ───────────────────────────────────────────────
Charts.moleculeYearly = function(id, yearly, topMols) {
  if(!yearly||!yearly.length||!topMols||!topMols.length) return;
  const years=[...new Set(yearly.map(d=>d.yr))].sort();
  const COLS=['#E43733','#1a73e8','#27AE60','#F39C12','#9C9E9F','#F5AA9A'];
  mk(id,'line',{
    labels:years.map(String),
    datasets:topMols.map((mol,i)=>({
      label:mol.length>16?mol.slice(0,14)+'…':mol,
      data:years.map(yr=>{const r=yearly.find(d=>d.familia===mol&&d.yr===yr);return r?(App.metric==='cop'?r.v:r.u):0;}),
      borderColor:COLS[i%COLS.length],tension:0.3,borderWidth:2,pointRadius:3,fill:false
    }))
  },{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,position:'right',labels:{font:{size:9},boxWidth:10}}},
    scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}}});
};

// ── Molecule monthly (multi-line) ─────────────────────────────────────────────
Charts.moleculeMonthly = function(id, monthly, topMols) {
  if(!monthly||!monthly.length||!topMols||!topMols.length) return;
  const yr=App.filters.year?parseInt(App.filters.year):2026;
  const data=monthly.filter(d=>d.yr===yr);
  const MES=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const avail=MES.filter(m=>data.some(d=>d.mes===m));
  const COLS=['#E43733','#1a73e8','#27AE60','#F39C12','#9C9E9F'];
  mk(id,'line',{
    labels:avail.map(m=>m.slice(0,3)),
    datasets:topMols.map((mol,i)=>({
      label:mol.length>14?mol.slice(0,12)+'…':mol,
      data:avail.map(m=>{const r=data.find(d=>d.familia===mol&&d.mes===m);return r?(App.metric==='cop'?r.v:r.u):0;}),
      borderColor:COLS[i%COLS.length],tension:0.3,borderWidth:2,pointRadius:3,fill:false
    }))
  },{responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:true,position:'right',labels:{font:{size:9},boxWidth:10}}},
    scales:{y:{ticks:{callback:v=>fmt(v)},grid:{color:'#f0f0f0'}},x:{grid:{display:false}}}});
};
