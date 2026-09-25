const PptxGenJS = require('pptxgenjs');

const WHATSAPP = '5551981180750';

// Sistema visual: fundo preto, tipografia grande, um accent por slide, muito respiro.
// Regra do deck: uma ideia por slide. Se precisa de dois cards, provavelmente são dois slides.
const COLOR = {
  bg: '000000',
  ink: 'FFFFFF',
  muted: '8E939C',
  faint: '2A2C33',
  dim: '15161A',
  orange: 'FF7A45',  // dor
  green: '3DDC84',   // resultado / quick win
  blue: '4D8DFF',    // projeto maior
  purple: 'B98BFF',  // promessa / diy
  amber: 'FFB545',   // preenchimento / dwy
  red: 'FF6B6B',     // ignorar / risco
  teal: '2BD9C9'     // ferramenta / dfy
};

const FONT = 'Arial';
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const M = 0.9;              // margem lateral
const CW = SLIDE_W - M * 2; // largura útil

function newDeck() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'WIDE';
  return pptx;
}

// ---------- utilitários ----------
function safe(v, fallback) {
  return (v === undefined || v === null || v === '') ? (fallback || 'TBD') : v;
}
function num(v, fallback) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
}
function truncate(str, maxLen) {
  str = String(str === undefined || str === null ? '' : str).replace(/\s+/g, ' ').trim();
  if (str.length <= maxLen) return str;
  return str.slice(0, Math.max(0, maxLen - 1)).trim() + '…';
}
// Reduz o corpo da fonte conforme o texto cresce, pra uma frase-herói nunca estourar a caixa.
function autoSize(text, base, min, charsAtBase) {
  const len = String(text || '').length;
  if (len <= charsAtBase) return base;
  return Math.max(min, Math.round(base * Math.sqrt(charsAtBase / len)));
}
function brl(n) {
  return 'R$ ' + Math.round(num(n, 0)).toLocaleString('pt-BR');
}

// ---------- primitivas do sistema visual ----------
function baseSlide(ctx) {
  const slide = ctx.pptx.addSlide();
  slide.background = { color: COLOR.bg };
  ctx.index += 1;
  slide.addText(String(ctx.index).padStart(2, '0') + ' / ' + String(ctx.total).padStart(2, '0'), {
    x: SLIDE_W - M - 1.5, y: SLIDE_H - 0.55, w: 1.5, h: 0.3,
    fontFace: FONT, fontSize: 9, color: COLOR.muted, align: 'right'
  });
  slide.addText(truncate(safe(ctx.companyName, ''), 40).toUpperCase(), {
    x: M, y: SLIDE_H - 0.55, w: 6, h: 0.3,
    fontFace: FONT, fontSize: 9, color: COLOR.muted, charSpacing: 2
  });
  return slide;
}

function kicker(slide, text, color) {
  slide.addText(text.toUpperCase(), {
    x: M, y: 0.6, w: CW, h: 0.32,
    fontFace: FONT, fontSize: 14, color: color || COLOR.muted, bold: true, charSpacing: 3
  });
}

function title(slide, text, opts) {
  opts = opts || {};
  slide.addText(text, {
    x: M, y: opts.y || 1.0, w: CW, h: opts.h || 0.9,
    fontFace: FONT, fontSize: opts.size || 34, color: opts.color || COLOR.ink, bold: true, valign: 'top'
  });
}

function hr(slide, y, x, w, color) {
  slide.addShape('line', { x: x === undefined ? M : x, y: y, w: w === undefined ? CW : w, h: 0, line: { color: color || COLOR.faint, width: 0.75 } });
}

function vr(slide, x, y, h, color) {
  slide.addShape('line', { x: x, y: y, w: 0, h: h, line: { color: color || COLOR.faint, width: 0.75 } });
}

function accentBar(slide, x, y, w, color) {
  slide.addShape('rect', { x: x, y: y, w: w, h: 0.06, fill: { color: color }, line: { type: 'none' } });
}

function quadColor(q) {
  if (/quick/i.test(q)) return COLOR.green;
  if (/projeto/i.test(q)) return COLOR.blue;
  if (/preench/i.test(q)) return COLOR.amber;
  return COLOR.red;
}
function quadRank(q) {
  if (/quick/i.test(q)) return 0;
  if (/projeto/i.test(q)) return 1;
  if (/preench/i.test(q)) return 2;
  return 3;
}
// Ordena a matriz Esforço x Impacto por prioridade real (quadrante, depois impacto alto/esforço
// baixo dentro do quadrante). Esta é a única fonte de ordem de prioridade do relatório: o gráfico,
// a lista de soluções, "Comece por aqui" e "O que vem depois" usam sempre este mesmo ranking,
// calculado a partir dos números de esforço/impacto — nunca de um score à parte.
function prioritizeMatriz(items) {
  return items.slice().sort(function (a, b) {
    const qa = quadRank(a.quadrante), qb = quadRank(b.quadrante);
    if (qa !== qb) return qa - qb;
    const ea = Math.min(5, Math.max(1, num(a.esforco, 3))), eb = Math.min(5, Math.max(1, num(b.esforco, 3)));
    const ia = Math.min(5, Math.max(1, num(a.impacto, 3))), ib = Math.min(5, Math.max(1, num(b.impacto, 3)));
    return (ib - eb) - (ia - ea);
  });
}
function prioridadeScore(it) {
  const e = Math.min(5, Math.max(1, num(it.esforco, 3)));
  const im = Math.min(5, Math.max(1, num(it.impacto, 3)));
  return Math.round(((im - e + 4) / 8) * 100);
}
// Nomes das 5 frentes em português (códigos S1-S5 vêm do JSON do relatório).

const SOLUCAO_PT = {
  S1: 'Captação e Prospecção',
  S2: 'Atendimento e Resposta Rápida',
  S3: 'Funil e Follow-up',
  S4: 'Inteligência de Margem e Conversão',
  S5: 'Pós-venda e Reativação de Carteira'
};
function solucaoNome(codigo, fallback) {
  return SOLUCAO_PT[String(codigo || '').toUpperCase()] || safe(fallback, 'Solução');
}

