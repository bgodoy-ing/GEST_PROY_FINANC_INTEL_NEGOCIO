/* Informe BI · BETON INGENIEROS SAS
   Todos los cálculos se hacen en vivo a partir de data/beton_data.js (base rubro × año). */
(() => {
  'use strict';

  const D = window.BETON_DATA;
  const REG = D.registros;
  const v = (rubro, y) => {
    const r = REG.find(x => x.rubro === rubro && x.anio === y);
    return r ? r.valor : 0;
  };

  // ---------- Formatos ----------
  const nf0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = n => (n < 0 ? '−' : '');
  const cop = n => sign(n) + '$' + nf0.format(Math.abs(Math.round(n)));
  const mill = n => sign(n) + '$' + nf1.format(Math.abs(n) / 1e6) + ' M';
  const pct = (n, d = 1) => sign(n) + (d === 2 ? nf2 : nf1).format(Math.abs(n * 100)) + ' %';
  const veces = n => nf1.format(n) + '×';
  const pesos100 = n => sign(n) + '$' + nf2.format(Math.abs(n * 100));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = id => document.getElementById(id);

  // ---------- Indicadores ----------
  function indicadores(y) {
    const g = r => v(r, y);
    const ventas = g('Ventas Netas');
    return {
      mb: g('Utilidad Bruta') / ventas,
      mo: g('Utilidad Operacional') / ventas,
      mn: g('Utilidad Neta') / ventas,
      roe: g('Utilidad Neta') / g('Total Patrimonio'),
      roa: g('Utilidad Neta') / g('Total Activo'),
      rc: g('Total Activo Corriente') / g('Total Pasivo Corriente'),
      pa: (g('Total Activo Corriente') - g('Inventarios')) / g('Total Pasivo Corriente'),
      end: g('Total Pasivo') / g('Total Activo'),
      dso: g('Deudores Clientes') / ventas * 365,
      cob: g('Utilidad Operacional') / g('Gastos No Operacionales'),
      tei: g('Impuestos') / g('Utilidad Antes De Impuestos'),
      fco: g('Flujo neto de operación'),
    };
  }
  const IND = { 2024: indicadores(2024), 2025: indicadores(2025) };
  const fmtInd = (val, f) => f === 'pct' ? pct(val) : f === 'x' ? nf2.format(val) + '×' : f === 'dias' ? nf0.format(val) + ' días' : mill(val);
  const cumple = (ind, val) => ind.sentido === '>=' ? val >= ind.meta : val <= ind.meta;
  const avance = (ind, val) => {
    if (ind.formato === 'cop') return val >= 0 ? 1 : 0;
    if (ind.sentido === '>=') return val / ind.meta;
    return val <= 0 ? 1.5 : ind.meta / val;
  };
  const metaTxt = ind => (ind.sentido === '>=' ? '≥ ' : '≤ ') + (ind.formato === 'cop' ? '$0' : fmtInd(ind.meta, ind.formato));

  // ---------- Simulación ----------
  const BASE = {
    ventas: v('Ventas Netas', 2025), costo: v('Costo De Ventas', 2025), gastos: v('Total Gastos', 2025),
    ino: v('Ingresos No Operacionales', 2025), gno: v('Gastos No Operacionales', 2025),
    tasa: v('Impuestos', 2025) / v('Utilidad Antes De Impuestos', 2025),
  };
  function simular({ dp = 0, dv = 0, dc = 0, dg = 0, df = 0 }) {
    const ventas = BASE.ventas * (1 + dp) * (1 + dv);
    const costo = BASE.costo * (1 + dv) * (1 + dc);
    const gastos = BASE.gastos * (1 + dg) + df;
    const ub = ventas - costo, uo = ub - gastos, uai = uo + BASE.ino - BASE.gno;
    const imp = Math.max(uai, 0) * BASE.tasa;
    return { ventas, costo, gastos, ub, uo, uai, imp, un: uai - imp };
  }
  const BASE_UN = simular({}).un;
  const ESCENARIOS = [
    { n: 'Base 2025 (real)', p: {} },
    { n: 'Costo unitario +10 %', p: { dc: 0.10 } },
    { n: 'Precio −5 %', p: { dp: -0.05 } },
    { n: 'Volumen −15 %', p: { dv: -0.15 } },
    { n: 'Gastos fijos +$500.000', p: { df: 500000 } },
    { n: 'Pesimista (costo +5 %, precio −3 %)', p: { dc: 0.05, dp: -0.03 } },
  ];

  // ---------- Tema y Chart.js ----------
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const charts = {};
  function mk(id, cfg) {
    if (charts[id]) charts[id].destroy();
    const el = $(id);
    if (el) charts[id] = new Chart(el, cfg);
  }
  function tooltip(extra = {}) {
    return Object.assign({
      backgroundColor: css('--tip-bg'), titleColor: css('--tip-ink'), bodyColor: css('--tip-ink'),
      borderColor: css('--line'), borderWidth: 1, padding: 10, cornerRadius: 6, displayColors: false,
      titleFont: { family: 'Inter', weight: '600' }, bodyFont: { family: 'Inter' },
    }, extra);
  }
  function axis(extra = {}) {
    return Object.assign({
      grid: { color: css('--grid'), drawTicks: false },
      border: { color: css('--axis') },
      ticks: { color: css('--muted'), padding: 6, font: { size: 11, family: 'Inter' } },
    }, extra);
  }
  const millTick = val => sign(val) + '$' + nf0.format(Math.abs(val)) + ' M';
  const num1 = val => sign(val) + nf1.format(Math.abs(val));
  // Línea vertical de referencia (p. ej. 100 % de la meta)
  const refLine = (value, label) => ({
    id: 'refLine',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const x = scales.x.getPixelForValue(value);
      ctx.save();
      ctx.strokeStyle = css('--ink-2'); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = css('--ink-2'); ctx.font = '600 11px Inter'; ctx.textAlign = 'center';
      ctx.fillText(label, x, chartArea.top - 6);
      ctx.restore();
    },
  });
  // Etiquetas de valor al final de cada barra (selectivas: solo cuando hay pocas barras)
  const barLabels = fmt => ({
    id: 'barLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = '600 11px Inter'; ctx.fillStyle = css('--ink-2');
      chart.data.datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        meta.data.forEach((bar, i) => {
          const raw = ds.data[i];
          const val = Array.isArray(raw) ? raw[1] - raw[0] : raw;
          const horizontal = chart.options.indexAxis === 'y';
          const p = bar.getProps(['x', 'y', 'base'], true);
          if (horizontal) {
            // Barras flotantes (cascada): etiqueta siempre a la derecha para no chocar con el nombre del rubro
            const floating = Array.isArray(raw), after = floating || val >= 0;
            const edge = floating ? Math.max(p.x, p.base) : p.x;
            ctx.textAlign = after ? 'left' : 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(fmt(val, i), edge + (after ? 6 : -6), p.y);
          } else {
            const top = Math.min(p.y, p.base);
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(fmt(val, i), p.x, top - 4);
          }
        });
      });
      ctx.restore();
    },
  });

  function waterfall(steps) {
    let run = 0;
    return steps.map(s => {
      if (s.total) { run = s.value; return { ...s, range: [0, s.value / 1e6], kind: 'total' }; }
      const start = run; run += s.value;
      return { ...s, range: [start / 1e6, run / 1e6], kind: s.value >= 0 ? 'up' : 'down' };
    });
  }
  function drawWaterfall(id, steps, upColor) {
    const w = waterfall(steps);
    const colors = w.map(s => s.kind === 'total' ? css('--total') : s.kind === 'up' ? (upColor || css('--pos')) : css('--neg'));
    // En pantallas angostas la cascada se dibuja horizontal para que las etiquetas no se encimen
    const box = $(id).parentElement;
    box.dataset.h = box.dataset.h || box.style.height;
    const narrow = box.clientWidth < 560;
    box.style.height = narrow ? (w.length * 34 + 50) + 'px' : box.dataset.h;
    const tick = { color: css('--muted'), font: { size: 11, family: 'Inter' } };
    mk(id, {
      type: 'bar',
      data: { labels: w.map(s => s.label), datasets: [{ data: w.map(s => s.range), backgroundColor: colors, borderRadius: 4, borderSkipped: false, maxBarThickness: 56 }] },
      options: {
        indexAxis: narrow ? 'y' : 'x',
        responsive: true, maintainAspectRatio: false, layout: { padding: narrow ? { right: 56 } : { top: 22 } },
        plugins: {
          legend: { display: false },
          tooltip: tooltip({ callbacks: { label: c => `${w[c.dataIndex].kind === 'total' ? 'Total' : 'Variación'}: ${cop(w[c.dataIndex].value)}` } }),
        },
        scales: narrow ? {
          x: axis({ ticks: { ...tick, maxTicksLimit: 4, callback: millTick } }),
          y: axis({ grid: { display: false }, ticks: { ...tick, color: css('--ink-2'), autoSkip: false } }),
        } : {
          x: axis({ grid: { display: false }, ticks: { color: css('--muted'), font: { size: 11, family: 'Inter' }, maxRotation: 0, autoSkip: false,
            callback(i) { const l = this.getLabelForValue(i); return l.length > 14 ? l.split(' ').reduce((a, wd) => { const last = a[a.length - 1]; if ((last + ' ' + wd).trim().length <= 14) a[a.length - 1] = (last + ' ' + wd).trim(); else a.push(wd); return a; }, ['']) : l; } } }),
          y: axis({ ticks: { color: css('--muted'), font: { size: 11, family: 'Inter' }, callback: millTick } }),
        },
      },
      plugins: [barLabels(num1)],
    });
  }

  // ---------- Helpers de UI ----------
  function segmented(el, onChange) {
    el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      onChange(b.dataset);
    }));
  }
  const pressed = el => el.querySelector('button[aria-pressed="true"]').dataset;

  // =====================================================================
  // 00 Ejecutivo
  // =====================================================================
  let execFilter = 'todos';
  const SHORT = { roe: 'ROE', roa: 'ROA', cob: 'Cobertura no operacional', end: 'Endeudamiento', tei: 'Tasa efectiva impuestos', dso: 'Días de cartera', fco: 'Flujo de caja operativo' };
  function renderEjecutivo() {
    const v24 = y => v(y, 2024), v25 = y => v(y, 2025);
    const xVentas = v25('Ventas Netas') / v24('Ventas Netas');
    const xUN = v25('Utilidad Neta') / v24('Utilidad Neta');
    $('hero').innerHTML = `
      <div class="hero-main">
        <p class="eyebrow">Hallazgo principal</p>
        <h3>Las ventas se multiplicaron <em>${veces(xVentas)}</em>, pero la utilidad solo <em>${veces(xUN)}</em>.</h3>
        <p>En 2024 quedaban ${pesos100(IND[2024].mn)} de utilidad neta por cada $100 vendidos; en 2025, solo ${pesos100(IND[2025].mn)}.
        La empresa ganó tamaño, pero perdió margen: el costo de producción pasó de absorber el ${pct(v24('Costo de Producción (detalle)') / v24('Ventas Netas'))} al ${pct(v25('Costo de Producción (detalle)') / v25('Ventas Netas'))} de las ventas.</p>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><div class="lbl">Ventas netas 2025</div><div class="val">${mill(v25('Ventas Netas'))}</div><div class="cmp">2024: ${mill(v24('Ventas Netas'))}</div></div>
        <div class="hero-stat"><div class="lbl">Utilidad neta 2025</div><div class="val">${mill(v25('Utilidad Neta'))}</div><div class="cmp">2024: ${mill(v24('Utilidad Neta'))}</div></div>
        <div class="hero-stat"><div class="lbl">Margen neto 2025</div><div class="val">${pct(IND[2025].mn)}</div><div class="cmp">2024: ${pct(IND[2024].mn)}</div></div>
        <div class="hero-stat"><div class="lbl">Flujo de caja operativo 2025</div><div class="val">${mill(IND[2025].fco)}</div><div class="cmp">La operación consumió efectivo</div></div>
      </div>`;

    const ok = D.indicadores.filter(i => cumple(i, IND[2025][i.clave])).length;
    $('metaCount').textContent = `${ok} de ${D.indicadores.length} indicadores cumplen la meta en 2025`;
    $('kpis').innerHTML = D.indicadores.map(i => {
      const val = IND[2025][i.clave], c = cumple(i, val);
      return `<article class="kpi ${c ? 'ok' : 'ko'}" data-status="${c ? 'cumple' : 'mejorar'}">
        <span class="name">${esc(i.nombre)}</span>
        <span class="value">${fmtInd(val, i.formato)}</span>
        <span class="meta"><span>Meta ${metaTxt(i)}</span><span>2024: ${fmtInd(IND[2024][i.clave], i.formato)}</span></span>
        <span class="badge ${c ? 'ok' : 'ko'}">${c ? '✔ Cumple la meta' : '✖ Por mejorar'}</span>
      </article>`;
    }).join('');
    applyExecFilter();
  }
  function applyExecFilter() {
    document.querySelectorAll('#kpis .kpi').forEach(k => { k.hidden = execFilter !== 'todos' && k.dataset.status !== execFilter; });
    const list = D.indicadores.filter(i => {
      const c = cumple(i, IND[2025][i.clave]);
      return execFilter === 'todos' || (execFilter === 'cumple') === c;
    });
    const data = list.map(i => Math.min(avance(i, IND[2025][i.clave]), 1.5) * 100);
    $('chMeta').parentElement.style.height = Math.max(180, list.length * 34 + 60) + 'px';
    mk('chMeta', {
      type: 'bar',
      data: { labels: list.map(i => SHORT[i.clave] || i.nombre), datasets: [{ data, backgroundColor: list.map(i => cumple(i, IND[2025][i.clave]) ? css('--good') : css('--bad')), borderRadius: 4, barThickness: 18 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { top: 18, right: 60 } },
        plugins: { legend: { display: false }, tooltip: tooltip({ callbacks: { label: c => {
          const i = list[c.dataIndex], val = IND[2025][i.clave];
          return [`Resultado: ${fmtInd(val, i.formato)}`, `Meta: ${metaTxt(i)}`, cumple(i, val) ? '✔ Cumple la meta' : '✖ Por mejorar'];
        } } }) },
        scales: {
          x: axis({ min: 0, max: 150, ticks: { color: css('--muted'), font: { size: 11, family: 'Inter' }, stepSize: 25, callback: x => x + ' %' } }),
          y: axis({ grid: { display: false }, ticks: { color: css('--ink-2'), font: { size: 12, family: 'Inter' } } }),
        },
      },
      plugins: [refLine(100, 'Meta'), barLabels((val, i) => {
        const raw = avance(list[i], IND[2025][list[i].clave]);
        return raw > 1.5 ? '>150 %' : nf0.format(raw * 100) + ' %';
      })],
    });
  }

  // =====================================================================
  // 01 Resultados
  // =====================================================================
  const WAFFLE_CATS = [
    { n: 'Utilidad neta', r: 'Utilidad Neta', c: '--s1' },
    { n: 'Costo de producción', r: 'Costo de Producción (detalle)', c: '--s2' },
    { n: 'Costos de venta', r: 'Costos de Venta (detalle)', c: '--s3' },
    { n: 'Gastos de administración', r: 'Gastos De Administración', c: '--s4' },
    { n: 'Gastos de ventas', r: 'Gastos De Ventas', c: '--s5' },
    { n: 'No operacional neto', r: 'Total No Operacionales', c: '--s6', neg: true },
    { n: 'Impuestos', r: 'Impuestos', c: '--s7' },
  ];
  function waffleCounts(y) {
    const ventas = v('Ventas Netas', y);
    const shares = WAFFLE_CATS.map(c => (c.neg ? -1 : 1) * v(c.r, y) / ventas * 100);
    const floor = shares.map(Math.floor);
    let left = 100 - floor.reduce((a, b) => a + b, 0);
    shares.map((s, i) => [s - floor[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { floor[i]++; left--; } });
    return { counts: floor, shares };
  }
  let waffleFocus = null;
  function renderResultados() {
    const y25 = 2025;
    const ingreso = y => v('Ventas Netas', y) + v('Ingresos No Operacionales', y);
    const costoTotal = y => v('Costo De Ventas', y) + v('Total Gastos', y) + v('Gastos No Operacionales', y) + v('Impuestos', y);
    $('tilesER').innerHTML = [
      ['Ingreso total 2025', ingreso(y25), `2024: ${mill(ingreso(2024))}`],
      ['Costo total 2025', costoTotal(y25), 'Costo de ventas + gastos + no operacionales + impuestos'],
      ['Margen total estimado 2025', ingreso(y25) - costoTotal(y25), `Igual a la utilidad neta · 2024: ${mill(ingreso(2024) - costoTotal(2024))}`],
    ].map(([l, val, c]) => `<div class="tile"><div class="lbl">${l}</div><div class="val">${cop(val)}</div><div class="cmp">${c}</div></div>`).join('');

    const y = Number(pressed($('cascYear')).y);
    drawWaterfall('chCascada', [
      { label: 'Ventas netas', value: v('Ventas Netas', y), total: true },
      { label: 'Costo de producción', value: -v('Costo de Producción (detalle)', y) },
      { label: 'Costos de venta', value: -v('Costos de Venta (detalle)', y) },
      { label: 'Utilidad bruta', value: v('Utilidad Bruta', y), total: true },
      { label: 'Gastos de administración', value: -v('Gastos De Administración', y) },
      { label: 'Gastos de ventas', value: -v('Gastos De Ventas', y) },
      { label: 'Utilidad operacional', value: v('Utilidad Operacional', y), total: true },
      { label: 'No operacional neto', value: v('Total No Operacionales', y) },
      { label: 'Impuestos', value: -v('Impuestos', y) },
      { label: 'Utilidad neta', value: v('Utilidad Neta', y), total: true },
    ]);

    [2024, 2025].forEach(yy => {
      const { counts } = waffleCounts(yy);
      $('waffle' + yy).innerHTML = counts.map((n, i) => Array.from({ length: n }, () =>
        `<span data-cat="${i}" style="background:var(${WAFFLE_CATS[i].c})" title="${esc(WAFFLE_CATS[i].n)}"></span>`).join('')).join('');
      $('wn' + yy).innerHTML = `Utilidad neta: <b>${pesos100(IND[yy].mn)}</b> de cada $100 vendidos.`;
    });
    const s24 = waffleCounts(2024).shares, s25 = waffleCounts(2025).shares;
    $('waffleLegend').innerHTML = WAFFLE_CATS.map((c, i) =>
      `<span data-cat="${i}" tabindex="0" role="button" aria-label="Resaltar ${esc(c.n)}"><i style="background:var(${c.c})"></i>${esc(c.n)}: <b>${pesos100(s24[i] / 100)}</b> → <b>${pesos100(s25[i] / 100)}</b></span>`).join('');
    applyWaffleFocus();

    const rows = REG.filter(r => r.anio === 2025 && r.estado === 'Estado de Resultados');
    $('tblER').innerHTML = `<thead><tr><th>Rubro</th><th class="n">2024</th><th class="n">2025</th><th class="n">% V 2024</th><th class="n">% V 2025</th><th class="n">Variación $</th><th class="n">Variación %</th></tr></thead><tbody>` +
      rows.map(r => {
        const a = v(r.rubro, 2024), b = r.valor, d = b - a;
        const cls = r.tipo === 'Subtotal' ? 'sub' : r.tipo === 'Detalle de nota' ? 'det' : '';
        return `<tr class="${cls}"><td>${esc(r.rubro)}</td><td class="n">${cop(a)}</td><td class="n">${cop(b)}</td>
          <td class="n">${pct(a / v('Ventas Netas', 2024))}</td><td class="n">${pct(b / v('Ventas Netas', 2025))}</td>
          <td class="n">${cop(d)}</td><td class="n">${a === 0 ? 'n.a.' : pct(d / Math.abs(a))}</td></tr>`;
      }).join('') + '</tbody>';
  }
  function applyWaffleFocus() {
    document.querySelectorAll('.waffle').forEach(w => {
      w.classList.toggle('dim', waffleFocus !== null);
      w.querySelectorAll('span').forEach(s => s.classList.toggle('on', s.dataset.cat === waffleFocus));
    });
  }

  // =====================================================================
  // 02 Crecimiento
  // =====================================================================
  function renderCrecimiento() {
    const items = [
      ['Ventas netas', 'Ventas Netas'], ['Costo de producción', 'Costo de Producción (detalle)'], ['Costos de venta', 'Costos de Venta (detalle)'],
      ['Gastos de administración', 'Gastos De Administración'], ['Gastos de ventas', 'Gastos De Ventas'], ['Gastos no operacionales', 'Gastos No Operacionales'],
      ['Impuestos', 'Impuestos'], ['Utilidad bruta', 'Utilidad Bruta'], ['Utilidad operacional', 'Utilidad Operacional'], ['Utilidad neta', 'Utilidad Neta'],
    ].map(([n, r]) => ({ n, x: v(r, 2025) / v(r, 2024) })).sort((a, b) => b.x - a.x);
    const xv = v('Ventas Netas', 2025) / v('Ventas Netas', 2024);
    mk('chVeces', {
      type: 'bar',
      data: { labels: items.map(i => i.n), datasets: [{ data: items.map(i => i.x), borderRadius: 4, barThickness: 18,
        backgroundColor: items.map(i => i.n === 'Ventas netas' ? css('--total') : i.x > xv ? css('--neg') : css('--pos')) }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 50 } },
        plugins: { legend: { display: false }, tooltip: tooltip({ callbacks: { label: c => `Creció ${veces(c.raw)} (2025 ÷ 2024)` } }) },
        scales: {
          x: axis({ type: 'logarithmic', min: 1, ticks: { color: css('--muted'), font: { size: 11, family: 'Inter' }, callback: val => [1, 2, 5, 10, 20, 50, 100, 200, 500].includes(val) ? val + '×' : '' } }),
          y: axis({ grid: { display: false }, ticks: { color: css('--ink-2'), font: { size: 12, family: 'Inter' } } }),
        },
      },
      plugins: [barLabels(val => veces(val))],
    });

    const series = [['Margen bruto', 'mb', '--s1'], ['Margen operacional', 'mo', '--s2'], ['Margen neto', 'mn', '--s3']];
    mk('chMargenes', {
      type: 'line',
      data: { labels: ['2024', '2025'], datasets: series.map(([n, k, c]) => ({
        label: n, data: [IND[2024][k] * 100, IND[2025][k] * 100], borderColor: css(c), backgroundColor: css(c),
        borderWidth: 2, pointRadius: 5, pointHoverRadius: 7, pointBorderColor: css('--surface'), pointBorderWidth: 2,
      })) },
      options: {
        responsive: true, maintainAspectRatio: false, layout: { padding: { left: 10, right: 90, top: 10 } },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'top', align: 'start', labels: { color: css('--ink-2'), boxWidth: 10, boxHeight: 10, usePointStyle: true, pointStyle: 'rectRounded', font: { family: 'Inter', size: 12 } } },
          tooltip: tooltip({ displayColors: true, callbacks: { label: c => `${c.dataset.label}: ${nf1.format(c.raw)} %` } }),
        },
        scales: {
          x: axis({ grid: { display: false }, offset: true }),
          y: axis({ min: 0, ticks: { color: css('--muted'), font: { size: 11, family: 'Inter' }, callback: x => x + ' %' } }),
        },
      },
      plugins: [{
        id: 'endLabels',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          ctx.save(); ctx.font = '600 12px Inter'; ctx.textBaseline = 'middle';
          chart.data.datasets.forEach((ds, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            const p = meta.data[1];
            ctx.fillStyle = css('--ink-2');
            ctx.fillText(nf1.format(ds.data[1]) + ' %', p.x + 10, p.y);
          });
          ctx.restore();
        },
      }],
    });

    const cp24 = v('Costo de Producción (detalle)', 2024), cp25 = v('Costo de Producción (detalle)', 2025);
    $('insCrec').innerHTML = [
      ['Efecto tijera', `Costos: ${veces(v('Costo De Ventas', 2025) / v('Costo De Ventas', 2024))} vs. ventas: ${veces(xv)}`,
        `El costo de ventas creció más rápido que las ventas, y el margen bruto pasó de ${pct(IND[2024].mb)} a ${pct(IND[2025].mb)}.`, true],
      ['Mayor variación absoluta', `Costo de producción: +${mill(cp25 - cp24)}`,
        `Es el rubro que más creció en pesos: pasó de ${mill(cp24)} a ${mill(cp25)}, el ${pct(cp25 / v('Ventas Netas', 2025))} de las ventas de 2025.`, true],
      ['Estructura administrativa', `Gastos de administración ${veces(v('Gastos De Administración', 2025) / v('Gastos De Administración', 2024))}`,
        `Pasaron de ${mill(v('Gastos De Administración', 2024))} a ${mill(v('Gastos De Administración', 2025))}: la empresa montó una estructura que antes casi no existía.`, false],
      ['Gastos no operacionales', `${mill(v('Gastos No Operacionales', 2025))} en 2025`,
        `Se comieron el ${pct(v('Gastos No Operacionales', 2025) / v('Utilidad Operacional', 2025))} de la utilidad operacional, frente al ${pct(v('Gastos No Operacionales', 2024) / v('Utilidad Operacional', 2024))} en 2024.`, true],
    ].map(([t, h, p, a]) => `<div class="insight ${a ? 'alert' : ''}"><span class="tag">${t}</span><h4>${h}</h4><p>${p}</p></div>`).join('');
  }

  // =====================================================================
  // 03 Balance
  // =====================================================================
  function strip(el, legEl, parts, total) {
    $(el).innerHTML = parts.map(p => {
      const share = p.val / total;
      const label = share >= 0.08 ? pct(share, 1) : '';
      return `<div style="flex:${Math.max(p.val, 0)};background:var(${p.c})" class="${p.c === '--s4' ? 'dark-ink' : ''}" title="${esc(p.n)}: ${cop(p.val)} (${pct(share)})">${label}</div>`;
    }).join('');
    $(legEl).innerHTML = parts.map(p => `<span><i style="background:var(${p.c})"></i>${esc(p.n)}: <b>${mill(p.val)}</b> (${pct(p.val / total)})</span>`).join('');
  }
  function renderBalance() {
    const y = Number(pressed($('balYear')).y);
    const g = r => v(r, y);
    const ta = g('Total Activo');
    $('balTitle').textContent = `Activo total ${y}: ${mill(ta)}`;
    strip('stripActivo', 'legActivo', [
      { n: 'Efectivo e inversiones', val: g('Disponible') + g('Inversiones'), c: '--s1' },
      { n: 'Cartera de clientes', val: g('Deudores Clientes'), c: '--s2' },
      { n: 'Otras cuentas por cobrar (incl. retenciones)', val: g('Cuentas Por Cobrar'), c: '--s3' },
      { n: 'Inventarios e impuestos a favor', val: g('Inventarios') + g('Activos Por Impuestos Corrientes'), c: '--s4' },
      { n: 'Maquinaria y equipo', val: g('Propiedades Planta Y Equipo'), c: '--s5' },
    ], ta);
    strip('stripFin', 'legFin', [
      { n: 'Proveedores y cuentas por pagar', val: g('Proveedores Nacionales') + g('Cuentas Por Pagar'), c: '--s1' },
      { n: 'Impuestos y obligaciones laborales', val: g('Impuestos Gravámenes Y Tasas') + g('Obligaciones Laborales'), c: '--s2' },
      { n: 'Obligaciones financieras', val: g('Obligaciones Financieras LP'), c: '--s3' },
      { n: 'Anticipos de clientes', val: g('Otros Pasivos (anticipos de clientes)'), c: '--s4' },
      { n: 'Patrimonio', val: g('Total Patrimonio'), c: '--s5' },
    ], g('Total Pasivo + Patrimonio'));

    const costoDia = (g('Costo De Ventas') + g('Total Gastos')) / 365;
    const cartera = g('Deudores Clientes') + g('Cuentas Por Cobrar');
    const ratio = (n, val, ok, meta) => `<article class="kpi ${ok === null ? '' : ok ? 'ok' : 'ko'}"><span class="name">${n}</span><span class="value">${val}</span><span class="meta"><span>${meta}</span></span></article>`;
    const I = IND[y];
    $('ratios').innerHTML = [
      ratio('Razón corriente', nf2.format(I.rc) + '×', I.rc >= 1.5, 'Meta ≥ 1,50×'),
      ratio('Prueba ácida', nf2.format(I.pa) + '×', I.pa >= 1, 'Meta ≥ 1,00×'),
      ratio('Endeudamiento', pct(I.end), I.end <= 0.7, 'Meta ≤ 70,0 %'),
      ratio('Cartera / activo total', pct(cartera / ta), null, 'Clientes + otras cuentas por cobrar'),
      ratio('Días de caja disponibles', nf0.format((g('Disponible') + g('Inversiones')) / costoDia) + ' días', null, 'Efectivo + inversiones ÷ costo diario'),
      ratio('Días de cartera (clientes)', nf0.format(I.dso) + ' días', I.dso <= 60, 'Meta ≤ 60 días'),
    ].join('');

    const ret = 219356658; // Retención de construcciones, nota 5.6 (2025)
    $('insBal').innerHTML = y === 2025 ? [
      ['Liquidez en papel', `Razón corriente ${nf2.format(I.rc)}×, pero solo ${nf0.format(g('Disponible') / costoDia)} días de caja`,
        `El activo corriente cubre de sobra las deudas de corto plazo, pero está en cartera, no en efectivo: el disponible (${mill(g('Disponible'))}) alcanza para menos de dos días de operación.`, true],
      ['Cartera y retenciones', `${pct(cartera / ta)} del activo está por cobrar`,
        `Incluye ${mill(ret)} en retenciones de construcción (nota 5.6), dinero que los clientes retienen como garantía hasta entregar la obra, y ${mill(68646102)} en anticipos a proveedores.`, true],
      ['Financiación', `Los clientes financian el ${pct(g('Otros Pasivos (anticipos de clientes)') / ta)} del activo`,
        `Los anticipos de clientes (${mill(g('Otros Pasivos (anticipos de clientes)'))}) son la principal fuente de financiación después del patrimonio; el endeudamiento quedó en ${pct(I.end)}, apenas sobre la meta.`, false],
    ].map(([t, h, p, a]) => `<div class="insight ${a ? 'alert' : ''}"><span class="tag">${t}</span><h4>${h}</h4><p>${p}</p></div>`).join('')
      : `<div class="insight alert"><span class="tag">2024</span><h4>Empresa pequeña y muy apalancada</h4><p>El pasivo financiaba el ${pct(I.end)} del activo y la cartera equivalía a ${nf0.format(I.dso)} días de ventas. El ROE de 2024 (${pct(I.roe)}) está inflado por un patrimonio muy pequeño ($21,5 M) y por la diferencia en la utilidad reportada (ver 08 · Calidad de datos).</p></div>`;
  }

  // =====================================================================
  // 04 Caja
  // =====================================================================
  function renderCaja() {
    const g = r => v(r, 2025);
    drawWaterfall('chPuente', [
      { label: 'Utilidad neta', value: g('Utilidad neta (flujo)'), total: true },
      { label: 'Depreciaciones', value: g('Depreciaciones') },
      { label: 'Más cartera clientes', value: g('Aumento en clientes') },
      { label: 'Más otras cuentas por cobrar', value: g('Aumento en cuentas por cobrar') },
      { label: 'Impuestos por cobrar', value: g('Aumento en impuestos por cobrar') },
      { label: 'Proveedores', value: g('Aumento en proveedores') },
      { label: 'Cuentas por pagar', value: g('Aumento en cuentas por pagar') },
      { label: 'Impuestos por pagar', value: g('Aumento en impuestos por pagar') },
      { label: 'Obligaciones laborales', value: g('Aumento en obligaciones laborales') },
      { label: 'Flujo operativo', value: g('Flujo neto de operación'), total: true },
    ]);
    const fl = [['Operación', g('Flujo neto de operación')], ['Inversión', g('Flujo neto de inversión')], ['Financiación', g('Flujo neto de financiación')]];
    mk('chFlujos', {
      type: 'bar',
      data: { labels: fl.map(f => f[0]), datasets: [{ data: fl.map(f => f[1] / 1e6), backgroundColor: fl.map(f => f[1] >= 0 ? css('--pos') : css('--neg')), borderRadius: 4, maxBarThickness: 64 }] },
      options: {
        responsive: true, maintainAspectRatio: false, layout: { padding: { top: 22 } },
        plugins: { legend: { display: false }, tooltip: tooltip({ callbacks: { label: c => cop(fl[c.dataIndex][1]) } }) },
        scales: { x: axis({ grid: { display: false } }), y: axis({ ticks: { color: css('--muted'), font: { size: 11, family: 'Inter' }, callback: millTick } }) },
      },
      plugins: [barLabels(num1)],
    });
    const suma = fl.reduce((a, f) => a + f[1], 0);
    const cartera = g('Aumento en clientes') + g('Aumento en cuentas por cobrar');
    $('insCaja').innerHTML = [
      ['Por qué no hay caja', `La cartera absorbió ${mill(-cartera)}`,
        `El aumento de la cartera y de otras cuentas por cobrar (retenciones y anticipos) fue ${veces(-cartera / g('Utilidad neta (flujo)'))} la utilidad neta del año: la empresa está financiando a sus clientes.`, true],
      ['Inversión en equipo', `${mill(-g('Compra de propiedad, planta y equipo'))} en maquinaria`,
        `Se financió con deuda (${mill(g('Nuevas obligaciones financieras'))} en pagarés) y con aportes de los socios, buena parte en especie (maquinaria).`, false],
      ['Alerta de conciliación', `Los flujos suman ${mill(suma)}, pero se reporta +${mill(g('Incremento neto de efectivo'))}`,
        'El estado de flujos de 2025 no cuadra: faltan la variación de inventarios, los anticipos de clientes y los aportes de capital.', true],
    ].map(([t, h, p, a]) => `<div class="insight ${a ? 'alert' : ''}"><span class="tag">${t}</span><h4>${h}</h4><p>${p}</p></div>`).join('');
  }

  // =====================================================================
  // 05 Simulador
  // =====================================================================
  const CTRL = [
    { k: 'dp', n: 'Precio de venta', min: -20, max: 20, step: 1, help: 'Cambio en el precio cobrado por la obra.' },
    { k: 'dv', n: 'Volumen de obra', min: -30, max: 30, step: 1, help: 'Más o menos obras ejecutadas (mueve ventas y costo).' },
    { k: 'dc', n: 'Costo unitario de obra', min: -20, max: 20, step: 1, help: 'Materiales, mano de obra y subcontratos por unidad.' },
    { k: 'dg', n: 'Gastos operacionales', min: -30, max: 30, step: 1, help: 'Administración y ventas (%).' },
    { k: 'df', n: 'Gastos fijos adicionales', min: 0, max: 100000000, step: 500000, help: 'Pesos adicionales al año.', money: true },
  ];
  const simState = { dp: 0, dv: 0, dc: 0, dg: 0, df: 0 };
  let simBuilt = false;
  function buildSim() {
    $('presets').innerHTML = ESCENARIOS.map((e, i) => `<button type="button" data-i="${i}" aria-pressed="${i === 0}">${esc(e.n)}</button>`).join('');
    $('presets').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const p = ESCENARIOS[Number(b.dataset.i)].p;
      CTRL.forEach(c => { simState[c.k] = p[c.k] || 0; });
      syncSliders();
      $('presets').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      updateSim();
    }));
    $('simControls').innerHTML = CTRL.map(c => `<div class="ctrl">
        <label for="r_${c.k}">${c.n}<output id="o_${c.k}"></output></label>
        <input type="range" id="r_${c.k}" min="${c.min}" max="${c.max}" step="${c.step}" value="0">
        <small>${c.help}</small></div>`).join('') + '<button type="button" class="btn" id="simReset">Restablecer</button>';
    CTRL.forEach(c => $('r_' + c.k).addEventListener('input', e => {
      simState[c.k] = c.money ? Number(e.target.value) : Number(e.target.value) / 100;
      $('presets').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      updateSim();
    }));
    $('simReset').addEventListener('click', () => $('presets').querySelector('button').click());
    syncSliders();
    simBuilt = true;
  }
  function syncSliders() {
    CTRL.forEach(c => {
      const val = simState[c.k];
      $('r_' + c.k).value = c.money ? val : Math.round(val * 100);
    });
  }
  function updateSim() {
    CTRL.forEach(c => {
      const val = simState[c.k];
      $('o_' + c.k).textContent = c.money ? '+' + cop(val) : (val > 0 ? '+' : '') + nf0.format(val * 100) + ' %';
    });
    const r = simular(simState), d = r.un - BASE_UN, mn = r.un / r.ventas;
    const ok = mn >= 0.05;
    const quiebre = r.uai > 0 ? `El costo de ventas aún puede subir <b>${pct(r.uai / r.costo)}</b> antes de que la empresa entre en pérdida.`
      : `<b>La empresa entra en pérdida antes de impuestos</b> (${mill(r.uai)}).`;
    $('simHero').innerHTML = `<span class="lbl">Utilidad neta simulada · 2025</span>
      <span class="big" style="color:${r.un < 0 ? 'var(--bad-text)' : 'var(--ink)'}">${mill(r.un)}</span>
      <span class="delta ${Math.abs(d) < 1 ? '' : d > 0 ? 'up' : 'down'}">${Math.abs(d) < 1 ? 'Escenario base (cifras reales 2025)' : `${d > 0 ? '▲' : '▼'} ${mill(Math.abs(d))} vs. base (${pct(d / Math.abs(BASE_UN))})`}</span>
      <span class="badge ${ok ? 'ok' : 'ko'}">${ok ? '✔' : '✖'} Margen neto ${pct(mn)} · meta ≥ 5,0 %</span>
      <p class="note">${quiebre}</p>`;
    $('simKpis').innerHTML = [['Ventas netas', r.ventas], ['Utilidad bruta', r.ub], ['Utilidad operacional', r.uo], ['Utilidad antes de impuestos', r.uai]]
      .map(([n, val]) => `<article class="kpi"><span class="name">${n}</span><span class="value" style="font-size:20px">${mill(val)}</span></article>`).join('');
  }
  function renderSimulador() {
    if (!simBuilt) buildSim();
    updateSim();
    const vars = [['Precio de venta', 'dp'], ['Costo unitario', 'dc'], ['Volumen de obra', 'dv'], ['Gastos operacionales', 'dg']];
    const lo = vars.map(([, k]) => (simular({ [k]: -0.10 }).un - BASE_UN) / 1e6);
    const hi = vars.map(([, k]) => (simular({ [k]: 0.10 }).un - BASE_UN) / 1e6);
    const colorOf = arr => arr.map(x => x >= 0 ? css('--pos') : css('--neg'));
    mk('chTornado', {
      type: 'bar',
      data: { labels: vars.map(x => x[0]), datasets: [
        { label: '−10 %', data: lo, backgroundColor: colorOf(lo), borderRadius: 4, barThickness: 20 },
        { label: '+10 %', data: hi, backgroundColor: colorOf(hi), borderRadius: 4, barThickness: 20 },
      ] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 10 } },
        plugins: { legend: { display: false }, tooltip: tooltip({ callbacks: { label: c => `${c.label} ${c.dataset.label}: ${c.raw >= 0 ? '+' : ''}${nf1.format(c.raw)} M` } }) },
        scales: {
          x: axis({ stacked: false, min: -Math.ceil(Math.max(...lo.map(Math.abs), ...hi.map(Math.abs)) / 100 + 0.5) * 100, max: Math.ceil(Math.max(...lo.map(Math.abs), ...hi.map(Math.abs)) / 100 + 0.5) * 100,
            ticks: { color: css('--muted'), font: { size: 11, family: 'Inter' }, callback: millTick } }),
          y: axis({ stacked: true, grid: { display: false }, ticks: { color: css('--ink-2'), font: { size: 12, family: 'Inter' } } }),
        },
      },
      plugins: [barLabels(val => (val >= 0 ? '+' : '−') + nf0.format(Math.abs(val)))],
    });
    const esc_ = ESCENARIOS.map(e => ({ n: e.n, un: simular(e.p).un }));
    mk('chEsc', {
      type: 'bar',
      data: { labels: esc_.map(e => e.n), datasets: [{ data: esc_.map(e => e.un / 1e6), backgroundColor: esc_.map((e, i) => i === 0 ? css('--total') : e.un >= 0 ? css('--pos') : css('--neg')), borderRadius: 4, barThickness: 18 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 56 } },
        plugins: { legend: { display: false }, tooltip: tooltip({ callbacks: { label: c => cop(esc_[c.dataIndex].un) } }) },
        scales: {
          x: axis({ min: Math.floor(Math.min(0, ...esc_.map(e => e.un / 1e6)) / 50 - 1) * 50, ticks: { color: css('--muted'), font: { size: 11, family: 'Inter' }, callback: millTick } }),
          y: axis({ grid: { display: false }, ticks: { color: css('--ink-2'), font: { size: 11.5, family: 'Inter' } } }),
        },
      },
      plugins: [barLabels(num1)],
    });
  }

  // =====================================================================
  // 06 Decisiones
  // =====================================================================
  function renderDecisiones() {
    const g = r => v(r, 2025), g4 = r => v(r, 2024);
    const sCost = simular({ dc: 0.10 }), sPrecio = simular({ dp: -0.05 }), sVol = simular({ dv: -0.15 }), sFijo = simular({ df: 500000 });
    const qbCosto = (g('Utilidad Antes De Impuestos')) / g('Costo De Ventas');
    const qbPrecio = (g('Utilidad Antes De Impuestos')) / g('Ventas Netas');
    const cartera = g('Deudores Clientes') + g('Cuentas Por Cobrar');
    const Q = [
      ['¿Qué genera mayor margen de contribución?', 'La empresa reporta una sola línea de negocio; se compara su margen entre años.',
        `Margen bruto ${pct(IND[2025].mb)} (2024: ${pct(IND[2024].mb)})`,
        `La obra civil generó ${mill(g('Utilidad Bruta'))} de margen bruto en 2025, 6 veces más que en 2024, pero cada peso vendido deja la mitad de margen. El costo de producción pasó del ${pct(g4('Costo de Producción (detalle)') / g4('Ventas Netas'))} al ${pct(g('Costo de Producción (detalle)') / g('Ventas Netas'))} de las ventas.`],
      ['¿Qué canal de venta es más rentable?', 'Adaptada: no hay datos por canal. ¿Fue rentable crecer en volumen?',
        `Ventas ${veces(g('Ventas Netas') / g4('Ventas Netas'))} · utilidad ${veces(g('Utilidad Neta') / g4('Utilidad Neta'))}`,
        `El crecimiento sí aumentó la utilidad en pesos (+${mill(g('Utilidad Neta') - g4('Utilidad Neta'))}), pero la rentabilidad relativa cayó: de ${pesos100(IND[2024].mn)} a ${pesos100(IND[2025].mn)} por cada $100 vendidos.`],
      ['¿Qué periodo presenta mayor variación?', 'Con dos años, se identifica el rubro con mayor variación.',
        `Costo de producción: +${mill(g('Costo de Producción (detalle)') - g4('Costo de Producción (detalle)'))}`,
        `Es la mayor variación absoluta del estado de resultados (${veces(g('Costo de Producción (detalle)') / g4('Costo de Producción (detalle)'))}). En términos relativos, los gastos de administración crecieron ${veces(g('Gastos De Administración') / g4('Gastos De Administración'))}.`],
      ['¿Qué cliente representa mayor concentración?', 'Adaptada: no hay ventas por cliente. ¿Dónde se concentran los recursos?',
        `${pct(cartera / g('Total Activo'))} del activo es cartera`,
        `Clientes y otras cuentas por cobrar suman ${mill(cartera)}: ${mill(g('Deudores Clientes'))} de clientes, ${mill(219356658)} en retenciones de construcción y ${mill(68646102)} en anticipos a proveedores (nota 5.6). Son recursos ya facturados o comprometidos que aún no entran a caja.`],
      ['¿Qué pasa si el costo variable aumenta un 10 %?', 'Sensibilidad sobre el costo de ventas de 2025.',
        `Utilidad neta: ${mill(BASE_UN)} → ${mill(sCost.un)}`,
        `La empresa pasaría a pérdida. Basta un alza del ${pct(qbCosto)} en los costos (o una caída del ${pct(qbPrecio)} en el precio) para llevar la utilidad antes de impuestos a cero. Como comparación: precio −5 % → ${mill(sPrecio.un)}; volumen −15 % → ${mill(sVol.un)}; gastos fijos +$500.000 → ${mill(sFijo.un)}.`],
      ['¿Qué rubros deben revisarse con prioridad?', 'Ordenados por impacto en la utilidad.',
        'Costo de producción, gastos no operacionales e impuestos',
        `(1) Costo de producción: ${pct(g('Costo de Producción (detalle)') / g('Ventas Netas'))} de las ventas. (2) Gastos no operacionales: ${mill(g('Gastos No Operacionales'))}, el ${pct(g('Gastos No Operacionales') / g('Utilidad Operacional'))} de la utilidad operacional. (3) Impuestos: tasa efectiva del ${pct(IND[2025].tei)}, por encima del 35 % general.`],
    ];
    $('qa').innerHTML = Q.map(([q, a, ans, p], i) => `<article class="q"><span class="qn">Pregunta ${i + 1}</span><h4>${q}</h4><span class="adapt">${a}</span><span class="ans">${ans}</span><p>${p}</p></article>`).join('');

    const R = [
      ['Controlar el costo de cada obra y proteger el precio', `Comparar el presupuesto (APU) con el costo real de cada contrato e incluir cláusulas de reajuste por materiales en contratos largos.`,
        `Un alza del ${pct(qbCosto)} en el costo elimina la utilidad; el costo de producción ya es el ${pct(g('Costo de Producción (detalle)') / g('Ventas Netas'))} de las ventas.`],
      ['Acelerar el recaudo de cartera y retenciones', 'Pactar hitos de facturación por avance de obra, hacer seguimiento semanal de la cartera y gestionar la liberación de retenciones al entregar cada obra.',
        `Las cuentas por cobrar son el ${pct(cartera / g('Total Activo'))} del activo y el flujo operativo fue de ${mill(IND[2025].fco)}.`],
      ['Revisar los gastos no operacionales y la deuda', 'Identificar si corresponden a intereses, multas o gastos bancarios y renegociar la tasa de los pagarés.',
        `${mill(g('Gastos No Operacionales'))} en 2025 (${veces(g('Gastos No Operacionales') / g4('Gastos No Operacionales'))} frente a 2024).`],
      ['Hacer planeación tributaria con el contador', 'Revisar gastos no deducibles y provisiones que elevan la tasa efectiva.',
        `Tasa efectiva del ${pct(IND[2025].tei)} frente al 35 % general: cada punto equivale a ${mill(g('Utilidad Antes De Impuestos') * 0.01)}.`],
      ['Crear un tablero mensual y mejorar la captura de datos', 'Registrar ventas, costos y margen por obra, cliente y mes, y conciliar los estados antes de cerrar el año.',
        `Hoy solo hay 2 cortes anuales y ${D.calidad.length} diferencias de conciliación, ${D.calidad.filter(c => c.prioridad === 'Alta').length} de prioridad alta.`],
    ];
    $('recs').innerHTML = R.map(([h, p, e]) => `<article class="rec"><h4>${h}</h4><p>${p}</p><span class="evid">Dato: ${e}</span></article>`).join('');
  }

  // =====================================================================
  // 07 Base de datos
  // =====================================================================
  function enrich(r) {
    const baseVal = v(r.base, r.anio);
    const prev = r.anio === 2025 ? v(r.rubro, 2024) : null;
    return { ...r, vertical: baseVal ? r.valor / baseVal : null, prev, varAbs: prev === null ? null : r.valor - prev, varPct: prev ? (r.valor - prev) / Math.abs(prev) : null };
  }
  const ROWS = REG.map(enrich);
  let datosBuilt = false;
  function filteredRows() {
    const a = $('fAnio').value, e = $('fEstado').value, t = $('fTipo').value, q = $('fBuscar').value.trim().toLowerCase();
    return ROWS.filter(r => (!a || String(r.anio) === a) && (!e || r.estado === e) && (!t || r.tipo === t) &&
      (!q || (r.rubro + ' ' + r.grupo).toLowerCase().includes(q)));
  }
  function drawTable() {
    const rows = filteredRows();
    $('fCount').textContent = `${rows.length} de ${ROWS.length} registros`;
    $('tblBase').innerHTML = `<thead><tr><th>Reg.</th><th>Año</th><th>Estado</th><th>Grupo</th><th>Rubro</th><th>Nota</th><th>Naturaleza</th><th>Tipo</th><th class="n">Valor (COP)</th><th class="n">% Vertical</th><th class="n">Var. % vs 2024</th></tr></thead><tbody>` +
      rows.map(r => `<tr class="${r.tipo === 'Subtotal' ? 'sub' : ''}"><td>${r.registro}</td><td>${r.anio}</td><td>${esc(r.estado)}</td><td>${esc(r.grupo)}</td><td>${esc(r.rubro)}</td><td>${esc(r.nota)}</td><td>${esc(r.naturaleza)}</td><td>${esc(r.tipo)}</td>
        <td class="n">${cop(r.valor)}</td><td class="n">${r.vertical === null ? '' : pct(r.vertical)}</td>
        <td class="n ${r.varPct > 0 ? 'up' : r.varPct < 0 ? 'down' : ''}">${r.anio === 2024 ? '' : r.varPct === null ? 'n.a.' : pct(r.varPct)}</td></tr>`).join('') + '</tbody>';
  }
  function renderDatos() {
    const vars = 15;
    $('datosResumen').textContent = `${ROWS.length} registros (rubro × año) y ${vars} variables, construidos a partir de los estados financieros reales de 2024 y 2025. Filtre, busque o descargue la base.`;
    if (!datosBuilt) {
      [...new Set(REG.map(r => r.estado))].forEach(s => $('fEstado').insertAdjacentHTML('beforeend', `<option>${esc(s)}</option>`));
      [...new Set(REG.map(r => r.tipo))].forEach(s => $('fTipo').insertAdjacentHTML('beforeend', `<option>${esc(s)}</option>`));
      ['fAnio', 'fEstado', 'fTipo', 'fBuscar'].forEach(id => $(id).addEventListener('input', drawTable));
      $('btnCSV').addEventListener('click', () => {
        const head = ['Registro', 'Año', 'Estado financiero', 'Grupo', 'Rubro', 'Nota', 'Naturaleza', 'Tipo de registro', 'Valor (COP)', 'Base vertical', '% Vertical', 'Valor año anterior', 'Variación $', 'Variación %', 'Fuente (pág. PDF)'];
        const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
        const lines = ROWS.map(r => [r.registro, r.anio, r.estado, r.grupo, r.rubro, r.nota, r.naturaleza, r.tipo, r.valor, r.base,
          r.vertical === null ? '' : r.vertical.toFixed(6), r.prev ?? '', r.varAbs ?? '', r.varPct === null ? '' : r.varPct.toFixed(6), r.pagina].map(q).join(';'));
        const blob = new Blob(['﻿' + [head.map(q).join(';'), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'beton_base_datos_2024_2025.csv'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
      datosBuilt = true;
    }
    drawTable();
  }

  // =====================================================================
  // 08 Calidad y 09 Diccionario
  // =====================================================================
  function renderCalidad() {
    const f = pressed($('qFilter')).f;
    $('quality').innerHTML = D.calidad.filter(c => !f || c.prioridad === f).map(c => `<article class="qc">
      <span class="prio ${c.prioridad}">Prioridad ${c.prioridad.toLowerCase()}</span><h4>${esc(c.tema)}</h4><p>${esc(c.hallazgo)}</p><p class="act">→ ${esc(c.accion)}</p></article>`).join('');
  }
  function renderDiccionario() {
    $('dict').innerHTML = D.indicadores.map(i => {
      const val = IND[2025][i.clave], c = cumple(i, val);
      return `<details><summary><span>${esc(i.nombre)}</span><span class="badge ${c ? 'ok' : 'ko'}">${fmtInd(val, i.formato)}</span></summary>
        <dl><dt>Qué mide</dt><dd>${esc(i.descripcion)}</dd><dt>Cómo se calcula</dt><dd>${esc(i.formula)}</dd>
        <dt>Meta</dt><dd>${metaTxt(i)} (referencia del análisis)</dd><dt>Resultado</dt><dd>2025: <b>${fmtInd(val, i.formato)}</b> · 2024: ${fmtInd(IND[2024][i.clave], i.formato)} · ${c ? '✔ Cumple la meta' : '✖ Por mejorar'}</dd>
        <dt>Responsable</dt><dd>${esc(i.responsable)}</dd></dl></details>`;
    }).join('');
  }

  // =====================================================================
  // Navegación
  // =====================================================================
  const RENDER = {
    ejecutivo: renderEjecutivo, resultados: renderResultados, crecimiento: renderCrecimiento, balance: renderBalance, caja: renderCaja,
    simulador: renderSimulador, decisiones: renderDecisiones, datos: renderDatos, calidad: renderCalidad, diccionario: renderDiccionario,
  };
  let current = null;
  function show() {
    let id = location.hash.slice(1);
    if (!RENDER[id]) id = 'ejecutivo';
    document.querySelectorAll('.page').forEach(p => { p.hidden = p.id !== id; });
    document.querySelectorAll('.tabs a').forEach(a => {
      const on = a.getAttribute('href') === '#' + id;
      if (on) { a.setAttribute('aria-current', 'page'); const t = a.parentElement; t.scrollLeft = a.offsetLeft - (t.clientWidth - a.offsetWidth) / 2; } else a.removeAttribute('aria-current');
    });
    current = id;
    RENDER[id]();
    if (window.scrollY > 200) window.scrollTo({ top: 0 });
  }

  function init() {
    if (window.Chart) {
      Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
      Chart.defaults.color = css('--muted');
    }
    segmented($('metaFilter'), d => { execFilter = d.f; applyExecFilter(); });
    segmented($('cascYear'), () => renderResultados());
    segmented($('balYear'), () => renderBalance());
    segmented($('qFilter'), () => renderCalidad());
    $('waffleLegend').addEventListener('click', e => {
      const el = e.target.closest('[data-cat]');
      if (!el) return;
      waffleFocus = waffleFocus === el.dataset.cat ? null : el.dataset.cat;
      applyWaffleFocus();
    });
    $('waffleLegend').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } });
    $('openAll').addEventListener('click', e => {
      const all = document.querySelectorAll('#dict details');
      const open = [...all].some(d => !d.open);
      all.forEach(d => { d.open = open; });
      e.target.textContent = open ? 'Cerrar todas' : 'Abrir todas';
    });
    try { const t = localStorage.getItem('beton-theme'); if (t) document.documentElement.dataset.theme = t; } catch (_) { /* sin almacenamiento */ }
    $('themeBtn').addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === 'dark'
        : matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('beton-theme', document.documentElement.dataset.theme); } catch (_) { /* sin almacenamiento */ }
      RENDER[current]();
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.dataset.theme) RENDER[current](); });
    window.addEventListener('hashchange', show);
    show();
  }

  if (!window.Chart) {
    document.querySelector('main').insertAdjacentHTML('afterbegin', '<p class="card">No se pudo cargar la librería de gráficos (Chart.js). Revise la conexión a internet.</p>');
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(init, init);
})();
