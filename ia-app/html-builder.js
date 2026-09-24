// Gera a apresentação como uma página HTML única (landing), com a mesma narrativa do deck:
// problema → resultado → número → onde vaza → custo de não agir → matriz → resposta → oferta → próximo passo.
const { computeValor, computePricing, solucaoNome, brl, brlK } = require('./pptx-builder');

function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function safe(v, fb) { return (v === undefined || v === null || v === '') ? (fb || 'TBD') : v; }
function num(v, fb) { const n = typeof v === 'number' ? v : parseFloat(v); return isNaN(n) ? (fb || 0) : n; }
function clamp(v) { return Math.min(5, Math.max(1, num(v, 3))); }

function quadClass(q) {
  if (/quick/i.test(q)) return 'green';
  if (/projeto/i.test(q)) return 'blue';
  if (/preench/i.test(q)) return 'amber';
  return 'red';
}
function scoreClass(s) {
  if (s >= 85) return 'teal';
  if (s >= 70) return 'green';
  if (s >= 50) return 'blue';
  if (s >= 30) return 'amber';
  return 'red';
}

const CSS = `
:root{--navy:#0f3460;--navy-2:#144172;--navy-deep:#0a2547;--footer:#071a33;--amber:#f2a900;--amber-2:#c98700;--amber-hover:#ffbb1f;--amber-soft:#fffaf0;
--bg:#ffffff;--paper:#f6f7f9;--ink:#16202c;--muted:#4a5566;--faint:#dfe4ec;
--orange:#c98700;--green:#1f8a4c;--blue:#0f3460;--purple:#144172;--red:#b64a3c;--teal:#c98700;
--display:'Bricolage Grotesque','Montserrat','Arial Black',sans-serif;--body:'IBM Plex Sans','Segoe UI',Arial,sans-serif;--mono:'IBM Plex Mono',Consolas,monospace}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);line-height:1.6;-webkit-font-smoothing:antialiased}
section{padding:80px 24px;max-width:1180px;margin:0 auto;border-bottom:1px solid var(--faint)}
section:last-of-type{border-bottom:0}
.dark{background:var(--navy);color:#fff;position:relative;overflow:hidden}
.dark::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.055) 1px,transparent 1px);background-size:48px 48px;-webkit-mask-image:radial-gradient(ellipse at 30% 20%,#000 30%,transparent 75%);mask-image:radial-gradient(ellipse at 30% 20%,#000 30%,transparent 75%);pointer-events:none}
.dark::after{content:'';position:absolute;top:-160px;right:-120px;width:520px;height:520px;background:radial-gradient(circle,rgba(242,169,0,.22),transparent 65%);pointer-events:none}
.dark section{border-bottom:0;position:relative;z-index:1}
.dark h1,.dark h2,.dark .big{color:#fff}.dark .muted,.dark .lead{color:#c9d6e8}.dark .kicker{color:var(--amber)}.dark .kicker::before{background:var(--amber)}
.kicker{font-family:var(--mono);font-weight:500;font-size:.72rem;letter-spacing:.13em;text-transform:uppercase;color:var(--amber-2);margin:0 0 18px;display:flex;align-items:center;gap:10px}
.kicker::before{content:'';width:22px;height:2px;background:var(--amber);flex:none}
.kicker.orange,.kicker.green,.kicker.blue,.kicker.purple,.kicker.teal,.kicker.red{color:var(--amber-2)}
h1{font-family:var(--display);font-size:clamp(2.3rem,5.2vw,4rem);line-height:1.05;letter-spacing:-.03em;margin:0 0 20px;font-weight:800;color:var(--navy-deep)}
h2{font-family:var(--display);font-size:clamp(1.8rem,3.4vw,2.6rem);line-height:1.1;letter-spacing:-.01em;margin:0 0 28px;font-weight:700;color:var(--navy-deep)}
h3{font-family:var(--display)}
.big{font-family:var(--display);font-size:clamp(1.4rem,3vw,2.1rem);line-height:1.25;font-weight:700;letter-spacing:-.01em;margin:0;max-width:24em;color:var(--navy-deep)}
.bar{width:56px;height:4px;margin:0 0 22px;border-radius:2px;background:var(--amber)}
.bar.green,.bar.orange{background:var(--amber)}
.muted{color:var(--muted)}
.hero-num{font-family:var(--display);font-size:clamp(96px,18vw,200px);line-height:.9;font-weight:800;color:var(--amber-2);letter-spacing:-.03em}
.hero-money{font-family:var(--display);font-size:clamp(48px,10vw,120px);line-height:1;font-weight:800;color:var(--amber-2);letter-spacing:-.02em}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:40px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
@media(max-width:980px){.grid3,.grid4{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.grid2,.grid3,.grid4{grid-template-columns:1fr}section{padding:56px 20px}}
.row{display:grid;grid-template-columns:48px 1fr auto;gap:18px;padding:22px 0;border-top:1px solid var(--faint);align-items:start}
.row:last-child{border-bottom:1px solid var(--faint)}
.row .n{font-family:var(--display);font-weight:800;font-size:1.3rem;color:var(--amber-2)}.row .t{font-family:var(--display);font-weight:700;font-size:1.15rem;color:var(--navy-deep)}.row .ev{font-style:italic;color:var(--muted);font-size:.9rem;margin-top:6px}
.row .v{font-family:var(--display);font-weight:800;font-size:1.4rem;text-align:right;white-space:nowrap;color:var(--navy-deep)}
@media(max-width:600px){.row{grid-template-columns:40px 1fr}.row .v{grid-column:2;text-align:left}}
.c-red{color:var(--red)}.c-orange{color:var(--amber-2)}.c-amber{color:var(--amber-2)}.c-blue{color:var(--navy)}.c-purple{color:var(--navy-2)}.c-green{color:var(--green)}.c-teal{color:var(--amber-2)}
.bg-red{background:var(--red);color:#fff}.bg-orange{background:var(--amber-2);color:#fff}.bg-amber{background:var(--amber);color:var(--navy-deep)}.bg-blue{background:var(--navy);color:#fff}.bg-purple{background:var(--navy-2);color:#fff}.bg-green{background:var(--green);color:#fff}.bg-teal{background:var(--amber-2);color:#fff}
.col h3{margin:0 0 10px;font-size:1.5rem;color:var(--navy-deep)}.col .lbl{font-family:var(--mono);font-size:.72rem;letter-spacing:.13em;font-weight:500;text-transform:uppercase;margin-bottom:8px;color:var(--amber-2)}
.matrix{position:relative;aspect-ratio:2/1.1;border:1px solid var(--faint);border-radius:14px;margin:24px 0 8px;overflow:hidden}
.matrix .q{position:absolute;width:50%;height:50%;padding:12px;font-family:var(--mono);font-size:.68rem;letter-spacing:.13em;font-weight:500;text-transform:uppercase}
.q1{left:0;top:0;background:#e6f4ec;color:var(--green)}.q2{right:0;top:0;background:#e8eef7;color:var(--navy)}.q3{left:0;bottom:0;background:#fff4d6;color:var(--amber-2)}.q4{right:0;bottom:0;background:#fbe7e2;color:var(--red)}
.dot{position:absolute;width:32px;height:32px;margin:-16px 0 0 -16px;border-radius:50%;font-family:var(--display);font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 4px 10px -4px rgba(15,52,96,.5)}
.axis{display:flex;justify-content:space-between;font-family:var(--mono);font-size:.68rem;letter-spacing:.13em;color:var(--muted);text-transform:uppercase;margin-bottom:32px}
.pts{display:grid;grid-template-columns:1fr 1fr;gap:20px 40px}@media(max-width:820px){.pts{grid-template-columns:1fr}}
.pt{border:1px solid var(--faint);border-radius:12px;padding:18px 20px;display:grid;grid-template-columns:36px 1fr;gap:12px;transition:.2s}
.pt:hover{border-color:var(--amber);background:var(--amber-soft)}
.pt .b{width:30px;height:30px;border-radius:50%;font-family:var(--display);font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}
.pt .t{font-family:var(--display);font-weight:700;font-size:1.05rem;color:var(--navy-deep)}.pt .tool{color:var(--amber-2);font-weight:600;font-size:.98rem;margin:6px 0}.pt .why{color:var(--muted);font-size:.9rem}.pt .tag{font-family:var(--mono);font-size:.62rem;letter-spacing:.13em;font-weight:500;text-transform:uppercase;margin-top:8px}
.score{display:grid;grid-template-columns:1fr auto;gap:8px 20px;align-items:center}
.score .name{font-size:1rem}.score .track{grid-column:1/-1;height:6px;background:var(--faint);border-radius:3px;overflow:hidden;margin-bottom:12px}.score .fill{height:100%;border-radius:3px}
.score .val{font-family:var(--display);font-weight:800;font-size:1.15rem}
.score .tag{font-family:var(--mono);font-size:.62rem;letter-spacing:.13em;font-weight:500;margin-left:10px}
.stat .lbl{font-family:var(--mono);font-size:.68rem;letter-spacing:.13em;font-weight:500;text-transform:uppercase;color:var(--muted);margin-bottom:6px}.stat .v{font-family:var(--display);font-size:1.7rem;font-weight:800;color:var(--navy-deep);letter-spacing:-.01em}
blockquote{margin:0;padding-left:28px;border-left:4px solid var(--amber);font-family:var(--display);font-size:clamp(1.4rem,3.2vw,2.1rem);font-weight:700;line-height:1.3;color:var(--navy-deep)}
.timeline{display:grid;grid-template-columns:repeat(5,1fr);gap:22px}
@media(max-width:980px){.timeline{grid-template-columns:1fr 1fr}}@media(max-width:600px){.timeline{grid-template-columns:1fr}}
.day{border:1px solid var(--faint);border-radius:14px;padding:22px 20px;background:#fff}
.day .d{font-family:var(--display);color:var(--amber-2);font-size:1.3rem;font-weight:800}.day .task{margin:10px 0 14px;font-size:.98rem}.day .tl{font-family:var(--mono);font-size:.62rem;letter-spacing:.13em;color:var(--amber-2);font-weight:500;text-transform:uppercase}.day .tool{color:var(--navy-deep);font-weight:600;font-size:.98rem}
.chain{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:32px}@media(max-width:820px){.chain{grid-template-columns:1fr 1fr}}
.chain>div{display:flex;flex-direction:column;justify-content:flex-end;background:var(--paper);border-radius:14px;padding:18px}
.chain .lbl{font-family:var(--mono);font-size:.68rem;letter-spacing:.13em;color:var(--muted);font-weight:500;text-transform:uppercase}.chain .v{font-family:var(--display);font-size:clamp(1.5rem,3.4vw,2.1rem);font-weight:800;margin:6px 0;color:var(--navy-deep)}.chain .n{font-size:.85rem;color:var(--muted)}
.chain .v.c-teal{color:var(--amber-2)}
.plan{border:1px solid var(--faint);padding:30px 28px;border-radius:14px;background:#fff;transition:.25s}.plan:hover{transform:translateY(-4px);box-shadow:0 24px 44px -24px rgba(15,52,96,.35)}
.plan h3{font-size:2.6rem;margin:0;letter-spacing:-.02em}.plan .sub{color:var(--muted);margin:4px 0 18px}.plan .desc{font-size:.96rem;min-height:96px;color:var(--muted)}.plan .price{font-family:var(--display);font-size:1.4rem;font-weight:800;margin-top:16px}.plan .fine{font-size:.8rem;color:var(--muted)}
.plan.hi{background:var(--navy-deep);border-color:var(--navy-deep);color:#fff}.plan.hi .sub,.plan.hi .desc,.plan.hi .fine{color:#c9d6e8}.plan.hi h3,.plan.hi .price{color:var(--amber)}
table{width:100%;border-collapse:collapse}td{padding:16px 0;border-top:1px solid var(--faint);vertical-align:top;font-size:.98rem}td:first-child{width:32%;color:var(--amber-2);font-family:var(--mono);font-size:.68rem;letter-spacing:.13em;font-weight:500;text-transform:uppercase;padding-right:20px}
footer{text-align:center;padding:40px 20px;background:var(--footer);color:#8ea3c2;font-size:.85rem}
.cta{display:inline-flex;margin-top:24px;padding:14px 22px;background:var(--amber);color:var(--navy-deep);font-weight:600;text-decoration:none;border-radius:999px;font-size:.95rem}
.dl{position:fixed;top:14px;right:14px;z-index:9;padding:10px 18px;background:var(--navy);border:2px solid transparent;color:#fff;font-family:var(--body);font-size:.85rem;font-weight:600;text-decoration:none;border-radius:999px;transition:.2s}
.dl:hover{background:var(--navy-deep);transform:translateY(-2px)}
@media print{.dl{display:none}}
`;