// ====================================================================
// 01 · Capa
// ====================================================================
function slideCover(ctx, data) {
  const slide = baseSlide(ctx);
  const name = safe(data.companyName, 'Empresa');
  slide.addText('DIAGNÓSTICO DE CRESCIMENTO', {
    x: M, y: 2.3, w: CW, h: 0.35, fontFace: FONT, fontSize: 12, color: COLOR.green, bold: true, charSpacing: 4
  });
  slide.addText(name, {
    x: M, y: 2.75, w: CW, h: 1.6, fontFace: FONT, fontSize: autoSize(name, 60, 36, 24), color: COLOR.ink, bold: true, valign: 'middle'
  });
  accentBar(slide, M, 4.5, 1.4, COLOR.green);
  slide.addText('Onde está o dinheiro parado — e como liberar.', {
    x: M, y: 4.75, w: CW, h: 0.5, fontFace: FONT, fontSize: 20, color: COLOR.muted
  });
  slide.addText(safe(data.date, ''), {
    x: M, y: 6.3, w: CW, h: 0.35, fontFace: FONT, fontSize: 12, color: COLOR.muted
  });
}

// ====================================================================
// 02 · O problema (uma frase)
// ====================================================================
function slideProblema(ctx, data) {
  const slide = baseSlide(ctx);
  const re = (data.part1 && data.part1.resumoExecutivo) || {};
  const text = truncate(safe(re.dor, 'Dor principal não identificada.'), 420);
  kicker(slide, 'O problema', COLOR.orange);
  accentBar(slide, M, 1.05, 1.0, COLOR.orange);
  slide.addText(text, {
    x: M, y: 1.4, w: CW - 1.0, h: 4.9, fontFace: FONT, fontSize: autoSize(text, 32, 20, 140),
    color: COLOR.ink, bold: true, valign: 'middle', lineSpacing: autoSize(text, 42, 28, 140)
  });
}

// ====================================================================
// 03 · O resultado (uma frase)
// ====================================================================
function slideResultado(ctx, data) {
  const slide = baseSlide(ctx);
  const re = (data.part1 && data.part1.resumoExecutivo) || {};
  const text = truncate(safe(re.resultado, 'Resultado esperado não definido.'), 420);
  kicker(slide, 'O resultado', COLOR.green);
  accentBar(slide, M, 1.05, 1.0, COLOR.green);
  slide.addText(text, {
    x: M, y: 1.4, w: CW - 1.0, h: 4.9, fontFace: FONT, fontSize: autoSize(text, 32, 20, 140),
    color: COLOR.ink, bold: true, valign: 'middle', lineSpacing: autoSize(text, 42, 28, 140)
  });
}

// ====================================================================
// 04 · O número (horas por semana)
// ====================================================================
function slideNumero(ctx, data) {
  const slide = baseSlide(ctx);
  const o = (data.part1 && data.part1.oportunidadeRelance) || {};
  const horas = Math.round(num(o.horasSemana, 0));
  kicker(slide, 'O tamanho da oportunidade', COLOR.green);

  slide.addText(String(horas), {
    x: M - 0.1, y: 1.3, w: 6.5, h: 3.2, fontFace: FONT, fontSize: 190, color: COLOR.green, bold: true, valign: 'middle'
  });
  slide.addText('horas por semana', {
    x: M, y: 4.45, w: 6.5, h: 0.5, fontFace: FONT, fontSize: 24, color: COLOR.ink, bold: true
  });
  slide.addText('que hoje somem em retrabalho, espera e apagar incêndio — e podem voltar pro caixa.', {
    x: M, y: 4.95, w: 6.2, h: 0.9, fontFace: FONT, fontSize: 14, color: COLOR.muted, lineSpacing: 19
  });

  vr(slide, 7.7, 1.6, 4.2);
  slide.addText('FOCO PRINCIPAL', {
    x: 8.1, y: 2.0, w: 4.3, h: 0.3, fontFace: FONT, fontSize: 11, color: COLOR.muted, bold: true, charSpacing: 3
  });
  const foco = truncate(safe(o.focoPrincipal, 'A definir'), 90);
  slide.addText(foco, {
    x: 8.1, y: 2.4, w: 4.3, h: 3.0, fontFace: FONT, fontSize: autoSize(foco, 30, 20, 30), color: COLOR.ink, bold: true, valign: 'top', lineSpacing: 36
  });
}

// ====================================================================
// 05 · Onde o tempo e o dinheiro vazam
// ====================================================================
function slideMapaPerda(ctx, data) {
  const slide = baseSlide(ctx);
  kicker(slide, 'Diagnóstico', COLOR.orange);
  title(slide, 'Onde o tempo e o dinheiro vazam');

  const items = ((data.part1 && data.part1.mapaPerdaTempoCusto) || []).slice(0, 5);
  const top = 2.2, bottom = 6.7;
  const n = Math.max(items.length, 1);
  const rowH = (bottom - top) / n;
  const colors = [COLOR.red, COLOR.orange, COLOR.amber, COLOR.blue, COLOR.purple];

  items.forEach(function (it, i) {
    const y = top + i * rowH;
    const c = colors[i % colors.length];
    hr(slide, y);
    slide.addText(String(i + 1).padStart(2, '0'), {
      x: M, y: y + 0.12, w: 0.9, h: 0.5, fontFace: FONT, fontSize: 20, bold: true, color: c
    });
    slide.addText(truncate(safe(it.processo, 'Processo'), 70), {
      x: M + 1.0, y: y + 0.12, w: 7.0, h: 0.45, fontFace: FONT, fontSize: 17, bold: true, color: COLOR.ink, valign: 'top'
    });
    slide.addText(truncate(safe(it.evidencia, ''), 130), {
      x: M + 1.0, y: y + 0.55, w: 7.0, h: Math.max(0.3, rowH - 0.7), fontFace: FONT, fontSize: 11.5, italic: true, color: COLOR.muted, valign: 'top', lineSpacing: 15
    });
    const custo = truncate(safe(it.custoTempo, 'TBD'), 32);
    slide.addText(custo, {
      x: M + 8.2, y: y + 0.1, w: CW - 8.2, h: Math.max(0.5, rowH - 0.25), fontFace: FONT, fontSize: autoSize(custo, 24, 15, 14), bold: true, color: c, align: 'right', valign: 'top'
    });
  });
  hr(slide, bottom);
}

