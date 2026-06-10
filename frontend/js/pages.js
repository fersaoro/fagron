/**
 * pages.js — Renderizado de cada página del dashboard
 */
const Pages = (() => {
  const _built = {};

  function rebuild(n) { delete _built[n]; build(n); }

  async function build(n) {
    if (_built[n]) return;
    _built[n] = true;
    loadingStart();
    try {
      if(n===0) await buildP0();
      if(n===1) await buildP1();
      if(n===2) await buildP2();
      if(n===3) await buildP3();
      if(n===4) await buildP4();
      if(n===5) await buildP5();
      if(n===6) await buildP6();
      if(n===7) await buildP7();
      if(n===8) await buildP8();
      if(n===9) await buildP9();
      if(n===10) await buildP10();
    } catch(e) { console.error('Page error:', e); }
    loadingDone();
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  function badge(pct) {
    const v=parseFloat(pct), cls=v>=0?'up':'down', ico=v>=0?'▲':'▼';
    return `<span class="badge ${cls}">${ico} ${fmtPct(pct)}</span>`;
  }
  function pillZona(z) {
    const c=z==='PERIFERIA'?'pill-p':z==='CENTRO'?'pill-c':z==='MP'?'pill-m':'pill-s';
    return `<span class="pill ${c}">${z}</span>`;
  }
  function rankBar(pct) {
    return `<td class="bar-cell"><div class="bar-bg"><div class="bar-fill" style="width:${Math.max(pct,1)}%"></div></div></td>`;
  }
  function spin() { return '<div class="spinner-wrap"><div class="spinner"></div>Cargando…</div>'; }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 0 — RESUMEN EJECUTIVO
  // ══════════════════════════════════════════════════════════════════
  async function buildP0() {
    const [summary, yearly, monthly, zones, products, clients] = await Promise.all([
      apiFetch('summary'), apiFetch('yearly',{},false), apiFetch('monthly'),
      apiFetch('zones'), apiFetch('products'), apiFetch('clients')
    ]);
    if(!summary){document.getElementById('kpis-0').innerHTML=spin();return;}

    const yr=summary.year||2026;
    const val=App.metric==='cop'?summary.total_cop:summary.total_units;
    document.getElementById('kpis-0').innerHTML=`
      <div class="kpi"><div class="kpi-lbl">Ventas ${yr}${App.filters.mes?' · '+App.filters.mes.slice(0,3):''}</div>
        <div class="kpi-val red">${fmt(val)}</div>${badge(summary.growth_pct)}</div>
      <div class="kpi green"><div class="kpi-lbl">Top Asesor</div>
        <div class="kpi-val green" style="font-size:14px">${(summary.top_asesor||'—').split(' ').slice(0,2).join(' ')}</div>
        <div class="kpi-note">${fmt(summary.top_asesor_v)}</div></div>
      <div class="kpi gray"><div class="kpi-lbl">${yr-1} (periodo equiv.)</div>
        <div class="kpi-val">${fmt(summary.prev_cop)}</div><div class="kpi-note">Base comparación</div></div>
      <div class="kpi amber"><div class="kpi-lbl">Top Producto</div>
        <div class="kpi-val amber" style="font-size:13px">${(summary.top_product||'—').slice(0,15)}</div>
        <div class="kpi-note">${fmt(summary.top_product_v)}</div></div>`;

    if(yearly) Charts.yearly('c-yearly',yearly);
    if(monthly) {
      Charts.monthlyComparison('c-yoy',monthly,yr-1,yr);
      if(products) Charts.lineMix('c-line-pie',products.lines||[]);
    }
    if(zones){
      const lz=zones.filter(z=>z.yr===yr);
      Charts.zoneBar('c-zone-bar',lz);
    }
    if(products&&products.products) Charts.topProducts('c-top-prods',products.products.slice(0,10));
    if(clients&&clients.length) Charts.topClients('c-top-clients',clients.slice(0,10));
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 1 — ASESORES
  // ══════════════════════════════════════════════════════════════════
  async function buildP1() {
    const [advisors, monthly] = await Promise.all([apiFetch('advisors'), apiFetch('monthly')]);
    if(!advisors) return;

    // Deduplicate by nombre (take highest v row)
    const seen=new Map();
    advisors.forEach(a=>{ if(!seen.has(a.nombre)||a.v>seen.get(a.nombre).v) seen.set(a.nombre,a); });
    const uniq=[...seen.values()].sort((a,b)=>b.v-a.v);

    const total=uniq.reduce((s,a)=>s+(App.metric==='cop'?a.v:a.u),0);
    const best=uniq.length?uniq.reduce((b,a)=>a.growth_yoy>b.growth_yoy?a:b):{nombre:'—',growth_yoy:0};
    const worst=uniq.length?uniq.reduce((b,a)=>a.growth_yoy<b.growth_yoy?a:b):{nombre:'—',growth_yoy:0};

    document.getElementById('kpis-1').innerHTML=`
      <div class="kpi"><div class="kpi-lbl">Asesores</div><div class="kpi-val red">${uniq.length}</div><div class="kpi-note">En filtro actual</div></div>
      <div class="kpi green"><div class="kpi-lbl">Total ${App.metric==='cop'?'COP':'Unidades'}</div><div class="kpi-val green">${fmt(total)}</div><div class="kpi-note">${App.filters.year||'2023–2026'} ${App.filters.mes?'· '+App.filters.mes.slice(0,3):''}</div></div>
      <div class="kpi amber"><div class="kpi-lbl">Mayor crecimiento</div><div class="kpi-val amber" style="font-size:13px">${best.nombre.split(' ').slice(0,2).join(' ')}</div><div class="kpi-note">${fmtPct(best.growth_yoy)} YoY</div></div>
      <div class="kpi"><div class="kpi-lbl">Mayor caída</div><div class="kpi-val red" style="font-size:13px">${worst.nombre.split(' ').slice(0,2).join(' ')}</div><div class="kpi-note">${fmtPct(worst.growth_yoy)} YoY</div></div>`;

    const tbody=document.getElementById('adv-tbody');
    document.getElementById('adv-th-v').textContent=App.metric==='cop'?'Ventas COP':'Unidades';
    tbody.innerHTML='';
    const maxV=uniq[0]?(App.metric==='cop'?uniq[0].v:uniq[0].u):1;
    uniq.forEach((a,i)=>{
      const val=App.metric==='cop'?a.v:a.u;
      const pct=total>0?(val/total*100).toFixed(1):'0.0';
      const bw=Math.round(val/maxV*100);
      const gc=a.growth_yoy>=10?'green':a.growth_yoy>=-5?'neutral':'down';
      tbody.innerHTML+=`<tr>
        <td class="rank-n">${i+1}</td>
        <td style="font-weight:600;font-size:11px">${a.nombre.split(' ').slice(0,3).join(' ')}</td>
        <td>${pillZona(a.zona)}</td>
        <td style="font-size:10px;color:var(--gray)">${a.gerente.split(' ').slice(0,2).join(' ')}</td>
        <td style="font-weight:700">${fmt(val)}</td>
        <td><span class="badge ${gc}">${a.growth_yoy>=0?'▲':'▼'} ${fmtPct(a.growth_yoy)}</span></td>
        <td>${(a.clientes||0).toLocaleString()}</td>
        <td style="font-size:10px">${(a.top_products||['—'])[0]}</td>
        ${rankBar(bw)}</tr>`;
    });

    if(monthly) Charts.monthlyComparison('c-adv-monthly-all',monthly,(App.filters.year?parseInt(App.filters.year):2026)-1,App.filters.year?parseInt(App.filters.year):2026);
    Charts.gerentes('c-gerentes',uniq);
    if(uniq[0]) await updateAdvisorChart(uniq[0].nombre);
    buildAdvisorCards(uniq);
  }

  async function updateAdvisorChart(asesor) {
    if(!asesor) return;
    const data=await apiFetch('advisor-monthly',{asesor},false);
    if(data) Charts.advisorMonthly('c-adv-monthly',data['2025'],data['2026']);
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 2 — ZONAS
  // ══════════════════════════════════════════════════════════════════
  async function buildP2() {
    const zones=await apiFetch('zones');
    if(!zones||!zones.length) return;
    const yr=App.filters.year?parseInt(App.filters.year):2026;
    const lz=zones.filter(z=>z.yr===yr);
    const total=lz.reduce((s,z)=>s+getVal(z),0);
    const peri=lz.find(z=>z.zona==='PERIFERIA')||{v:0,u:0};
    const cent=lz.find(z=>z.zona==='CENTRO')||{v:0,u:0};
    const mp=lz.find(z=>z.zona==='MP')||{v:0,u:0};
    document.getElementById('kpis-2').innerHTML=`
      <div class="kpi"><div class="kpi-lbl">Total ${yr}</div><div class="kpi-val red">${fmt(total)}</div><div class="kpi-note">Filtro actual</div></div>
      <div class="kpi gray"><div class="kpi-lbl">Periferia</div><div class="kpi-val">${fmt(getVal(peri))}</div><div class="kpi-note">${total>0?(getVal(peri)/total*100).toFixed(0):0}%</div></div>
      <div class="kpi green"><div class="kpi-lbl">Centro</div><div class="kpi-val green">${fmt(getVal(cent))}</div><div class="kpi-note">${total>0?(getVal(cent)/total*100).toFixed(0):0}%</div></div>
      <div class="kpi amber"><div class="kpi-lbl">MP</div><div class="kpi-val amber">${fmt(getVal(mp))}</div><div class="kpi-note">Canal B2B</div></div>`;
    Charts.zoneTrend('c-zone-trend',zones);
    Charts.zoneBar('c-zone-bar-p2',lz);
    const pT=lz.reduce((s,z)=>s+getVal(z),0);
    const cm={PERIFERIA:'#E43733',CENTRO:'#4B4B4B',MP:'#27AE60'};
    Charts.donut('c-zone-pie',lz.map(z=>z.zona+' ('+(pT>0?Math.round(getVal(z)/pT*100):0)+'%)'),lz.map(z=>getVal(z)),lz.map(z=>cm[z.zona]||'#9C9E9F'));
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 3 — CLIENTES (Sell-In + Sell-Out)
  // ══════════════════════════════════════════════════════════════════
  async function buildP3() {
    const [clients, clientsMonthly] = await Promise.all([
      apiFetch('clients'), apiFetch('clients-monthly')
    ]);
    if(!clients||!clients.length) return;

    const total=clients.reduce((s,c)=>s+getVal(c),0);
    const maxV=clients[0]?getVal(clients[0]):1;
    document.getElementById('kpis-3').innerHTML=`
      <div class="kpi"><div class="kpi-lbl">Top Cliente (Sell-In)</div><div class="kpi-val" style="font-size:12px">${(clients[0]?.cliente||'—').slice(0,20)}</div><div class="kpi-note">${fmt(getVal(clients[0]||{}))}</div></div>
      <div class="kpi green"><div class="kpi-lbl">Total Sell-In</div><div class="kpi-val green">${fmt(total)}</div><div class="kpi-note">Top ${clients.length} clientes · Lo que Fagron vende</div></div>
      <div class="kpi amber"><div class="kpi-lbl">Concentración Top 3</div><div class="kpi-val amber">${total>0?(clients.slice(0,3).reduce((s,c)=>s+getVal(c),0)/total*100).toFixed(0):0}%</div><div class="kpi-note">Riesgo de dependencia</div></div>
      <div class="kpi blue"><div class="kpi-lbl">Sell-Out disponible</div><div class="kpi-val" style="font-size:13px">COLSUBSIDIO</div><div class="kpi-note">Único cliente con datos completos</div></div>`;

    // Sell-In table
    document.getElementById('client-th').textContent=App.metric==='cop'?'Sell-In COP':'Unidades';
    const tbody=document.getElementById('client-tbody');
    tbody.innerHTML='';
    clients.forEach((c,i)=>{
      const val=getVal(c); const pct=total>0?(val/total*100).toFixed(1):'0.0'; const bw=Math.round(val/maxV*100);
      const tc=c.tipo==='CORPORATIVO'?'pill-c':c.tipo==='PARTICULAR'?'pill-o':'pill-p';
      tbody.innerHTML+=`<tr>
        <td class="rank-n">${i+1}</td>
        <td style="font-size:10px;font-weight:600">${c.cliente}</td>
        <td><span class="pill ${tc}" style="font-size:8px">${(c.tipo||'').split('/')[0]}</span></td>
        <td style="font-weight:700;color:var(--blue)">${fmt(val)}</td>
        <td>${(c.pedidos||0).toLocaleString()}</td>
        <td style="color:var(--gray)">${pct}%</td>
        ${rankBar(bw)}</tr>`;
    });

    Charts.clientType('c-client-type',clients);
    Charts.clientFreq('c-client-freq',clients);

    // Sell-In vs Sell-Out monthly chart
    if(clientsMonthly&&clientsMonthly.length) {
      Charts.sellInOutMonthly('c-sellin-sellout', clientsMonthly);
    }

    // Sell-Out note
    document.getElementById('sellout-note').innerHTML=`
      <div class="insight amber-i">
        <strong>Sell-Out:</strong> Solo Colsubsidio reporta datos de venta al consumidor final. 
        Para ver el análisis completo de sell-out de Colsubsidio, ve a la pestaña 
        <strong>⑦ Colsubsidio</strong> donde puedes filtrar por tienda (PUNTO DE VENTA).
        <br><strong>Los demás clientes solo tienen datos de Sell-In</strong> (lo que le compran a Fagron).
      </div>`;
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 4 — PRODUCTOS
  // ══════════════════════════════════════════════════════════════════
  async function buildP4() {
    const data=await apiFetch('products');
    if(!data) return;
    const {products,lines}=data;
    const total=(products||[]).reduce((s,p)=>s+getVal(p),0);
    const minoxV=(products||[]).filter(p=>p.familia.includes('MINOXIDIL')).reduce((s,p)=>s+getVal(p),0);
    const cosmV=(products||[]).filter(p=>p.linea==='COSMETICOS').reduce((s,p)=>s+getVal(p),0);
    const top=products&&products[0];
    document.getElementById('kpis-4').innerHTML=`
      <div class="kpi"><div class="kpi-lbl">Familia Líder</div><div class="kpi-val" style="font-size:13px">${top?top.familia.slice(0,15):'—'}</div><div class="kpi-note">${fmt(top?getVal(top):0)}</div></div>
      <div class="kpi green"><div class="kpi-lbl">Total</div><div class="kpi-val green">${fmt(total)}</div><div class="kpi-note">Todos los productos</div></div>
      <div class="kpi amber"><div class="kpi-lbl">Cosméticos</div><div class="kpi-val amber">${fmt(cosmV)}</div><div class="kpi-note">Mayor potencial</div></div>
      <div class="kpi gray"><div class="kpi-lbl">Minoxidil</div><div class="kpi-val">${fmt(minoxV)}</div><div class="kpi-note">Oral + Tópico</div></div>`;
    document.getElementById('prod-detail-sub').textContent=App.filters.linea?'Filtrado: '+App.filters.linea:'Periodo seleccionado';
    Charts.topProducts('c-family',products?products.slice(0,15):[]);
    if(lines&&lines.length){
      Charts.lineMix('c-line-donut',lines);
      const tbody=document.getElementById('line-tbody');
      document.getElementById('lt-v').textContent=App.metric==='cop'?'Ventas COP':'Unidades';
      const lt=lines.reduce((s,l)=>s+getVal(l),0);
      tbody.innerHTML='';
      lines.forEach(l=>{const val=getVal(l);tbody.innerHTML+=`<tr><td>${l.linea.replace('MAGISTRALES ','Mag.')}</td><td style="font-weight:700">${fmt(val)}</td><td style="color:var(--gray)">${lt>0?(val/lt*100).toFixed(1):0}%</td></tr>`;});
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 5 — ESPECIALIDADES
  // ══════════════════════════════════════════════════════════════════
  async function buildP5() {
    const data=await apiFetch('specialties');
    if(!data) return;
    const {specialties,doctors}=data;
    const topS=specialties&&specialties[0];
    document.getElementById('kpis-5').innerHTML=`
      <div class="kpi"><div class="kpi-lbl">Especialidad #1</div><div class="kpi-val" style="font-size:12px">${topS?topS.esp.slice(0,16):'—'}</div><div class="kpi-note">${fmt(topS?getVal(topS):0)}</div></div>
      <div class="kpi green"><div class="kpi-lbl">Médico Top</div><div class="kpi-val green" style="font-size:11px">${doctors&&doctors[0]?doctors[0].medico.slice(0,20):'—'}</div><div class="kpi-note">${fmt(doctors&&doctors[0]?getVal(doctors[0]):0)}</div></div>
      <div class="kpi amber"><div class="kpi-lbl">Especialidades</div><div class="kpi-val amber">${specialties?specialties.length:0}</div><div class="kpi-note">Con ventas en filtro</div></div>
      <div class="kpi gray"><div class="kpi-lbl">Top 20 médicos</div><div class="kpi-val">${fmt(doctors?doctors.slice(0,20).reduce((s,d)=>s+getVal(d),0):0)}</div><div class="kpi-note">Ventas asociadas</div></div>`;
    Charts.specialties('c-specs',specialties?specialties.slice(0,10):[]);
    Charts.topClients('c-docs',(doctors||[]).slice(0,10).map(d=>({...d,cliente:d.medico})));
    const tbody=document.getElementById('doc-tbody');
    document.getElementById('doc-th').textContent=App.metric==='cop'?'Ventas COP':'Unidades';
    tbody.innerHTML='';
    (doctors||[]).forEach((d,i)=>{
      const p=i<5?'<span class="badge down" style="font-size:9px">🔴 Alta</span>':i<10?'<span class="badge" style="background:#fffbf0;color:#b47e00;font-size:9px">🟡 Media</span>':'<span class="badge neutral" style="font-size:9px">🟢 Normal</span>';
      tbody.innerHTML+=`<tr><td class="rank-n">${i+1}</td><td style="font-weight:600">${d.medico}</td><td><span class="pill pill-c" style="font-size:8px">${d.esp}</span></td><td style="font-weight:700">${fmt(getVal(d))}</td><td>${p}</td></tr>`;
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 6 — COLSUBSIDIO  (con filtro por tienda)
  // ══════════════════════════════════════════════════════════════════
  async function buildP6() {
    await loadColsubsidio('');
  }

  async function loadColsubsidio(tienda) {
    const data=await apiFetch('colsubsidio',{tienda},false);
    if(!data) return;
    const {sell_out,inventario,rotation,monthly_so,by_store,stores}=data;

    // Populate tienda filter
    const sel=document.getElementById('f-tienda');
    if(sel&&stores&&sel.options.length<=1){
      stores.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s.slice(0,35);sel.appendChild(o);});
    }

    const totalSO=(sell_out||[]).reduce((s,d)=>s+(d.unidades||0),0);
    document.querySelector('#page-6 .colsub-kpis').innerHTML=`
      <div class="colsub-kpi"><div class="cv">${(totalSO||0).toLocaleString()}</div><div class="cl">Sell-Out Total (u)</div></div>
      <div class="colsub-kpi"><div class="cv">${sell_out&&sell_out[0]?sell_out[0].DESCRIPCION.slice(0,15):'—'}</div><div class="cl">Producto líder sell-out</div></div>
      <div class="colsub-kpi"><div class="cv">${(stores||[]).length} PDV</div><div class="cl">Puntos de venta</div></div>
      <div class="colsub-kpi"><div class="cv">${rotation?rotation.filter(r=>r.status==='riesgo_agotado').length:0}</div><div class="cl">Riesgo agotado</div></div>`;

    // Sell-Out vs Sell-In monthly
    if(monthly_so&&monthly_so.length) Charts.colsubMonthly('c-colsub-monthly', monthly_so);
    Charts.colsubSO('c-colsub-so',sell_out);
    Charts.colsubInv('c-colsub-inv',inventario);

    const tbody=document.getElementById('colsub-rot-tbody');
    if(tbody&&rotation){
      tbody.innerHTML='';
      rotation.forEach(r=>{
        const sm={riesgo_agotado:['🔴','Riesgo agotado','var(--red)'],normal:['🟢','Normal','var(--green)'],baja_rotacion:['🟡','Baja rotación','var(--amber)'],sin_sell_out:['⚪','Sin sell-out','var(--gray)']};
        const [ico,txt,col]=sm[r.status]||['⚪','—','var(--gray)'];
        tbody.innerHTML+=`<tr><td style="font-weight:600;font-size:11px">${r.prod.slice(0,30)}</td><td>${r.so.toLocaleString()}</td><td>${r.inv.toLocaleString()}</td><td style="font-weight:700">${r.rot}x</td><td style="color:${col}">${ico} ${txt}</td></tr>`;
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 7 — INCONSISTENCIAS
  // ══════════════════════════════════════════════════════════════════
  async function buildP7() {
    const incons=await apiFetch('inconsistencies',{},false);
    const el=document.getElementById('incon-list');
    if(!incons||!incons.length){el.innerHTML='<div class="empty-state"><div class="icon">✅</div><p>No se detectaron inconsistencias.</p></div>';return;}
    document.getElementById('incon-count').textContent=incons.length;
    el.innerHTML=incons.map(inc=>{
      const pills=inc.zonas.map(z=>{const c=z==='PERIFERIA'?'pill-p':z==='CENTRO'?'pill-c':z==='MP'?'pill-m':'pill-s';return `<span class="pill ${c}">${z}</span>`;}).join(' ');
      return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:11px;flex-wrap:wrap">
        <span class="sem sem-a"></span><strong style="min-width:190px">${inc.asesor}</strong>${pills}
        <span style="color:var(--gray);margin-left:auto">${fmt(inc.ventas)}</span></div>`;
    }).join('');
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 8 — FORECAST
  // ══════════════════════════════════════════════════════════════════
  async function buildP8() {
    const [fc,monthly]=await Promise.all([apiFetch('forecast',{},false),apiFetch('monthly')]);
    if(!fc) return;
    const {forecast,ytd_2026}=fc;
    const fe=(forecast||[]).reduce((s,r)=>s+r.esperado,0);
    const fc_c=(forecast||[]).reduce((s,r)=>s+r.conservador,0);
    const fa=(forecast||[]).reduce((s,r)=>s+r.acelerado,0);
    document.getElementById('kpis-8').innerHTML=`
      <div class="kpi"><div class="kpi-lbl">YTD 2026</div><div class="kpi-val red">${fmt(ytd_2026)}</div><div class="kpi-note">Datos reales</div></div>
      <div class="kpi gray"><div class="kpi-lbl">Conservador</div><div class="kpi-val">${fmt(ytd_2026+fc_c)}</div><div class="kpi-note">Escenario bajo</div></div>
      <div class="kpi green"><div class="kpi-lbl">Esperado</div><div class="kpi-val green">${fmt(ytd_2026+fe)}</div><div class="kpi-note">Proyección base</div></div>
      <div class="kpi amber"><div class="kpi-lbl">Acelerado</div><div class="kpi-val amber">${fmt(ytd_2026+fa)}</div><div class="kpi-note">Con plan H2</div></div>`;
    if(monthly) Charts.forecast('c-forecast',monthly,forecast||[]);
    const grid=document.getElementById('fc-grid');
    if(grid&&forecast) grid.innerHTML=forecast.map(f=>`
      <div class="fc-month"><div class="fc-mes">${f.mes.slice(0,3)}</div>
        <div class="fc-row"><div class="fc-v fc-conserv">${fmt(f.conservador)}</div><div class="fc-sc">Conserv.</div></div>
        <div class="fc-row" style="margin-top:4px"><div class="fc-v fc-esper">${fmt(f.esperado)}</div><div class="fc-sc">Esperado</div></div>
        <div class="fc-row" style="margin-top:4px"><div class="fc-v fc-acel">${fmt(f.acelerado)}</div><div class="fc-sc">Acelerado</div></div>
      </div>`).join('');
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 9 — PLAN DE ACCIÓN (complete with all 13 advisors)
  // ══════════════════════════════════════════════════════════════════
  const ACTIONS = {
    'JUAN DAVID LOAIZA':[
      {p:1,col:'',t:'Intensificar visita médica — Neuromédica y dermatos Periferia',d:'Cliente #1 genera $414M. Visitar top 20 dermatos no activos con muestra Minoxidil magistral y protocolo de caída de cabello. Meta: 10 nuevos prescriptores/mes.',kpi:'Neuromédica +20% · 10 dermatos nuevos',plazo:'Jun–Ago'},
      {p:1,col:'',t:'Campaña Solar Sunglass en farmacias Medellín–Antioquia',d:'Temporada solar May–Ago. Activar en Audifarma, Pasteur y farmacias independientes con display y precio especial.',kpi:'$50M adicionales Sunglass H2',plazo:'May–Ago'},
      {p:2,col:'amber',t:'Ampliar mix Sofia Posada Jurado — 650 pedidos, alta frecuencia',d:'Cliente particular #2 con altísima frecuencia. Actualmente Minoxidil/Dutasteride. Proponer Fresh Skin y ABSORB-K para ampliar ticket.',kpi:'Ticket promedio +15%',plazo:'Jul'},
      {p:2,col:'amber',t:'Reactivar 200 clientes con última compra >90 días',d:'Con 3.859 clientes, muchos están inactivos. Revisión proactiva con oferta específica de Minoxidil o Dutasteride.',kpi:'200 clientes reactivados H2',plazo:'Jun–Jul'},
      {p:3,col:'green',t:'Consolidar Hidroxiurea en centros oncológicos',d:'Producto #2 con alta recurrencia. Mapear 10 oncólogos/hematólogos que no prescriben y hacer visita mensual con protocolo.',kpi:'10 oncólogos activos',plazo:'Jul–Sep'},
    ],
    'JUAN GUILLERMO GUTIERREZ':[
      {p:1,col:'',t:'URGENTE: Diagnosticar y corregir caída -6.4% YoY',d:'Único asesor top de Periferia con caída. Diagnosticar clientes perdidos, cambios en mix o pérdida de médicos. Plan correctivo antes del 30 julio.',kpi:'Diagnóstico + plan correctivo',plazo:'Junio'},
      {p:1,col:'',t:'Activar ABSORB-K en canal derma y farmacias Periferia',d:'Producto #2 con alto potencial en temporada. Rinoderma es clave. Proponer exhibición especial y dermoconsultora.',kpi:'$80M en ABSORB-K H2',plazo:'Jun–Ago'},
      {p:2,col:'amber',t:'Desarrollar Naltrexona con psiquiatras y adictólogos',d:'Producto #3 con alta recurrencia. Canal médico sin desarrollar. Visitar 10 psiquiatras con protocolo LDN.',kpi:'10 psiquiatras activos',plazo:'Jul–Sep'},
      {p:2,col:'amber',t:'Retener Grupo AFIN — distribuidor logístico clave',d:'Principal distribuidor. Proponer contrato marco de abastecimiento mensual fijo con descuento por volumen.',kpi:'Contrato anual AFIN',plazo:'Junio'},
      {p:3,col:'green',t:'Aprovechar 4.116 clientes — mayor base del equipo',d:'Segmentar por frecuencia y potencial. Top 200 mueve el 80% del volumen. Plan de atención diferencial por segmento.',kpi:'Top 200 clientes mapeados',plazo:'Jun–Jul'},
    ],
    'NICOLAS MUNERA':[
      {p:1,col:'',t:'Capitalizar Carolina Palacio SAS — médico #1 del país',d:'Dermatóloga con mayor generación de ventas ($495M). Proponer convenio exclusivo de formulación magistral Fagron. Visita mensual.',kpi:'Ventas C. Palacio +25% H2',plazo:'Jun–Dic'},
      {p:1,col:'',t:'Activar ABSORB-K y Fresh Skin en canal Retail Centro',d:'Productos #2/#3 con temporada solar. Farmacia Institucional puede activar con cross-sell en receta de Minoxidil.',kpi:'$100M cosméticos H2',plazo:'May–Ago'},
      {p:2,col:'amber',t:'Desarrollar Beauty Concept Products — potencial distribuidor',d:'Cliente #3 creciente. Potencial de convertirse en distribuidor especializado de cosméticos Fagron en Bogotá.',kpi:'Volumen Beauty +50%',plazo:'Jul–Sep'},
      {p:2,col:'amber',t:'Mapear 20 dermatos en Bogotá sin formulación activa',d:'Con 350 clientes, hay margen de expansión. Identificar dermatólogos de alto perfil que no formulan con Fagron.',kpi:'15 dermatos nuevos activos',plazo:'Jun–Sep'},
      {p:3,col:'green',t:'Argumentario Minoxidil oral vs genéricos en Bogotá',d:'Bogotá tiene mayor penetración de genéricos. Desarrollar dossier diferencial con datos de efectividad del magistral.',kpi:'Participación Minoxidil +10%',plazo:'Jun–Ago'},
    ],
    'DIANA BECERRA':[
      {p:1,col:'',t:'CRÍTICO: Recuperación urgente Colsubsidio',d:'Cliente #1 cayó -53% YoY. Reunión inmediata con comprador. Diagnosticar causa (precio, servicio, competencia). Plan de recuperación con incentivos.',kpi:'Recuperar $300M Colsubsidio H2',plazo:'Junio'},
      {p:1,col:'',t:'Diagnóstico caída -53% — identificar raíz del problema',d:'Revisar facturas perdidas vs 2025, clientes migrados, cambios en servicio. Sin diagnóstico no hay solución.',kpi:'Diagnóstico completo documentado',plazo:'Junio'},
      {p:1,col:'',t:'Reactivar Cruz Verde con propuesta solar',d:'Cliente #2. Proponer exhibición ABSORB-K + Sunglass para temporada solar. Diana tiene los productos correctos.',kpi:'$80M Cruz Verde H2',plazo:'Jun–Ago'},
      {p:2,col:'amber',t:'Profundizar Beta Estradiol con ginecólogos Bogotá',d:'Producto hormonal de alta recurrencia. Visitar top 20 ginecólogos zona Centro con protocolo de TRH magistral.',kpi:'15 nuevos prescriptores TRH',plazo:'Jun–Sep'},
      {p:3,col:'green',t:'Activar Instituto Fertilidad con magistrales ginecológicas',d:'Cliente #3 con alto potencial. Protocolo completo de magistrales para estimulación ovárica. Alta recurrencia si se fideliza.',kpi:'$30M Instituto Fertilidad',plazo:'Jul–Sep'},
    ],
    'GISELA URIBE':[
      {p:1,col:'',t:'Sostener y crecer Pasteur — cliente estrella +58.3%',d:'Principal motor de su crecimiento. Asegurar abastecimiento continuo. Alianza solar con Sunglass en puntos estratégicos.',kpi:'Pasteur $400M+ H2',plazo:'Jun–Dic'},
      {p:1,col:'',t:'Maximizar Sunglass temporada solar May–Ago',d:'Mayor potencial solar del equipo. Ampliar cobertura en Audifarma, Pasteur y droguerías independientes de toda la zona.',kpi:'Sunglass +40% vs 2025',plazo:'May–Ago'},
      {p:2,col:'amber',t:'Desarrollar canal médico con Progesterona y hormonas',d:'Alta recurrencia en ginecología. Mapear top 15 ginecólogos de la zona y visita mensual con protocolo TRH.',kpi:'10 ginecólogos activos',plazo:'Jun–Sep'},
      {p:2,col:'amber',t:'Documentar modelo de éxito +58.3% para replicar',d:'La asesor con mayor crecimiento. Registrar estrategias con Pasteur y Audifarma para sesión de mejores prácticas.',kpi:'Sesión best practices equipo',plazo:'Jul'},
      {p:3,col:'green',t:'Prospectar 5 clientes nuevos en ciudades de la zona',d:'Potencial geográfico sin explotar en Cali, Buenaventura y ciudades intermedias del eje cafetero.',kpi:'5 clientes nuevos Q3',plazo:'Jul–Sep'},
    ],
    'MALKA MARTINLEYES':[
      {p:1,col:'',t:'Activar Sunglass en Audifarma Barranquilla — zona Caribe',d:'Audifarma es el cliente #1. Temporada solar en la costa es la más intensa del país. Exhibición premium Sunglass.',kpi:'$60M Sunglass en Audifarma',plazo:'May–Ago'},
      {p:1,col:'',t:'Crecer Ketoconazol con dermatos de la costa Atlántica',d:'Producto #2 con alta recurrencia en dermatología tropical. Visitar top 20 dermatos Barranquilla, Cartagena y Santa Marta.',kpi:'15 dermatos activos costa',plazo:'Jun–Sep'},
      {p:2,col:'amber',t:'Consolidar ETICOS S.A.S. como distribuidor regional',d:'Cliente #2. Potencial de convertirse en distribuidor Caribe. Proponer esquema con metas trimestrales y condiciones preferenciales.',kpi:'Acuerdo distribución Caribe',plazo:'Jul'},
      {p:2,col:'amber',t:'Eliminar valles — activación en meses bajos',d:'Identificar los 3 meses más bajos históricamente y proponer acciones específicas para cada uno.',kpi:'Sin meses bajo $100M H2',plazo:'H2 2026'},
      {p:3,col:'green',t:'Upsell en top 100 clientes — de 1 producto a 2+',d:'Con 1.145 clientes, muchos compran un solo producto. Estrategia de upsell en el top 100 puede mover el volumen.',kpi:'Ticket +12% en top 100',plazo:'Jun–Ago'},
    ],
    'LUISA FERNANDA TORRES':[
      {p:1,col:'',t:'Crecer con Medicina Estética y Tricología — cliente ancla',d:'Cliente ancla. Expansión con Tricho-Foam + Gluconato en programa de tricología integral. Protocolo completo Fagron.',kpi:'$40M adicionales MTI',plazo:'Jun–Sep'},
      {p:1,col:'',t:'Activar Minoxidil en Cruz Verde de su zona',d:'Cruz Verde está en la cartera con alto potencial. Exhibición especial Minoxidil tópico con comunicación de prescripción médica.',kpi:'Cruz Verde $50M H2',plazo:'Jun–Ago'},
      {p:2,col:'amber',t:'Protocolo Tricho-Foam para dermatos tricólogos',d:'Crear protocolo médico en alopecia y visitar top 15 dermatos especializados en tricología de la zona.',kpi:'12 dermatos tricólogos activos',plazo:'Jun–Sep'},
      {p:2,col:'amber',t:'Sostener +23.1% — plan vs estacionalidad junio-julio',d:'Curva ascendente pero con meses bajos en jun-jul. Activación específica con clientes anclados.',kpi:'Sin mes bajo meta H2',plazo:'Jun–Jul'},
      {p:3,col:'green',t:'Prospectar 10 centros tricológicos de la zona',d:'El canal tricológico es su diferenciador. Mapear clínicas en Medellín y eje cafetero que no compran Fagron.',kpi:'10 centros nuevos Q3',plazo:'Jul–Oct'},
    ],
    'CRISTINA TAVERA':[
      {p:1,col:'',t:'Profundizar Bella Piel SAS — tienda especializada clave',d:'Cliente #1. Programa dermoconsultora en puntos Bella Piel con Minoxidil + Fresh Skin + ABSORB-K.',kpi:'Bella Piel $100M H2',plazo:'Jun–Dic'},
      {p:1,col:'',t:'Crecer Fresh Skin y cosméticos en temporada solar',d:'Fresh Skin = producto #3 en plena temporada. Activar en Bella Piel, Hair Doctors y clientes de estética zona Centro.',kpi:'Cosméticos +30% H2',plazo:'May–Ago'},
      {p:2,col:'amber',t:'Desarrollar Hair Doctors — clínica tricóloga premium',d:'Cliente #2 con alta especialización. Portafolio completo Fagron para protocolos de tricología médica.',kpi:'Hair Doctors $60M H2',plazo:'Jun–Sep'},
      {p:2,col:'amber',t:'Activar Dutasteride en urólogos y dermatos zona Centro',d:'Producto #2, alta recurrencia en andrología. Visitar top 15 urólogos/dermatos Bogotá con protocolo FAGA.',kpi:'10 prescriptores Dutasteride',plazo:'Jun–Sep'},
      {p:3,col:'green',t:'Reactivar base de 1.463 clientes — buscar inactivos',d:'Segunda mayor cartera del equipo. Revisión de quienes no han comprado en 90 días y reactivación dirigida.',kpi:'100 clientes reactivados',plazo:'Jun–Jul'},
    ],
    'MARLY PAOLA BOLAÑO SUAREZ':[
      {p:1,col:'',t:'Consolidar La Botica de la Piel — tienda especializada top',d:'Cliente #1. Programa de exhibición permanente Sunglass + ABSORB-K para temporada solar. Dermoconsultora en PDV.',kpi:'La Botica $80M H2',plazo:'Jun–Dic'},
      {p:1,col:'',t:'Capitalizar Sunglass y Minoxidil — productos estrella',d:'Top 2 productos en temporada alta. Activar en todos los clientes de canal farmacia y dermo. +28.7% YoY confirma el potencial.',kpi:'Sunglass+Minoxidil +30% H2',plazo:'May–Ago'},
      {p:2,col:'amber',t:'Desarrollar Oncofem IPS — canal oncológico femenino',d:'Cliente #3. Potencial en tratamientos cáncer de mama: hormonas, ácido retinoico. Visita mensual con protocolo.',kpi:'Oncofem $25M H2',plazo:'Jun–Sep'},
      {p:2,col:'amber',t:'Activar canal estética con AC Retinoico',d:'Producto #3 con alto potencial en estética. Mapear clínicas de la zona y proponer protocolo de piel con Ácido Retinoico.',kpi:'8 clínicas estéticas nuevas',plazo:'Jul–Sep'},
      {p:3,col:'green',t:'Sostener momentum +28.7% — plan mensual de acciones',d:'Uno de los mayores crecimientos del equipo. Plan mensual específico para mantener el crecimiento en H2.',kpi:'Mantener >$100M/mes H2',plazo:'Jun–Dic'},
    ],
    'ALEJANDRO HENAO':[
      {p:1,col:'',t:'URGENTE: Diagnosticar caída -19.6% YoY',d:'Primera acción: entender la raíz. ¿Clientes perdidos? ¿Frecuencia baja? Revisar facturación mes a mes vs 2025.',kpi:'Diagnóstico completo documentado',plazo:'Junio'},
      {p:1,col:'',t:'Reactivar canal solar — Sunglass es el producto #1',d:'Temporada solar es la oportunidad de recuperación. Clientes dermo y farmacia de la zona son los ideales. Activación May–Ago.',kpi:'Sunglass $40M en H2',plazo:'May–Ago'},
      {p:2,col:'amber',t:'Retener Fernando Jiménez García — cliente #1',d:'Cliente principal en riesgo. Visita presencial inmediata. Entender necesidades actuales y proponer mix ampliado.',kpi:'Fernando Jiménez sin caída',plazo:'Junio'},
      {p:2,col:'amber',t:'Activar Audifarma con Fresh Skin — temporada solar',d:'Audifarma = cliente #2. Fresh Skin en temporada solar puede generar volumen incremental rápido.',kpi:'$20M Fresh Skin Audifarma',plazo:'Jun–Ago'},
      {p:3,col:'green',t:'Recuperar nivel histórico >$65M/mes',d:'En 2025 tuvo meses de $110M+. Plan mensual con meta mínima de $65M/mes para estabilizar primero, luego crecer.',kpi:'$65M mínimo mensual H2',plazo:'Jun–Dic'},
    ],
    'JESSICA GONZALEZ':[
      {p:1,col:'',t:'Profundizar Tadalafilo con urólogos y andrólogos Bogotá',d:'Producto #1, nicho de alta recurrencia. Visitar top 20 urólogos y andrólogos Bogotá con protocolo disfunción eréctil.',kpi:'15 prescriptores Tadalafilo',plazo:'Jun–Sep'},
      {p:1,col:'',t:'Desarrollar Vivaliti Colombia — clínica estética en crecimiento',d:'Cliente #1 con $256M. Ampliar con cosméticos y magistrales tópicos para procedimientos pre/post.',kpi:'Vivaliti $80M H2',plazo:'Jun–Dic'},
      {p:2,col:'amber',t:'Activar canal clínicas estéticas Bogotá',d:'El crecimiento +54.5% viene de este canal. Mapear 10 clínicas adicionales con portafolio Beta Estradiol + Tadalafilo + Fresh Skin.',kpi:'5 nuevas clínicas activas',plazo:'Jul–Sep'},
      {p:2,col:'amber',t:'Crecer Beta Estradiol con ginecólogos y endocrinólogos',d:'Producto #2, alta recurrencia. Visitar top 15 especialistas con protocolo de TRH y calidad del magistral Fagron.',kpi:'10 nuevos prescriptores TRH',plazo:'Jun–Sep'},
      {p:3,col:'green',t:'Replicar modelo Dermacenter en centros similares',d:'Dermacenter = cliente #2, centro dermo de alto perfil. Documentar el modelo y buscar 5 centros similares en Bogotá.',kpi:'3 nuevos centros dermo activos',plazo:'Jul–Oct'},
    ],
    'NANCY CAICEDO':[
      {p:1,col:'',t:'Consolidar Audifarma como canal institucional prioritario',d:'Cliente #1 con facturación de Activos y magistrales. Proponer contrato de suministro anual con precios fijos.',kpi:'Contrato Audifarma anual',plazo:'Junio'},
      {p:1,col:'',t:'Crecer Sulfadiazina y Lidocaína en hospitales de Bogotá',d:'Productos #2/#3 de consumo hospitalario. Fund. Misericordia y Santa Fe son clientes ancla. Proponer cuadro de medicamentos a otros hospitales.',kpi:'5 hospitales nuevos Q3',plazo:'Jun–Sep'},
      {p:2,col:'amber',t:'Ampliar base de 62 clientes — potencial crítico',d:'Base más pequeña del equipo (62) pero factura $680M. Cada cliente nuevo de alta facturación impacta significativamente.',kpi:'15 nuevos clientes H2',plazo:'Jun–Sep'},
      {p:2,col:'amber',t:'Desarrollar magistrales especiales hospitalarias',d:'Centro-Bogotá tiene los hospitales más grandes del país. Proponer preparaciones magistrales especiales no disponibles comercialmente.',kpi:'3 nuevas fórmulas hospitalarias',plazo:'Jul–Sep'},
      {p:3,col:'green',t:'Programa Activos para formuladores magistrales',d:'Activos = producto #1. Identificar 10 farmacias magistrales de Bogotá que no compran Fagron y visitar con catálogo.',kpi:'10 farmacias formuladoras nuevas',plazo:'Jul–Oct'},
    ],
    'MAIRA ACOSTA':[
      {p:1,col:'',t:'Contratos marco con Megalabs y Munera Jaramillo',d:'Top 2 clientes B2B. Con +130% YoY, el canal MP está en su mejor momento. Contratos anuales con precios escalonados por volumen.',kpi:'Contratos anuales top 2 clientes',plazo:'Junio'},
      {p:1,col:'',t:'Catálogo técnico digital de Activos para formuladores',d:'Activos = producto #1. Los laboratorios necesitan fichas técnicas, certificados de calidad, estabilidad, CAS. Catálogo PDF y web.',kpi:'Catálogo listo para presentación',plazo:'Julio'},
      {p:2,col:'amber',t:'Prospectar 20 farmacias de formulación magistral',d:'Los formuladores son los clientes naturales. Mapear las 20 más importantes de Colombia y hacer visita con propuesta.',kpi:'20 formuladoras prospectas',plazo:'Jun–Sep'},
      {p:2,col:'amber',t:'Capitalizar activos UV en canal B2B solar',d:'Sunglass = producto #2. Identificar 5 compañías cosméticas que formulen solares y proponer activos Fagron.',kpi:'$50M activos solares B2B',plazo:'May–Ago'},
      {p:3,col:'green',t:'Explorar distribución regional — Salcobrand como palanca',d:'Tiene cliente en Chile que valida calidad exportable. Explorar 1 distribuidor en Perú o Ecuador para ampliar el canal.',kpi:'1 distribuidor nuevo región',plazo:'H2 2026'},
    ],
  };

  async function buildP9() {
    const [advisors, fc] = await Promise.all([apiFetch('advisors',{year:'2026'}), apiFetch('forecast',{},false)]);
    const ytd=fc?fc.ytd_2026:0;
    const fcarr=fc?fc.forecast:[];
    const targetE=ytd+(fcarr.reduce?(fcarr.reduce((s,r)=>s+r.esperado,0)):0);
    const targetA=ytd+(fcarr.reduce?(fcarr.reduce((s,r)=>s+r.acelerado,0)):0);

    const el=document.getElementById('p9-content');
    el.innerHTML=`
      <div style="background:var(--black);border-radius:8px;padding:20px;margin-bottom:20px;border-left:5px solid var(--red)">
        <div style="font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">📌 Objetivo Central H2 2026</div>
        <div style="font-size:15px;font-weight:700;color:var(--white);line-height:1.6">
          Meta esperada: <span style="color:var(--salmon)">${fmt(targetE)}</span> &nbsp;·&nbsp;
          Meta acelerada: <span style="color:var(--salmon)">${fmt(targetA)}</span>
        </div>
        <div style="font-size:11px;color:var(--gray);margin-top:8px">Basado en estacionalidad histórica 2023–2025 + datos reales Ene–Abr 2026</div>
      </div>`;

    // Section: Asesores críticos
    const declining=(advisors||[]).filter(a=>a.growth_yoy<-5).sort((a,b)=>a.growth_yoy-b.growth_yoy);
    const growing=(advisors||[]).filter(a=>a.growth_yoy>10).sort((a,b)=>b.growth_yoy-a.growth_yoy);

    if(declining.length){
      el.innerHTML+=`<div class="section-hdr" style="margin-bottom:12px"><div class="bar" style="background:var(--red)"></div><h2 style="font-size:15px;color:var(--red)">🔴 Asesores con Acción Inmediata Requerida</h2></div>`;
      declining.forEach(a=>{ el.innerHTML+=buildAdvActionCard(a,'var(--red)'); });
    }
    if(growing.length){
      el.innerHTML+=`<div class="section-hdr" style="margin:16px 0 12px"><div class="bar" style="background:var(--green)"></div><h2 style="font-size:15px;color:var(--green)">🟢 Modelos de Éxito — Replicar en el Equipo</h2></div>`;
      growing.forEach(a=>{ el.innerHTML+=buildAdvActionCard(a,'var(--green)'); });
    }

    // All advisors full action cards
    el.innerHTML+=`<div class="section-hdr" style="margin:20px 0 12px"><div class="bar"></div><h2 style="font-size:15px">📋 Top 5 Acciones por Asesor — Datos Reales</h2></div>`;
    el.innerHTML+=`<div id="all-adv-cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:14px"></div>`;
    const grid=document.getElementById('all-adv-cards');
    const allAdvs=advisors||[];
    // Deduplicate
    const seen=new Map();
    allAdvs.forEach(a=>{if(!seen.has(a.nombre)||a.v>seen.get(a.nombre).v) seen.set(a.nombre,a);});
    [...seen.values()].sort((a,b)=>b.v-a.v).forEach(a=>{ grid.innerHTML+=buildFullAdvCard(a); });
  }

  function buildAdvActionCard(a, borderColor) {
    return `<div style="background:var(--white);border-radius:6px;padding:14px 18px;border-left:4px solid ${borderColor};box-shadow:var(--shadow);margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
        <div><strong style="font-size:13px">${a.nombre.split(' ').slice(0,3).join(' ')}</strong> &nbsp; ${pillZona(a.zona)}</div>
        <span class="badge ${a.growth_yoy>=0?'up':'down'}">${a.growth_yoy>=0?'▲':'▼'} ${fmtPct(a.growth_yoy)} YoY · ${fmt(App.metric==='cop'?a.v:a.u)}</span>
      </div>
      <div style="font-size:11px;color:var(--dark);line-height:1.7">
        Top productos: <strong>${(a.top_products||[]).slice(0,2).join(', ')}</strong><br>
        Top clientes: <strong>${(a.top_clients||[]).slice(0,2).join(', ')}</strong>
      </div>
    </div>`;
  }

  function buildFullAdvCard(a) {
    const actions=ACTIONS[a.nombre]||[
      {p:1,col:'',t:'Consolidar '+((a.top_products||['—'])[0]),d:'Profundizar con top clientes: '+((a.top_clients||['—']).slice(0,2).join(', ')),kpi:'Meta mensual +15%',plazo:'Jun–Ago'},
      {p:1,col:'',t:'Campaña solar con cosméticos',d:'Temporada May–Ago. Canal farmacia y dermo.',kpi:'+30% cosméticos',plazo:'May–Ago'},
      {p:2,col:'amber',t:'Visita médica intensiva dermatos',d:'Dermatología = 89% de ventas. Mapear top 20 dermatos activos.',kpi:'20 médicos/mes',plazo:'Jun–Sep'},
      {p:2,col:'amber',t:'Reactivar clientes inactivos',d:'Revisar últimas 3 compras por cliente.',kpi:'30 clientes reactivados',plazo:'Jun–Jul'},
      {p:3,col:'green',t:'Ampliar mix de productos',d:'Introducir productos complementarios en clientes actuales.',kpi:'Ticket +10%',plazo:'Jul–Sep'},
    ];
    const g=a.growth_yoy||0;
    const bc=g>10?'var(--green)':g>=-5?'var(--amber)':'var(--red)';
    const val=App.metric==='cop'?a.v:a.u;
    let html=`<div class="adv-card">
      <div class="adv-header" style="border-left-color:${bc}">
        <div><div class="adv-name">${a.nombre.split(' ').slice(0,3).join(' ')}</div>${pillZona(a.zona)}<span style="font-size:10px;color:var(--gray);margin-left:6px">${a.gerente.split(' ').slice(0,2).join(' ')}</span></div>
        <div style="text-align:right"><div style="font-weight:700;font-size:14px">${fmt(val)}</div>
          <span class="badge ${g>=0?'up':'down'}">${g>=0?'▲':'▼'} ${fmtPct(g)} YoY</span></div>
      </div>
      <div class="adv-body">
        <div style="font-size:11px;color:var(--dark);margin-bottom:4px">Top: <strong>${(a.top_products||[]).slice(0,2).join(' · ')}</strong></div>
        <div style="font-size:11px;color:var(--dark);margin-bottom:10px">Clientes: <strong>${(a.clientes||0).toLocaleString()}</strong></div>`;
    actions.forEach((ac,i)=>{
      html+=`<div class="action-row">
        <div class="action-num ${ac.col}">${i+1}</div>
        <div><strong style="font-size:11px">${ac.t}</strong><br>${ac.d}<br>
          <span class="tag">${ac.kpi}</span><span class="tag">📅 ${ac.plazo}</span></div>
      </div>`;
    });
    html+=`</div></div>`;
    return html;
  }

  // ══════════════════════════════════════════════════════════════════
  // PAGE 10 — MOLÉCULAS
  // ══════════════════════════════════════════════════════════════════
  async function buildP10() {
    const data=await apiFetch('molecules');
    if(!data) return;
    const {summary,yearly,monthly,top_mols}=data;

    // KPIs
    const top3=summary?summary.slice(0,3):[];
    document.getElementById('kpis-10').innerHTML=`
      <div class="kpi"><div class="kpi-lbl">Molécula #1</div><div class="kpi-val red" style="font-size:13px">${top3[0]?top3[0].familia:'—'}</div><div class="kpi-note">${fmt(top3[0]?top3[0].v:0)}</div></div>
      <div class="kpi green"><div class="kpi-lbl">Molécula #2</div><div class="kpi-val green" style="font-size:13px">${top3[1]?top3[1].familia:'—'}</div><div class="kpi-note">${fmt(top3[1]?top3[1].v:0)} · ${fmtPct(top3[1]?top3[1].growth_yoy:0)}</div></div>
      <div class="kpi amber"><div class="kpi-lbl">Mayor Crecimiento</div><div class="kpi-val amber" style="font-size:12px">${summary?(summary.reduce((b,a)=>a.growth_yoy>b.growth_yoy?a:b,{familia:'—',growth_yoy:-999}).familia):'—'}</div><div class="kpi-note">YoY más alto</div></div>
      <div class="kpi"><div class="kpi-lbl">Moléculas Activas</div><div class="kpi-val">${summary?summary.length:0}</div><div class="kpi-note">Con ventas en filtro</div></div>`;

    // Ranking table
    const tbody=document.getElementById('mol-tbody');
    const mTotal=(summary||[]).reduce((s,m)=>s+m.v,0);
    const maxMV=summary&&summary[0]?summary[0].v:1;
    tbody.innerHTML='';
    (summary||[]).forEach((m,i)=>{
      const gc=m.growth_yoy>=10?'green':m.growth_yoy>=-5?'neutral':'down';
      const bw=Math.round(m.v/maxMV*100);
      const lc=m.linea==='MAGISTRALES ORALES'?'pill-c':m.linea==='COSMETICOS'?'pill-s':m.linea==='ACTIVOS'?'pill-m':'pill-p';
      tbody.innerHTML+=`<tr>
        <td class="rank-n">${i+1}</td>
        <td style="font-weight:600">${m.familia}</td>
        <td><span class="pill ${lc}" style="font-size:8px">${m.linea.replace('MAGISTRALES ','M.')}</span></td>
        <td style="font-weight:700">${fmt(m.v)}</td>
        <td style="color:var(--gray)">${mTotal>0?(m.v/mTotal*100).toFixed(1):0}%</td>
        <td><span class="badge ${gc}">${m.growth_yoy>=0?'▲':'▼'} ${fmtPct(m.growth_yoy)}</span></td>
        ${rankBar(bw)}</tr>`;
    });

    // Charts
    Charts.moleculeYearly('c-mol-yearly', yearly, top_mols?top_mols.slice(0,6):[]);
    Charts.moleculeMonthly('c-mol-monthly', monthly, top_mols?top_mols.slice(0,5):[]);
    Charts.topProducts('c-mol-top', summary?summary.slice(0,15).map(m=>({familia:m.familia,linea:m.linea,v:m.v,u:m.u})):[]);
  }

  // ── Advisor Cards helper ──────────────────────────────────────────
  function buildAdvisorCards(advisors) {
    const grid=document.getElementById('adv-actions-grid');
    if(!grid) return;
    grid.innerHTML='';
    advisors.forEach(a=>{ grid.innerHTML+=buildFullAdvCard(a); });
  }

  return { build, rebuild };
})();