function buildHtml(data) {
  const p1 = data.part1 || {}, p2 = data.part2 || {}, p3 = data.part3 || {};
  const company = safe(data.companyName, 'Empresa');
  const re = p1.resumoExecutivo || {};
  const o = p1.oportunidadeRelance || {};
  const perdas = (p1.mapaPerdaTempoCusto || []).slice(0, 5);
  const cons = p1.consequenciasNaoAgir || {};
  const matriz = (p1.matrizOportunidades || []).slice(0, 9);
  const scores = (p1.scoringSolucoes || []).slice(0, 5).map(s => ({ codigo: s.codigo, nome: solucaoNome(s.codigo, s.nome), score: Math.max(0, Math.min(100, num(s.score))), just: safe(s.justificativa, '') })).sort((a, b) => b.score - a.score);
  const principal = p1.solucaoPrincipal || {}, secundaria = p1.solucaoSecundaria || {};
  const sp = scores.find(s => s.codigo === principal.codigo) || {};
  const ss = scores.find(s => s.codigo === secundaria.codigo) || {};
  const prom = p2.promessaCentral || {};
  const dias = (p2.planoQuickWins5Dias || []).slice(0, 5);
  const depois = (p2.depoisDosQuickWins || []).slice(0, 4);
  const v = computeValor(data);
  const p = computePricing(data);
  const niveis = p3.niveis || {};
  const g = p3.garantiaCondicional || {};
  const rowColors = ['red', 'orange', 'amber', 'blue', 'purple'];

  let ancor;
  if (p.ajuste === 'teto') ancor = `Faixa declarada na entrevista: ${brl(p.wtpMin)}–${brl(p.wtpMax)}/mês. A conta passa do teto — proposta ancorada em ${brl(p.alvo)}, com a conta na mesa pra negociar acima.`;
  else if (p.ajuste === 'piso') ancor = `Faixa declarada na entrevista: ${brl(p.wtpMin)}–${brl(p.wtpMax)}/mês. A conta fica abaixo do piso — proposta ancorada em ${brl(p.alvo)}.`;
  else if (p.wtpMax > 0) ancor = `Dentro da faixa declarada na entrevista (${brl(p.wtpMin)}–${brl(p.wtpMax)}/mês).`;
  else ancor = 'O entrevistado não declarou faixa de investimento — o preço-alvo segue a conta.';
  const ativacao = p.mat.mesAtivacao === 1
    ? 'Desde o mês 1, sobre o baseline já registrado pelo cliente.'
    : `A partir do mês ${p.mat.mesAtivacao}, após ${(p.mat.mesAtivacao - 1) * 30} dias de baseline registrado no painel. Antes disso, só a base mensal.`;
  const precoDe = k => p.temValor ? brl(p[k]) + '/mês' : esc(safe(niveis[k] && niveis[k].preco, 'TBD'));

  const dotsHtml = matriz.map((it, i) => {
    const e = clamp(it.esforco), im = clamp(it.impacto);
    const x = 4 + ((e - 1) / 4) * 92, y = 4 + ((5 - im) / 4) * 92;
    return `<div class="dot bg-${quadClass(it.quadrante)}" style="left:${x}%;top:${y}%">${i + 1}</div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Diagnóstico de Crescimento — ${esc(company)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<a class="dl" href="?download" download="diagnostico-${esc(String(company).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))}.html">⤓ Baixar esta página</a>

<div class="dark"><section>
  <p class="kicker">Diagnóstico de Crescimento</p>
  <h1>${esc(company)}</h1>
  <div class="bar"></div>
  <p class="lead" style="font-size:1.12rem;max-width:62ch">Onde está o dinheiro parado — e como liberar.</p>
  <p class="muted" style="margin-top:32px;font-size:.85rem">${esc(safe(data.date, ''))}</p>
</section></div>

<section>
  <p class="kicker orange">O problema</p><div class="bar orange"></div>
  <p class="big">${esc(safe(re.dor, 'Dor principal não identificada.'))}</p>
</section>

<section>
  <p class="kicker green">O resultado</p><div class="bar green"></div>
  <p class="big">${esc(safe(re.resultado, 'Resultado esperado não definido.'))}</p>
</section>

<section class="grid2">
  <div>
    <p class="kicker green">O tamanho da oportunidade</p>
    <div class="hero-num">${Math.round(num(o.horasSemana))}</div>
    <p style="font-size:22px;font-weight:700;margin:12px 0 6px">horas por semana</p>
    <p class="muted" style="margin:0">que hoje somem em retrabalho, espera e apagar incêndio — e podem voltar pro caixa.</p>
  </div>
  <div class="col">
    <div class="lbl muted">Foco principal</div>
    <p class="big">${esc(safe(o.focoPrincipal, 'A definir'))}</p>
  </div>
</section>

<section>
  <p class="kicker orange">Diagnóstico</p>
  <h2>Onde o tempo e o dinheiro vazam</h2>
  ${perdas.map((it, i) => `<div class="row">
    <div class="n c-${rowColors[i % 5]}">${String(i + 1).padStart(2, '0')}</div>
    <div><div class="t">${esc(safe(it.processo, 'Processo'))}</div><div class="ev">${esc(safe(it.evidencia, ''))}</div></div>
    <div class="v c-${rowColors[i % 5]}">${esc(safe(it.custoTempo, 'TBD'))}</div>
  </div>`).join('')}
</section>

<section>
  <p class="kicker red">Se nada mudar</p>
  <h2>O custo de não agir</h2>
  <div class="grid3">
    <div class="col"><div class="bar" style="background:var(--amber)"></div><h3 class="c-amber">1–3 meses</h3><p>${esc(safe(cons.curtoPrazo))}</p></div>
    <div class="col"><div class="bar" style="background:var(--orange)"></div><h3 class="c-orange">6–12 meses</h3><p>${esc(safe(cons.medioPrazo))}</p></div>
    <div class="col"><div class="bar" style="background:var(--red)"></div><h3 class="c-red">1–3 anos</h3><p>${esc(safe(cons.longoPrazo))}</p></div>
  </div>
</section>

<section>
  <p class="kicker blue">Priorização</p>
  <h2>Esforço × Impacto</h2>
  <p class="muted" style="margin:0">Quanto mais alto e mais à esquerda, antes deve ser feito.</p>
  <div class="matrix">
    <div class="q q1">Quick wins</div><div class="q q2">Projetos maiores</div><div class="q q3">Preenchimentos</div><div class="q q4">Ignorar</div>
    ${dotsHtml}
  </div>
  <div class="axis"><span>← Menos esforço</span><span>Mais esforço →</span></div>
  <h2 style="font-size:24px">Cada ponto, e a ferramenta que resolve</h2>
  <div class="pts">
    ${matriz.map((it, i) => `<div class="pt">
      <div class="b bg-${quadClass(it.quadrante)}">${i + 1}</div>
      <div><div class="t">${esc(safe(it.label, 'Item'))}</div>
        <div class="tool">⚙ ${esc(safe(it.ferramentaOuAcao, 'a definir'))}</div>
        <div class="why">${esc(safe(it.porque, ''))}</div>
        <div class="tag c-${quadClass(it.quadrante)}">${esc(safe(it.quadrante, ''))} · E${clamp(it.esforco)} · I${clamp(it.impacto)}</div></div>
    </div>`).join('')}
  </div>
</section>

<section>
  <p class="kicker teal">A resposta</p>
  <h2>Comece por aqui.</h2>
  <div class="grid2" style="align-items:center">
    <div>
      <p class="big" style="color:var(--amber-2)">${esc(solucaoNome(principal.codigo, principal.nome))}</p>
      <p style="font-size:17px;margin:16px 0 0">${esc(sp.just || '')}</p>
    </div>
    <div style="text-align:right"><div class="hero-num" style="font-size:clamp(80px,14vw,150px)">${Math.round(num(sp.score))}</div><div class="muted" style="font-size:10px;letter-spacing:.22em">/ 100 · SCORE DE PRIORIDADE</div></div>
  </div>
  <div style="border-top:1px solid var(--faint);margin-top:36px;padding-top:24px">
    <div class="muted" style="font-size:10px;letter-spacing:.25em;font-weight:700">DEPOIS</div>
    <p style="font-size:20px;font-weight:700;margin:8px 0 4px">${esc(solucaoNome(secundaria.codigo, secundaria.nome))} <span class="muted" style="font-weight:800;margin-left:12px">${Math.round(num(ss.score))}</span></p>
    <p class="muted" style="margin:0;font-size:14px">${esc(ss.just || '')}</p>
  </div>
</section>

<section>
  <p class="kicker blue">Priorização</p>
  <h2>As 5 frentes, ranqueadas</h2>
  <div class="score">
    ${scores.map(s => {
      const tag = s.codigo === principal.codigo ? 'PRINCIPAL' : (s.codigo === secundaria.codigo ? 'SECUNDÁRIA' : '');
      const c = scoreClass(s.score);
      return `<div class="name" style="${tag ? 'font-weight:700' : 'color:var(--muted)'}">${esc(s.nome)}${tag ? `<span class="tag c-${c}">${tag}</span>` : ''}</div><div class="val ${tag ? 'c-' + c : 'muted'}">${Math.round(s.score)}</div><div class="track"><div class="fill bg-${c}" style="width:${s.score}%"></div></div>`;
    }).join('')}
  </div>
  <div class="grid4" style="margin-top:32px;border-top:1px solid var(--faint);padding-top:24px">
    <div class="stat"><div class="lbl">Dor geral</div><div class="v">${Math.round(num(p1.dorGeral))}/100</div></div>
    <div class="stat"><div class="lbl">Maturidade em IA</div><div class="v">${esc(safe(p1.maturidadeIA))}</div></div>
    <div class="stat"><div class="lbl">Investimento considerado</div><div class="v">${esc(safe(p1.wtp))}</div></div>
    <div class="stat"><div class="lbl">Confiança</div><div class="v">${esc(safe(p1.confianca))}</div></div>
  </div>
</section>

<section>
  <p class="kicker purple">A promessa</p>
  <blockquote>${esc(safe(prom.headline, 'Promessa não definida'))}</blockquote>
  <p class="c-purple" style="font-weight:700;margin:28px 0 0;letter-spacing:.05em">${esc(safe(prom.nomeOferta, ''))}</p>
</section>

<section>
  <p class="kicker purple">Como funciona</p>
  <h2>${esc(safe(prom.nomeOferta, 'A solução'))}</h2>
  <p style="font-size:18px;max-width:60ch">${esc(safe(prom.explicacao, ''))}</p>
</section>

<section>
  <p class="kicker green">O que muda, em números</p><div class="bar green"></div>
  <p class="big">${esc(safe(p2.transformacaoMensuravel, 'A definir'))}</p>
</section>

<section>
  <p class="kicker green">Plano de ação</p>
  <h2>Cinco dias. Cinco entregas.</h2>
  <div class="timeline">
    ${dias.map((d, i) => `<div class="day"><div class="d">DIA ${esc(safe(d.dia, i + 1))}</div><div class="task">${esc(safe(d.tarefa, ''))}</div><div class="tl">FERRAMENTA</div><div class="tool">${esc(safe(d.ferramentaOuAcao, 'a definir'))}</div></div>`).join('')}
  </div>
</section>

${depois.length ? `<section>
  <p class="kicker blue">Plano de ação</p>
  <h2>E depois da primeira semana</h2>
  ${depois.map((it, i) => `<div class="row"><div class="n c-blue">${String(i + 1).padStart(2, '0')}</div><div><div class="t">${esc(safe(it.titulo, 'Item'))}</div><div class="ev" style="font-style:normal">${esc(safe(it.descricao, ''))}</div></div><div></div></div>`).join('')}
</section>` : ''}

<section>
  <p class="kicker green">Impacto financeiro</p>
  <div class="hero-money">${esc(brlK(v.total))}</div>
  <p style="font-size:18px;margin:16px 0 32px">por ano em jogo — somando o que se recupera, o que se evita e o que se ganha.</p>
  <div class="grid3" style="border-top:1px solid var(--faint);padding-top:24px">
    <div class="stat"><div class="lbl" style="color:var(--green)">Recupera</div><div class="v">${esc(brlK(v.horasAnual))}</div><div class="muted" style="font-size:13px;margin-top:6px">${Math.round(v.horasSemana)} h/semana × R$ ${Math.round(v.custoHora)}/h</div></div>
    <div class="stat"><div class="lbl" style="color:var(--red)">Evita</div><div class="v">${v.risco > 0 ? esc(brlK(v.risco)) : '—'}</div><div class="muted" style="font-size:13px;margin-top:6px">${v.risco > 0 ? 'risco concreto citado na entrevista' : 'nenhuma perda quantificada'}</div>${v.riscoEvidencia ? `<div class="muted" style="font-size:12px;font-style:italic;margin-top:8px">“${esc(v.riscoEvidencia)}”</div>` : ''}</div>
    <div class="stat"><div class="lbl" style="color:var(--navy)">Ganha</div><div class="v">${v.receita > 0 ? esc(brlK(v.receita)) : '—'}</div><div class="muted" style="font-size:13px;margin-top:6px">${v.receita > 0 ? Math.round(v.atribPct) + '% de ' + esc(brlK(v.receitaBruta)) + ' que hoje não chegam' : 'nenhuma receita perdida quantificada'}</div>${v.receitaEvidencia ? `<div class="muted" style="font-size:12px;font-style:italic;margin-top:8px">“${esc(v.receitaEvidencia)}”</div>` : ''}</div>
  </div>
  <p class="muted" style="font-size:12px;margin-top:24px">Custo estimado das ferramentas: ${esc(brl(v.custoFerramentas))}/mês · Receita atribuída é estimativa conservadora, não promessa.</p>
</section>

<section>
  <p class="kicker teal">A oferta</p>
  <h2>Como chegamos no preço</h2>
  <div class="chain">
    <div><div class="lbl">Valor anual em jogo</div><div class="v">${esc(brlK(p.valor.total))}</div><div class="n">três frentes somadas</div></div>
    <div><div class="lbl">÷ 2</div><div class="v">${esc(brlK(p.conservador))}</div><div class="n">só metade conta: atribuição e incerteza</div></div>
    <div><div class="lbl">× 10%</div><div class="v">${esc(brlK(p.anual))}</div><div class="n">você fica com 90% do ganho</div></div>
    <div><div class="lbl">÷ 12</div><div class="v c-teal">${esc(brlK(p.alvoCalculado))}</div><div class="n">preço-alvo por mês</div></div>
  </div>
  <p style="border-top:1px solid var(--faint);padding-top:20px">${esc(ancor)}</p>
  <div class="grid3" style="margin-top:24px">
    <div class="stat"><div class="lbl" style="color:var(--purple)">Setup · uma vez</div><div class="v">${esc(brl(p.setup))}</div><div class="muted" style="font-size:13px">implementação dos 5 dias</div></div>
    <div class="stat"><div class="lbl" style="color:var(--teal)">Base · todo mês</div><div class="v">${esc(brl(p.base))}</div><div class="muted" style="font-size:13px">${Math.round(p.mat.basePct * 100)}% do alvo — ferramentas, fluxo e acompanhamento</div></div>
    <div class="stat"><div class="lbl" style="color:var(--green)">Variável · a partir do mês ${p.mat.mesAtivacao}</div><div class="v">até ${esc(brl(p.variavel))}</div><div class="muted" style="font-size:13px">${Math.round(p.mat.variavelPct * 100)}% do alvo — só com resultado acima da meta</div></div>
  </div>
  <p class="muted" style="font-size:12px;margin-top:24px"><b>${esc(p.mat.rotulo.toUpperCase())}</b> · ${esc(p.mat.nota)}</p>
</section>

<section>
  <p class="kicker teal">A oferta</p>
  <h2>Três formas de fazer</h2>
  <div class="grid3">
    <div class="plan"><h3 class="c-purple">DIY</h3><div class="sub">Você opera, com suporte</div><div class="desc">${esc(safe(niveis.diy && niveis.diy.descricao, ''))}</div><div class="price c-purple">${precoDe('diy')}</div></div>
    <div class="plan hi"><h3 class="c-blue">DWY</h3><div class="sub">Fazemos junto</div><div class="desc">${esc(safe(niveis.dwy && niveis.dwy.descricao, ''))}</div><div class="price c-blue">${precoDe('dwy')}</div>${p.temValor ? `<div class="fine">setup ${esc(brl(p.setup))} · variável a partir do mês ${p.mat.mesAtivacao}</div>` : ''}</div>
    <div class="plan"><h3 class="c-teal">DFY</h3><div class="sub">Nós assumimos tudo</div><div class="desc">${esc(safe(niveis.dfy && niveis.dfy.descricao, ''))}</div><div class="price c-teal">${precoDe('dfy')}</div></div>
  </div>
</section>

<section>
  <p class="kicker teal">A oferta</p>
  <h2>Garantia condicional</h2>
  <table>
    <tr><td>Resultado esperado</td><td>${esc(safe(g.resultadoEsperado))}</td></tr>
    <tr><td>Prazo de avaliação</td><td>${esc(safe(g.prazo))}</td></tr>
    <tr><td>Pré-requisitos do cliente</td><td>${esc(safe(g.prerequisitos))}</td></tr>
    <tr><td>Métrica objetiva</td><td>${esc(safe(g.metricaObjetiva))}</td></tr>
    <tr><td>Ativação do variável</td><td>${esc(ativacao)}</td></tr>
    <tr><td>Elegibilidade</td><td>${esc(safe(g.elegibilidade))}</td></tr>
    <tr><td>Fora do escopo</td><td>${esc(safe(g.limiteEscopo))}</td></tr>
  </table>
</section>

<div class="dark"><section>
  <p class="kicker">Próximo passo</p>
  <h1 style="font-size:clamp(2rem,4.4vw,3.2rem)">Vamos começar pelo <em style="font-style:normal;color:var(--amber)">Dia 1</em>.</h1>
  <div class="bar"></div>
  <p class="lead" style="font-size:1.12rem;max-width:40ch">${esc(safe(dias[0] && dias[0].tarefa, ''))}</p>
  <p style="font-weight:600;color:var(--amber)">${esc(safe(dias[0] && dias[0].ferramentaOuAcao, ''))}</p>
</section></div>

<footer>${esc(company)} · ${esc(safe(data.date, ''))}</footer>
</body></html>`;
}

module.exports = { buildHtml };