// ====================================================================
// 06 · O custo de não agir
// ====================================================================
function slideConsequencias(ctx, data) {
  const slide = baseSlide(ctx);
  const c = (data.part1 && data.part1.consequenciasNaoAgir) || {};
  kicker(slide, 'Impacto real', COLOR.red);
  title(slide, 'O custo de não agir');

  const cols = [
    { titulo: 'No Caixa e Vendas', text: c.impactoFinanceiro || c.curtoPrazo, color: COLOR.red },
    { titulo: 'Na Operação e Tempo', text: c.impactoOperacional || c.medioPrazo, color: COLOR.orange },
    { titulo: 'No Crescimento e Mercado', text: c.riscoEstrategico || c.longoPrazo, color: COLOR.purple }
  ];
  const y = 2.3, gap = 0.5, cw = (CW - gap * 2) / 3, ch = 4.3;
  cols.forEach(function (col, i) {
    const x = M + i * (cw + gap);
    if (i > 0) vr(slide, x - gap / 2, y, ch);
    accentBar(slide, x, y, 0.8, col.color);
    slide.addText(col.titulo, {
      x: x, y: y + 0.2, w: cw, h: 0.5, fontFace: FONT, fontSize: 20, bold: true, color: col.color
    });
    const t = truncate(safe(col.text, 'TBD'), 330);
    slide.addText(t, {
      x: x, y: y + 0.85, w: cw - 0.2, h: ch - 0.9, fontFace: FONT, fontSize: autoSize(t, 14, 11, 200), color: COLOR.ink, valign: 'top', lineSpacing: autoSize(t, 20, 15, 200)
    });
  });
}

// ====================================================================
// 07 · Matriz Esforço × Impacto (o gráfico)
// ====================================================================
function slideMatriz(ctx, data) {
  const slide = baseSlide(ctx);
  kicker(slide, 'Priorização', COLOR.blue);
  title(slide, 'Esforço × Impacto', { size: 34 });
  slide.addText('Quanto mais alto e mais à esquerda, antes deve ser feito.', {
    x: M, y: 1.75, w: CW, h: 0.35, fontFace: FONT, fontSize: 13, color: COLOR.muted
  });

  const items = prioritizeMatriz(((data.part1 && data.part1.matrizOportunidades) || []).slice(0, 9));
  const gx = 2.6, gy = 2.3, gw = 8.6, gh = 4.1;
  const halfW = gw / 2, halfH = gh / 2;

  slide.addShape('rect', { x: gx, y: gy, w: halfW, h: halfH, fill: { color: '0E2418' }, line: { type: 'none' } });
  slide.addShape('rect', { x: gx + halfW, y: gy, w: halfW, h: halfH, fill: { color: '0E1A2E' }, line: { type: 'none' } });
  slide.addShape('rect', { x: gx, y: gy + halfH, w: halfW, h: halfH, fill: { color: '241F10' }, line: { type: 'none' } });
  slide.addShape('rect', { x: gx + halfW, y: gy + halfH, w: halfW, h: halfH, fill: { color: '261212' }, line: { type: 'none' } });
  hr(slide, gy + halfH, gx, gw, COLOR.faint);
  vr(slide, gx + halfW, gy, gh, COLOR.faint);

  const lab = function (t, x, y, w, c) {
    slide.addText(t, { x: x, y: y, w: w, h: 0.3, fontFace: FONT, fontSize: 10, bold: true, color: c, charSpacing: 2 });
  };
  lab('QUICK WINS', gx + 0.2, gy + 0.12, halfW - 0.4, COLOR.green);
  lab('PROJETOS MAIORES', gx + halfW + 0.2, gy + 0.12, halfW - 0.4, COLOR.blue);
  lab('PREENCHIMENTOS', gx + 0.2, gy + halfH + 0.12, halfW - 0.4, COLOR.amber);
  lab('IGNORAR', gx + halfW + 0.2, gy + halfH + 0.12, halfW - 0.4, COLOR.red);

  slide.addText('← MENOS ESFORÇO (1)', { x: gx, y: gy + gh + 0.08, w: gw / 2, h: 0.3, fontFace: FONT, fontSize: 9, color: COLOR.muted, charSpacing: 1 });
  slide.addText('MAIS ESFORÇO (5) →', { x: gx + gw / 2, y: gy + gh + 0.08, w: gw / 2, h: 0.3, fontFace: FONT, fontSize: 9, color: COLOR.muted, charSpacing: 1, align: 'right' });
  slide.addText('EIXO X: ESFORÇO DE IMPLEMENTAÇÃO', { x: gx, y: gy + gh + 0.28, w: gw, h: 0.25, fontFace: FONT, fontSize: 8, bold: true, color: COLOR.muted, align: 'center' });

  // Eixo Y
  const vw = 3.2, vh = 0.35;
  slide.addText('↑ MAIS IMPACTO (5)  ·  EIXO Y: IMPACTO NO NEGÓCIO  ·  MENOS IMPACTO (1) ↓', {
    x: gx - 0.45 - vw / 2 - vh / 2, y: gy + gh / 2 - vh / 2, w: vw, h: vh,
    fontFace: FONT, fontSize: 8, bold: true, color: COLOR.muted, charSpacing: 1, align: 'center', valign: 'middle', rotate: 270
  });

  // Pontos ficam dentro da grade (não em cima da borda) e, se dois caem no mesmo lugar,
  // o segundo é empurrado pro lado pra continuar legível.
  const d = 0.46, pad = d / 2 + 0.08;
  const placed = [];
  items.forEach(function (it, i) {
    const e = Math.min(5, Math.max(1, num(it.esforco, 3)));
    const im = Math.min(5, Math.max(1, num(it.impacto, 3)));
    let px = gx + pad + ((e - 1) / 4) * (gw - pad * 2) - d / 2;
    let py = gy + pad + ((5 - im) / 4) * (gh - pad * 2) - d / 2;
    let tries = 0;
    while (tries < 8 && placed.some(function (p) { return Math.abs(p.x - px) < d && Math.abs(p.y - py) < d; })) {
      px += d * 0.95;
      if (px + d > gx + gw) { px = gx + pad; py += d * 0.95; }
      tries++;
    }
    placed.push({ x: px, y: py });
    const col = quadColor(it.quadrante);
    slide.addShape('ellipse', { x: px, y: py, w: d, h: d, fill: { color: col }, line: { color: COLOR.bg, width: 2 } });
    slide.addText(String(i + 1), { x: px, y: py, w: d, h: d, fontFace: FONT, fontSize: 13, bold: true, color: COLOR.bg, align: 'center', valign: 'middle' });
  });
}

// ====================================================================
// 08 · Detalhamento dos pontos (paginado, 6 por slide)
// ====================================================================
function slidesMatrizDetalhe(ctx, data) {
  const items = prioritizeMatriz(((data.part1 && data.part1.matrizOportunidades) || []).slice(0, 9));
  const perPage = 6;
  const pages = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  if (!pages.length) pages.push([]);
  pages.forEach(function (pageItems, p) {
    slideMatrizDetalhePagina(ctx, pageItems, p * perPage, pages.length > 1 ? (p + 1) + ' de ' + pages.length : null);
  });
}

function slideMatrizDetalhePagina(ctx, items, startIndex, pageLabel) {
  const slide = baseSlide(ctx);
  kicker(slide, 'Priorização' + (pageLabel ? ' · ' + pageLabel : ''), COLOR.blue);
  title(slide, 'Soluções recomendadas');

  const top = 2.15, bottom = 6.75;
  const gap = 0.6;
  const colW = (CW - gap) / 2;
  const colX = [M, M + colW + gap];
  const rows = 3;
  const rowH = (bottom - top) / rows;

  items.forEach(function (it, i) {
    const col = i < rows ? 0 : 1;
    const row = i < rows ? i : i - rows;
    const x = colX[col];
    const y = top + row * rowH;
    const c = quadColor(it.quadrante);
    const e = Math.min(5, Math.max(1, num(it.esforco, 3)));
    const im = Math.min(5, Math.max(1, num(it.impacto, 3)));

    hr(slide, y, x, colW);
    slide.addShape('ellipse', { x: x, y: y + 0.16, w: 0.34, h: 0.34, fill: { color: c }, line: { type: 'none' } });
    slide.addText(String(startIndex + i + 1), { x: x, y: y + 0.16, w: 0.34, h: 0.34, fontFace: FONT, fontSize: 11, bold: true, color: COLOR.bg, align: 'center', valign: 'middle' });

    const tagW = 1.9;
    slide.addText(truncate(safe(it.label, 'Item'), 48), {
      x: x + 0.48, y: y + 0.12, w: colW - 0.48, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: COLOR.ink, valign: 'top'
    });

    // Ferramenta: a recomendação concreta. Teal, grande, sempre na mesma posição do card.
    slide.addText('⚙  ' + truncate(safe(it.ferramentaOuAcao, 'a definir'), 52).replace(/\//g, '/​'), {
      x: x + 0.48, y: y + 0.52, w: colW - 0.48, h: 0.34, fontFace: FONT, fontSize: 12.5, bold: true, color: COLOR.teal, valign: 'top'
    });

    slide.addText(truncate(safe(it.porque, ''), 140), {
      x: x + 0.48, y: y + 0.88, w: colW - 0.48 - tagW - 0.1, h: rowH - 1.0, fontFace: FONT, fontSize: 10, color: COLOR.muted, valign: 'top', lineSpacing: 13
    });
    slide.addText(safe(it.quadrante, '').toUpperCase() + '\nE' + e + ' · I' + im, {
      x: x + colW - tagW, y: y + 0.92, w: tagW, h: 0.45, fontFace: FONT, fontSize: 7.5, bold: true, color: c, charSpacing: 1, align: 'right', valign: 'top', lineSpacing: 11
    });
  });
}

// ====================================================================
// 09 · A resposta (solução prioritária)
// ====================================================================
function slideResposta(ctx, data) {
  const slide = baseSlide(ctx);
  const matriz = prioritizeMatriz(((data.part1 && data.part1.matrizOportunidades) || []).slice(0, 9));
  const top = matriz[0] || {};
  const topScore = prioridadeScore(top);

  kicker(slide, 'A resposta', COLOR.teal);
  slide.addText('Comece por aqui.', {
    x: M, y: 1.0, w: CW, h: 0.8, fontFace: FONT, fontSize: 34, bold: true, color: COLOR.ink
  });

  const nome = truncate(safe(top.label, 'Item'), 60);
  slide.addText(nome, {
    x: M, y: 2.2, w: 8.4, h: 1.5, fontFace: FONT, fontSize: autoSize(nome, 40, 26, 30), bold: true, color: COLOR.teal, valign: 'middle', lineSpacing: 46
  });
  slide.addText(truncate(safe(top.porque, ''), 160), {
    x: M, y: 3.8, w: 8.0, h: 1.0, fontFace: FONT, fontSize: 15, color: COLOR.ink, valign: 'top', lineSpacing: 21
  });

  slide.addText(String(topScore), {
    x: 9.6, y: 1.9, w: 3.0, h: 1.9, fontFace: FONT, fontSize: 110, bold: true, color: COLOR.teal, align: 'right', valign: 'middle'
  });
  slide.addText('/ 100 · SCORE DE PRIORIDADE', {
    x: 9.0, y: 3.8, w: 3.6, h: 0.3, fontFace: FONT, fontSize: 9, bold: true, color: COLOR.muted, align: 'right', charSpacing: 2
  });
}

// ====================================================================
// 10 · Scoring das 7 soluções
// ====================================================================
function slideScoring(ctx, data) {
  const slide = baseSlide(ctx);
  kicker(slide, 'Seu plano', COLOR.blue);
  title(slide, 'O que vem depois');

  const matriz = prioritizeMatriz(((data.part1 && data.part1.matrizOportunidades) || []).slice(0, 9));
  const items = matriz.slice(1).map(function (it) {
    return { numero: 0, nome: safe(it.label, 'Item'), score: prioridadeScore(it), quadrante: it.quadrante };
  });

  const top = 2.05, rowH = 0.47;
  const nameX = M, nameW = 4.3, trackX = M + 4.5, trackW = 5.6, scoreX = M + 10.3, scoreW = 1.2;

  items.forEach(function (it, i) {
    const y = top + i * rowH;
    const col = quadColor(it.quadrante);
    slide.addText(String(i + 2).padStart(2, '0') + '  ' + truncate(it.nome, 38), {
      x: nameX, y: y, w: nameW, h: rowH - 0.1, fontFace: FONT, fontSize: 13, bold: false, color: COLOR.muted, valign: 'middle'
    });
    slide.addShape('rect', { x: trackX, y: y + 0.17, w: trackW, h: 0.1, fill: { color: COLOR.faint }, line: { type: 'none' } });
    slide.addShape('rect', { x: trackX, y: y + 0.17, w: Math.max(0.04, (it.score / 100) * trackW), h: 0.1, fill: { color: col }, line: { type: 'none' } });
    slide.addText(String(Math.round(it.score)), {
      x: scoreX, y: y, w: scoreW, h: rowH - 0.1, fontFace: FONT, fontSize: 16, bold: false, color: COLOR.muted, align: 'right', valign: 'middle'
    });
  });
}

// ====================================================================
// 14 · Plano de 5 dias (linha do tempo)
// ====================================================================
function slidePlano5Dias(ctx, data) {
  const slide = baseSlide(ctx);
  kicker(slide, 'Plano de ação', COLOR.green);
  title(slide, 'Cinco dias. Cinco entregas.');

  const dias = ((data.part2 && data.part2.planoQuickWins5Dias) || []).slice(0, 5);
  const n = Math.max(dias.length, 1);
  const gap = 0.35;
  const colW = (CW - gap * (n - 1)) / n;
  const lineY = 2.55;

  hr(slide, lineY, M, CW, COLOR.faint);
  dias.forEach(function (d, i) {
    const x = M + i * (colW + gap);
    slide.addShape('ellipse', { x: x, y: lineY - 0.09, w: 0.18, h: 0.18, fill: { color: COLOR.green }, line: { type: 'none' } });
    slide.addText('DIA ' + safe(d.dia, i + 1), {
      x: x, y: lineY - 0.55, w: colW, h: 0.35, fontFace: FONT, fontSize: 11, bold: true, color: COLOR.green, charSpacing: 3
    });
    slide.addText(truncate(safe(d.tarefa, ''), 95), {
      x: x, y: lineY + 0.35, w: colW, h: 1.75, fontFace: FONT, fontSize: 13, color: COLOR.ink, valign: 'top', lineSpacing: 18
    });
    slide.addText('FERRAMENTA', {
      x: x, y: lineY + 2.2, w: colW, h: 0.25, fontFace: FONT, fontSize: 8, bold: true, color: COLOR.teal, charSpacing: 3
    });
    slide.addText(truncate(safe(d.ferramentaOuAcao, 'a definir'), 90).replace(/\//g, '/​'), {
      x: x, y: lineY + 2.48, w: colW, h: 1.5, fontFace: FONT, fontSize: 12.5, bold: true, color: COLOR.teal, valign: 'top', lineSpacing: 16
    });
  });
}

// ====================================================================
// 15 · Depois dos quick wins
// ====================================================================
function slideDepois(ctx, data) {
  const slide = baseSlide(ctx);
  kicker(slide, 'Plano de ação', COLOR.blue);
  title(slide, 'E depois da primeira semana');
  const items = ((data.part2 && data.part2.depoisDosQuickWins) || []).slice(0, 4);
  const top = 2.2, bottom = 6.7;
  const n = Math.max(items.length, 1);
  const rowH = (bottom - top) / n;
  items.forEach(function (it, i) {
    const y = top + i * rowH;
    hr(slide, y);
    slide.addText(String(i + 1).padStart(2, '0'), {
      x: M, y: y + 0.15, w: 0.9, h: 0.6, fontFace: FONT, fontSize: 22, bold: true, color: COLOR.blue
    });
    slide.addText(truncate(safe(it.titulo, 'Item'), 70), {
      x: M + 1.0, y: y + 0.15, w: CW - 1.0, h: 0.45, fontFace: FONT, fontSize: 18, bold: true, color: COLOR.ink, valign: 'top'
    });
    slide.addText(truncate(safe(it.descricao, ''), 150), {
      x: M + 1.0, y: y + 0.62, w: CW - 1.5, h: Math.max(0.3, rowH - 0.75), fontFace: FONT, fontSize: 12.5, color: COLOR.muted, valign: 'top', lineSpacing: 17
    });
  });
  hr(slide, bottom);
}

// ====================================================================
// Motor de valor e preço
// ====================================================================
// Valor total = horas recuperadas + risco evitado + receita atribuída (com atribuição ≤ 30%).
// Preço-alvo = valor ÷ 2 (conservador) × 10% (ROI 10:1 sobre o conservador) ÷ 12,
// travado na faixa que o entrevistado declarou que pagaria.
// A maturidade de medição decide quanto do preço é fixo e quando o variável começa a contar:
// sem baseline confiável não existe success fee que se sustente.
const MATURIDADE = {
  feeling:     { basePct: 0.70, variavelPct: 0.30, mesAtivacao: 4, rotulo: 'Sem indicadores hoje',        nota: 'Meses 1–3 constroem o baseline. O variável só conta depois que a régua existe.' },
  parcial:     { basePct: 0.50, variavelPct: 0.50, mesAtivacao: 2, rotulo: 'Indicadores parciais',        nota: 'Há registro, mas precisa ser validado no mês 1 antes de virar meta.' },
  estruturada: { basePct: 0.30, variavelPct: 0.70, mesAtivacao: 1, rotulo: 'Indicadores estruturados',    nota: 'O baseline é do cliente e já é confiável — dá pra apostar no resultado desde o início.' }
};

function computeValor(data) {
  const f = (data.part2 && data.part2.impactoFinanceiro) || {};
  const horasMes = num(f.valorRecuperadoMensal, 0);
  const risco = num(f.riscoEvitadoAnual && f.riscoEvitadoAnual.valor, 0);
  const rec = f.receitaAtribuidaAnual || {};
  const atribPct = Math.min(30, Math.max(0, num(rec.atribuicaoPct, 0)));
  const receita = rec.valor !== undefined && rec.valor !== null ? num(rec.valor, 0) : num(rec.valorBruto, 0) * atribPct / 100;
  const total = num(f.valorTotalAnual, 0) || (horasMes * 12 + risco + receita);
  return {
    horasAnual: horasMes * 12, horasMes: horasMes, horasSemana: num(f.horasRecuperadasSemana, 0),
    risco: risco, riscoEvidencia: safe(f.riscoEvitadoAnual && f.riscoEvitadoAnual.evidencia, ''),
    receita: receita, receitaBruta: num(rec.valorBruto, 0), atribPct: atribPct, receitaEvidencia: safe(rec.evidencia, ''),
    total: total, custoFerramentas: num(f.custoFerramentasMensal, 0), custoHora: num(f.custoHora, 0)
  };
}

function computePricing(data) {
  const p1 = data.part1 || {};
  const v = computeValor(data);
  const mat = MATURIDADE[String(p1.maturidadeMedicao || '').toLowerCase()] || MATURIDADE.feeling;
  const conservador = v.total / 2;
  const anual = conservador * 0.10;
  const alvoCalculado = anual / 12;
  const wtpMin = num(p1.wtpMensalMin, 0), wtpMax = num(p1.wtpMensalMax, 0);
  let alvo = alvoCalculado;
  let ajuste = null;
  if (wtpMax > 0 && alvo > wtpMax) { alvo = wtpMax; ajuste = 'teto'; }
  else if (wtpMin > 0 && alvo < wtpMin) { alvo = wtpMin; ajuste = 'piso'; }
  return {
    valor: v, mat: mat, maturidadeKey: MATURIDADE[String(p1.maturidadeMedicao || '').toLowerCase()] ? String(p1.maturidadeMedicao).toLowerCase() : 'feeling',
    conservador: conservador, anual: anual, alvoCalculado: alvoCalculado, alvo: alvo, ajuste: ajuste,
    wtpMin: wtpMin, wtpMax: wtpMax,
    setup: alvo, base: alvo * mat.basePct, variavel: alvo * mat.variavelPct,
    diy: alvo * 0.4, dwy: alvo, dfy: alvo * 2,
    temValor: v.total > 0
  };
}

function brlK(n) {
  n = num(n, 0);
  if (Math.abs(n) >= 1000000) return 'R$ ' + (n / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
  if (Math.abs(n) >= 1000) return 'R$ ' + Math.round(n / 1000).toLocaleString('pt-BR') + ' mil';
  return brl(n);
}

// ====================================================================
// 16 · Impacto financeiro (três frentes de valor)
// ====================================================================
function slideImpactoFinanceiro(ctx, data) {
  const slide = baseSlide(ctx);
  const v = computeValor(data);
  kicker(slide, 'Impacto financeiro', COLOR.green);

  const hero = brlK(v.total);
  slide.addText(hero, {
    x: M - 0.05, y: 1.0, w: CW, h: 1.9, fontFace: FONT, fontSize: autoSize(hero, 110, 64, 12), bold: true, color: COLOR.green, valign: 'middle'
  });
  slide.addText('por ano em jogo — somando o que se recupera, o que se evita e o que se ganha.', {
    x: M, y: 2.95, w: CW - 1, h: 0.5, fontFace: FONT, fontSize: 17, color: COLOR.ink
  });

  hr(slide, 3.75);
  const fronts = [
    { label: 'RECUPERA', value: brlK(v.horasAnual), sub: Math.round(v.horasSemana) + ' h/semana × R$ ' + Math.round(v.custoHora).toLocaleString('pt-BR') + '/h', ev: '', color: COLOR.green },
    { label: 'EVITA', value: v.risco > 0 ? brlK(v.risco) : '—', sub: v.risco > 0 ? 'risco concreto citado na entrevista' : 'nenhuma perda quantificada na entrevista', ev: v.riscoEvidencia, color: COLOR.orange },
    { label: 'GANHA', value: v.receita > 0 ? brlK(v.receita) : '—', sub: v.receita > 0 ? Math.round(v.atribPct) + '% de ' + brlK(v.receitaBruta) + ' que hoje não chegam' : 'nenhuma receita perdida quantificada', ev: v.receitaEvidencia, color: COLOR.blue }
  ];
  const gap = 0.5, cw = (CW - gap * 2) / 3, y = 3.95;
  fronts.forEach(function (fr, i) {
    const x = M + i * (cw + gap);
    if (i > 0) vr(slide, x - gap / 2, y, 2.5);
    slide.addText(fr.label, { x: x, y: y, w: cw, h: 0.28, fontFace: FONT, fontSize: 9, bold: true, color: fr.color, charSpacing: 3 });
    slide.addText(fr.value, { x: x, y: y + 0.3, w: cw, h: 0.75, fontFace: FONT, fontSize: autoSize(fr.value, 34, 22, 12), bold: true, color: COLOR.ink, valign: 'top' });
    slide.addText(truncate(fr.sub, 60), { x: x, y: y + 1.08, w: cw - 0.2, h: 0.5, fontFace: FONT, fontSize: 11, color: COLOR.muted, valign: 'top', lineSpacing: 14 });
    if (fr.ev) {
      slide.addText('“' + truncate(fr.ev, 110) + '”', { x: x, y: y + 1.6, w: cw - 0.2, h: 0.85, fontFace: FONT, fontSize: 10, italic: true, color: COLOR.muted, valign: 'top', lineSpacing: 13 });
    }
  });

  slide.addText('Custo estimado das ferramentas: ' + brl(v.custoFerramentas) + '/mês  ·  Receita atribuída é estimativa conservadora, não promessa.', {
    x: M, y: 6.55, w: CW, h: 0.3, fontFace: FONT, fontSize: 9.5, color: COLOR.muted
  });
}

// ====================================================================
// 16b · Como cobramos (a conta na mesa)
// ====================================================================
function slidePreco(ctx, data) {
  const slide = baseSlide(ctx);
  const p = computePricing(data);
  kicker(slide, 'A oferta', COLOR.teal);
  title(slide, 'Como chegamos no preço');
  slide.addShape('roundRect', { x: M + CW - 2.6, y: 0.55, w: 2.6, h: 0.36, rectRadius: 0.18, fill: { color: COLOR.amber }, line: { type: 'none' } });
  slide.addText('PROPOSTA RECOMENDADA', {
    x: M + CW - 2.6, y: 0.55, w: 2.6, h: 0.36, fontFace: FONT, fontSize: 9, bold: true, color: '#ffffff', align: 'center', valign: 'middle', charSpacing: 1
  });

  // Cadeia da conta: valor → conservador → 10% → mensal
  const steps = [
    { label: 'VALOR ANUAL EM JOGO', value: brlK(p.valor.total), note: 'três frentes somadas' },
    { label: '÷ 2', value: brlK(p.conservador), note: 'só metade conta: atribuição e incerteza' },
    { label: '× 10%', value: brlK(p.anual), note: 'você fica com 90% do ganho' },
    { label: '÷ 12', value: brlK(p.alvoCalculado), note: 'preço-alvo por mês' }
  ];
  const y = 2.05, sw = CW / 4;
  steps.forEach(function (s, i) {
    const x = M + i * sw;
    if (i > 0) slide.addText('→', { x: x - 0.45, y: y + 0.35, w: 0.4, h: 0.5, fontFace: FONT, fontSize: 22, color: COLOR.faint, align: 'center', valign: 'middle' });
    if (i === 3) {
      slide.addShape('roundRect', { x: x - 0.15, y: y - 0.15, w: sw - 0.25, h: 1.5, rectRadius: 0.08, fill: { color: 'FFFAF0' }, line: { color: COLOR.amber, width: 1.5 } });
    }
    slide.addText(s.label, { x: x, y: y, w: sw - 0.5, h: 0.28, fontFace: FONT, fontSize: 9, bold: true, color: COLOR.muted, charSpacing: 2 });
    slide.addText(s.value, { x: x, y: y + 0.3, w: sw - 0.5, h: 0.65, fontFace: FONT, fontSize: autoSize(s.value, 28, 20, 12), bold: true, color: i === 3 ? COLOR.teal : COLOR.ink, valign: 'top' });
    slide.addText(s.note, { x: x, y: y + 0.95, w: sw - 0.5, h: 0.45, fontFace: FONT, fontSize: 10, color: COLOR.muted, valign: 'top', lineSpacing: 13 });
  });

  hr(slide, 3.75);

  // Ancoragem no que o cliente disse que paga
  let ancor;
  if (p.ajuste === 'teto') ancor = 'Faixa declarada na entrevista: ' + brl(p.wtpMin) + '–' + brl(p.wtpMax) + '/mês. A conta passa do teto — proposta ancorada em ' + brl(p.alvo) + ', com a conta na mesa pra negociar acima.';
  else if (p.ajuste === 'piso') ancor = 'Faixa declarada na entrevista: ' + brl(p.wtpMin) + '–' + brl(p.wtpMax) + '/mês. A conta fica abaixo do piso — proposta ancorada em ' + brl(p.alvo) + '.';
  else if (p.wtpMax > 0) ancor = 'Dentro da faixa declarada na entrevista (' + brl(p.wtpMin) + '–' + brl(p.wtpMax) + '/mês).';
  else ancor = 'O entrevistado não declarou faixa de investimento — o preço-alvo segue a conta.';
  slide.addText(ancor, { x: M, y: 3.9, w: CW, h: 0.5, fontFace: FONT, fontSize: 12, color: COLOR.ink, valign: 'top', lineSpacing: 16 });

  // Estrutura recorrente
  const y2 = 4.6;
  const cols = [
    { label: 'SETUP · UMA VEZ', value: brl(p.setup), note: 'implementação dos 5 dias', color: COLOR.purple },
    { label: 'BASE · TODO MÊS', value: brl(p.base), note: Math.round(p.mat.basePct * 100) + '% do alvo — ferramentas, fluxo e acompanhamento', color: COLOR.teal },
    { label: 'VARIÁVEL · A PARTIR DO MÊS ' + p.mat.mesAtivacao, value: 'até ' + brl(p.variavel), note: Math.round(p.mat.variavelPct * 100) + '% do alvo — só com resultado acima da meta', color: COLOR.green }
  ];
  const gap = 0.5, cw = (CW - gap * 2) / 3;
  cols.forEach(function (c, i) {
    const x = M + i * (cw + gap);
    if (i > 0) vr(slide, x - gap / 2, y2, 1.7);
    slide.addText(c.label, { x: x, y: y2, w: cw, h: 0.28, fontFace: FONT, fontSize: 9, bold: true, color: c.color, charSpacing: 2 });
    slide.addText(c.value, { x: x, y: y2 + 0.3, w: cw, h: 0.65, fontFace: FONT, fontSize: 28, bold: true, color: COLOR.ink, valign: 'top' });
    slide.addText(c.note, { x: x, y: y2 + 0.98, w: cw - 0.2, h: 0.6, fontFace: FONT, fontSize: 10.5, color: COLOR.muted, valign: 'top', lineSpacing: 14 });
  });

  slide.addText(p.mat.rotulo.toUpperCase() + '  ·  ' + p.mat.nota, {
    x: M, y: 6.45, w: CW, h: 0.4, fontFace: FONT, fontSize: 10, bold: false, color: COLOR.muted
  });
}

// ====================================================================
// 17 · Três formas de fazer (níveis)
// ====================================================================
function slideNiveis(ctx, data) {
  const slide = baseSlide(ctx);
  kicker(slide, 'A oferta', COLOR.teal);
  title(slide, 'Três formas de fazer');
  const niveis = (data.part3 && data.part3.niveis) || {};
  const p = computePricing(data);
  const precoDe = function (key, aiPreco) {
    if (!p.temValor) return truncate(safe(aiPreco, 'TBD'), 32);
    return brl(p[key]) + '/mês';
  };
  const cols = [
    { key: 'diy', label: 'DIY', sub: 'Você opera, com suporte', color: COLOR.purple },
    { key: 'dwy', label: 'DWY', sub: 'Fazemos junto', color: COLOR.blue },
    { key: 'dfy', label: 'DFY', sub: 'Nós assumimos tudo', color: COLOR.teal }
  ];
  const y = 2.3, gap = 0.5, cw = (CW - gap * 2) / 3, ch = 4.3;
  cols.forEach(function (c, i) {
    const x = M + i * (cw + gap);
    const nv = niveis[c.key] || {};
    if (i > 0) vr(slide, x - gap / 2, y, ch);
    slide.addText(c.label, { x: x, y: y, w: cw, h: 0.8, fontFace: FONT, fontSize: 44, bold: true, color: c.color });
    slide.addText(c.sub, { x: x, y: y + 0.8, w: cw, h: 0.35, fontFace: FONT, fontSize: 12, color: COLOR.muted });
    const desc = truncate(safe(nv.descricao, ''), 240);
    slide.addText(desc, { x: x, y: y + 1.35, w: cw - 0.2, h: ch - 2.2, fontFace: FONT, fontSize: autoSize(desc, 13, 11, 160), color: COLOR.ink, valign: 'top', lineSpacing: 18 });
    const preco = precoDe(c.key, nv.preco);
    hr(slide, y + ch - 0.75, x, 0.8, c.color);
    slide.addText(preco, { x: x, y: y + ch - 0.6, w: cw, h: 0.5, fontFace: FONT, fontSize: 18, bold: true, color: c.color, valign: 'top' });
    if (p.temValor && c.key === 'dwy') {
      slide.addText('setup ' + brl(p.setup) + ' · variável a partir do mês ' + p.mat.mesAtivacao, { x: x, y: y + ch - 0.15, w: cw, h: 0.25, fontFace: FONT, fontSize: 9, color: COLOR.muted });
    }
  });
}

// ====================================================================
// 18 · Garantia condicional
// ====================================================================
function slideGarantia(ctx, data) {
  const slide = baseSlide(ctx);
  const g = (data.part3 && data.part3.garantiaCondicional) || {};
  kicker(slide, 'A oferta', COLOR.teal);
  title(slide, 'Garantia condicional');

  const p = computePricing(data);
  const ativacao = p.mat.mesAtivacao === 1
    ? 'Desde o mês 1, sobre o baseline já registrado pelo cliente.'
    : 'A partir do mês ' + p.mat.mesAtivacao + ', após ' + ((p.mat.mesAtivacao - 1) * 30) + ' dias de baseline registrado no painel. Antes disso, só a base mensal.';
  const rows = [
    ['Resultado esperado', g.resultadoEsperado],
    ['Prazo de avaliação', g.prazo],
    ['Pré-requisitos do cliente', g.prerequisitos],
    ['Métrica objetiva', g.metricaObjetiva],
    ['Ativação do variável', ativacao],
    ['Elegibilidade', g.elegibilidade],
    ['Fora do escopo', g.limiteEscopo]
  ];
  const top = 2.15, bottom = 6.75;
  const rowH = (bottom - top) / rows.length;
  rows.forEach(function (r, i) {
    const y = top + i * rowH;
    hr(slide, y);
    slide.addText(r[0].toUpperCase(), {
      x: M, y: y + 0.12, w: 3.2, h: rowH - 0.2, fontFace: FONT, fontSize: 9.5, bold: true, color: COLOR.teal, charSpacing: 2, valign: 'top', lineSpacing: 13
    });
    const t = truncate(safe(r[1], 'TBD'), 200);
    slide.addText(t, {
      x: M + 3.4, y: y + 0.1, w: CW - 3.4, h: rowH - 0.18, fontFace: FONT, fontSize: autoSize(t, 12.5, 10, 120), color: COLOR.ink, valign: 'top', lineSpacing: 16
    });
  });
  hr(slide, bottom);
}

// ====================================================================
// 19 · Próximo passo
// ====================================================================
function slideFechamento(ctx, data) {
  const slide = baseSlide(ctx);
  const dias = ((data.part2 && data.part2.planoQuickWins5Dias) || []);
  const dia1 = dias[0] || {};
  kicker(slide, 'Próximo passo', COLOR.green);
  slide.addText('Vamos começar pelo Dia 1.', {
    x: M, y: 1.9, w: CW, h: 1.2, fontFace: FONT, fontSize: 48, bold: true, color: COLOR.ink, valign: 'middle'
  });
  accentBar(slide, M, 3.25, 1.4, COLOR.green);
  slide.addText(truncate(safe(dia1.tarefa, ''), 120), {
    x: M, y: 3.5, w: CW - 2, h: 0.9, fontFace: FONT, fontSize: 20, color: COLOR.ink, valign: 'top', lineSpacing: 27
  });
  slide.addText(truncate(safe(dia1.ferramentaOuAcao, ''), 90), {
    x: M, y: 4.45, w: CW - 2, h: 0.5, fontFace: FONT, fontSize: 15, bold: true, color: COLOR.teal
  });

  const boxY = 4.95, boxH = 1.85;
  slide.addShape('roundRect', { x: M - 0.3, y: boxY, w: CW + 0.6, h: boxH, rectRadius: 0.1, fill: { color: COLOR.amber, transparency: 92 }, line: { color: COLOR.amber, width: 1, transparency: 55 } });

  slide.addText('COMO ISSO FUNCIONA NA PRÁTICA', {
    x: M, y: boxY + 0.2, w: CW, h: 0.28, fontFace: FONT, fontSize: 10, bold: true, color: COLOR.amber, charSpacing: 2
  });

  const flowText = 'Conectar dados  →  Analisar automaticamente  →  Encontrar vazamentos  →  Priorizar pelo impacto  →  Entregar o fix  →  Executar';
  slide.addText(flowText, {
    x: M, y: boxY + 0.55, w: CW, h: 0.4, fontFace: FONT, fontSize: 11, bold: true, color: COLOR.muted, valign: 'middle'
  });

  const waUrl = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Olá! Quero implementar o diagnóstico de crescimento com vocês!');
  slide.addShape('roundRect', { x: M, y: boxY + 1.1, w: 4.6, h: 0.55, rectRadius: 0.28, fill: { color: COLOR.green }, line: { type: 'none' } });
  slide.addText('Falar com a gente no WhatsApp →', {
    x: M, y: boxY + 1.1, w: 4.6, h: 0.55, fontFace: FONT, fontSize: 13, bold: true, color: COLOR.bg, align: 'center', valign: 'middle',
    hyperlink: { url: waUrl }
  });
}

// ====================================================================
// 20 · Privacidade, LGPD e Termos de Uso
// ====================================================================
function slideLegal(ctx, data) {
  const slide = baseSlide(ctx);
  kicker(slide, 'Informações legais', COLOR.muted);
  title(slide, 'Privacidade, LGPD e Termos de Uso', { size: 26 });

  const blocks = [
    {
      h: 'Privacidade e LGPD (Lei nº 13.709/2018)',
      t: 'As informações e respostas fornecidas na entrevista são usadas exclusivamente para gerar este diagnóstico e a proposta correspondente — não são vendidas nem compartilhadas com terceiros para outras finalidades. É possível pedir acesso, correção ou exclusão dos dados a qualquer momento.'
    },
    {
      h: 'Independência e imparcialidade',
      t: 'As recomendações são baseadas exclusivamente nas informações da entrevista. Não há comissionamento ou vínculo comercial que influencie a indicação de uma ferramenta, módulo ou fornecedor específico em detrimento de outro.'
    },
    {
      h: 'Termos de uso',
      t: 'Valores de horas, receita e custo evitado são estimativas — não constituem garantia de resultado. Este relatório é de uso exclusivo da empresa destinatária e não deve ser redistribuído sem autorização.'
    }
  ];
  const top = 1.9, gap = 0.35, h = (6.6 - top - gap * 2) / 3;
  blocks.forEach(function (b, i) {
    const y = top + i * (h + gap);
    accentBar(slide, M, y, 0.9, COLOR.muted);
    slide.addText(b.h, { x: M, y: y + 0.15, w: CW, h: 0.3, fontFace: FONT, fontSize: 13, bold: true, color: COLOR.ink });
    const t = truncate(b.t, 320);
    slide.addText(t, { x: M, y: y + 0.5, w: CW - 1.0, h: h - 0.55, fontFace: FONT, fontSize: 11, color: COLOR.muted, valign: 'top', lineSpacing: 15 });
  });
}

// ====================================================================
async function buildPptx(data) {
  const pptx = newDeck();
  const matrizItems = ((data.part1 && data.part1.matrizOportunidades) || []).slice(0, 9).length;
  const detalhePages = Math.max(1, Math.ceil(matrizItems / 6));
  const ctx = { pptx: pptx, index: 0, total: 20 + detalhePages, companyName: data.companyName };

  slideCover(ctx, data);
  slideProblema(ctx, data);
  slideResultado(ctx, data);
  slideNumero(ctx, data);
  slideMapaPerda(ctx, data);
  slideConsequencias(ctx, data);
  slideMatriz(ctx, data);
  slidesMatrizDetalhe(ctx, data);
  slideResposta(ctx, data);
  slideScoring(ctx, data);
  slidePlano5Dias(ctx, data);
  slideDepois(ctx, data);
  slideImpactoFinanceiro(ctx, data);
  slidePreco(ctx, data);
  slideNiveis(ctx, data);
  slideGarantia(ctx, data);
  slideFechamento(ctx, data);
  slideLegal(ctx, data);
  return pptx.write({ outputType: 'nodebuffer' });
}

module.exports = { buildPptx, computeValor, computePricing, solucaoNome, prioritizeMatriz, prioridadeScore, MATURIDADE, brl, brlK };
