// ✅ funciona abrindo pelo server (recomendado) e também pelo Live Server (fallback)
const API = (location.port === "3001" || location.port === "3000") ? "" : "http://localhost:3001";

const $ = (id) => document.getElementById(id);

const elTipo = $("fTipo");
const elAno  = $("fAno");
const elMes  = $("fMes");
const elTech = $("fTech");

const btnApply = $("btnApply");
const btnTheme = $("btnTheme");

const elKpis = $("kpis");

const elTechGrid   = $("techGrid");
const elTechDetail = $("techDetail");
const elSearch     = $("searchTech");


// ===============================
// ✅ CONFIG: filtrar técnicos por ID (se quiser)
// Deixe vazio [] pra mostrar todos os técnicos que vierem do dataset.
// Coloque IDs aqui pra mostrar só a galera certa.
const TECH_ALLOWLIST_IDS = [
  // 123, 456, 789
];
const TECH_ALLOWLIST = new Set(TECH_ALLOWLIST_IDS.map(Number));


// ===============================
// Paginação
const pagination = {}; // estado por lista

function getEl(id){ return document.getElementById(id); }

function ensurePagerState(key, defaultSize = 10){
  if (!pagination[key]) pagination[key] = { page: 1, size: defaultSize };
  return pagination[key];
}

function slicePage(rows, page, size){
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * size;
  const end = start + size;
  return { page: safePage, size, total, pages, rows: rows.slice(start, end) };
}

function bindPager(key, ids, onChange){
  const prev = getEl(ids.prev);
  const next = getEl(ids.next);
  const size = getEl(ids.size);

  if (prev) prev.onclick = () => { ensurePagerState(key).page--; onChange(); };
  if (next) next.onclick = () => { ensurePagerState(key).page++; onChange(); };
  if (size) size.onchange = () => {
    const st = ensurePagerState(key);
    st.size = Number(size.value) || st.size;
    st.page = 1;
    onChange();
  };
}

function updatePagerInfo(ids, meta){
  const info = getEl(ids.info);
  const prev = getEl(ids.prev);
  const next = getEl(ids.next);
  const size = getEl(ids.size);

  if (info) info.textContent = `Página ${meta.page} / ${meta.pages} • ${meta.total} itens`;
  if (prev) prev.disabled = meta.page <= 1;
  if (next) next.disabled = meta.page >= meta.pages;
  if (size && Number(size.value) !== meta.size) size.value = String(meta.size);
}


// ===============================
// State + Utils
let state = {
  baseUrl: "",
  rows: [],
  selectedTechId: null,
};

const dash = (v) => (v === null || v === undefined || v === "" ? "—" : v);
const n0 = (v) => (v === null || v === undefined || Number.isNaN(Number(v)) ? 0 : Number(v));

function ticketLink(baseUrl, id) {
  return `${baseUrl}/front/ticket.form.php?id=${id}`;
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  alert("Copiado ✅");
}

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const it of arr) {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return m;
}

// pega 1/0 de um campo com fallbacks (pra aguentar mudanças na API)
function flag(r, ...names){
  for (const n of names) {
    if (r && r[n] !== undefined && r[n] !== null) return Number(r[n]) || 0;
  }
  return 0;
}

// devolve true/false/null (pra SLA)
function slaVal(r, ...names){
  for (const n of names) {
    if (r && r[n] !== undefined && r[n] !== null) return Number(r[n]);
  }
  return null;
}

function computeSlaPct(rows, ...fieldNames) {
  const vals = rows
    .map(r => slaVal(r, ...fieldNames))
    .filter(v => v !== null && v !== undefined);

  if (!vals.length) return null;

  const ok = vals.filter(v => Number(v) === 1).length;
  return (ok / vals.length) * 100;
}

function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n)}%`;
}


// ===============================
// ✅ Resumo por técnico (para os cards)
function summarizeTech(rowsTech) {
  const backlog = rowsTech.filter(r => flag(r, "is_backlog") === 1);
  const enc     = rowsTech.filter(r => flag(r, "is_encerrado") === 1);

  const incBack = backlog.filter(r => Number(r.tipo_ticket) === 1);
  const reqBack = backlog.filter(r => Number(r.tipo_ticket) === 2);

  const packSolucao = (rows) => ({
    fora: rows.filter(r => flag(r, "solucao_fora_prazo", "is_fora_prazo") === 1).length,
    no:   rows.filter(r => flag(r, "solucao_no_prazo", "is_no_prazo") === 1).length,
    pend: rows.length,

    // ✅ amarelos (Solução/TTR)
    v30:  rows.filter(r => flag(r, "solucao_vencidos_mais_30d", "is_vencidos_mais_30d") === 1).length,
    hoje: rows.filter(r => flag(r, "solucao_vence_hoje", "is_vence_hoje") === 1).length,
    sem:  rows.filter(r => flag(r, "solucao_vence_7d", "is_vence_7d") === 1).length,
  });

  const inc = packSolucao(incBack);
  const req = packSolucao(reqBack);

  // SLA de Inc/Requisição (encerrados)
  const incEnc = enc.filter(r => Number(r.tipo_ticket) === 1);
  const reqEnc = enc.filter(r => Number(r.tipo_ticket) === 2);

  const slaInc = computeSlaPct(incEnc, "solucao_cumpriu_sla", "sla_solucao_ok");
  const slaReq = computeSlaPct(reqEnc, "solucao_cumpriu_sla", "sla_solucao_ok");

  // Demandas (por categoria listada)
  const demBack = backlog.filter(r => flag(r, "is_demanda") === 1);
  const demEnc  = enc.filter(r => flag(r, "is_demanda") === 1);

  const demAt = {
    fora: demBack.filter(r => flag(r, "atendimento_fora_prazo") === 1).length,
    no:   demBack.filter(r => flag(r, "atendimento_no_prazo") === 1).length,
    pend: demBack.length,

    // ✅ amarelos (Atendimento/TTO)
    v30:  demBack.filter(r => flag(r, "atendimento_vencidos_mais_30d", "own_vencidos_mais_30d") === 1).length,
    hoje: demBack.filter(r => flag(r, "atendimento_vence_hoje", "own_vence_hoje") === 1).length,
    sem:  demBack.filter(r => flag(r, "atendimento_vence_7d", "own_vence_7d") === 1).length,
  };

  const demSol = {
    fora: demBack.filter(r => flag(r, "solucao_fora_prazo", "is_fora_prazo") === 1).length,
    no:   demBack.filter(r => flag(r, "solucao_no_prazo", "is_no_prazo") === 1).length,
    pend: demBack.length,

    // ✅ amarelos (Solução/TTR)
    v30:  demBack.filter(r => flag(r, "solucao_vencidos_mais_30d", "is_vencidos_mais_30d") === 1).length,
    hoje: demBack.filter(r => flag(r, "solucao_vence_hoje", "is_vence_hoje") === 1).length,
    sem:  demBack.filter(r => flag(r, "solucao_vence_7d", "is_vence_7d") === 1).length,
  };

  const slaDemAt  = computeSlaPct(demEnc, "atendimento_cumpriu_sla", "sla_atendimento_ok");
  const slaDemSol = computeSlaPct(demEnc, "solucao_cumpriu_sla", "sla_solucao_ok");

  const pendingEvals = rowsTech.filter(r => flag(r, "avaliacao_pendente") === 1).length;
  const missingCx    = rowsTech.filter(r => flag(r, "complexidade_pendente") === 1).length;

  return { inc, req, slaInc, slaReq, demAt, demSol, slaDemAt, slaDemSol, pendingEvals, missingCx };
}


// ===============================
// KPIs gerais
function renderKpis(rows) {
  const total   = rows.length;
  const backlog = rows.filter(r => flag(r, "is_backlog") === 1).length;
  const encerr  = rows.filter(r => flag(r, "is_encerrado") === 1).length;

  const pendEval = rows.filter(r => flag(r, "avaliacao_pendente") === 1).length;
  const missCx   = rows.filter(r => flag(r, "complexidade_pendente") === 1).length;

  // ✅ Vencimentos (geral)
  // Solução/TTR (inc/req e também demandas)
  const venceHojeSol = rows.filter(r =>
    flag(r, "is_backlog") === 1 &&
    flag(r, "solucao_vence_hoje", "is_vence_hoje") === 1
  ).length;

  const vence7dSol = rows.filter(r =>
    flag(r, "is_backlog") === 1 &&
    flag(r, "solucao_vence_7d", "is_vence_7d") === 1
  ).length;

  // Atendimento/TTO (só demandas) — se sua API tiver esses campos, aparece certinho
  const venceHojeAt = rows.filter(r =>
    flag(r, "is_backlog") === 1 &&
    flag(r, "is_demanda") === 1 &&
    flag(r, "atendimento_vence_hoje", "own_vence_hoje") === 1
  ).length;

  const vence7dAt = rows.filter(r =>
    flag(r, "is_backlog") === 1 &&
    flag(r, "is_demanda") === 1 &&
    flag(r, "atendimento_vence_7d", "own_vence_7d") === 1
  ).length;

  elKpis.innerHTML = `
    <div class="mini-card">
      <div class="mini-title">Total no filtro</div>
      <div class="mini-value">${total}</div>
      <div class="sub">tickets carregados</div>
    </div>

    <div class="mini-card">
      <div class="mini-title">Backlog</div>
      <div class="mini-value">${backlog}</div>
      <div class="sub">abertos</div>
    </div>

    <div class="mini-card">
      <div class="mini-title">Encerrados</div>
      <div class="mini-value">${encerr}</div>
      <div class="sub">fechados/solucionados</div>
    </div>

    <div class="mini-card">
      <div class="mini-title">Vence hoje (abertos)</div>
      <div class="mini-value">${venceHojeSol} / ${venceHojeAt}</div>
      <div class="sub">Solução (TTR) / Atendimento (Demandas)</div>
    </div>

    <div class="mini-card">
      <div class="mini-title">Vence em 7 dias (abertos)</div>
      <div class="mini-value">${vence7dSol} / ${vence7dAt}</div>
      <div class="sub">Solução (TTR) / Atendimento (Demandas)</div>
    </div>

    <div class="mini-card">
      <div class="mini-title">Pendências (aval / complex)</div>
      <div class="mini-value">${pendEval} / ${missCx}</div>
      <div class="sub">ações rápidas</div>
    </div>
  `;
}



// ===============================
// ✅ Lista: Sem Avaliação (com paginação)
function renderPendingEvals(baseUrl, rows) {
  const tb = document.getElementById("tbPendingEvals");
  if (!tb) return;

  const pendAll = rows.filter(r => flag(r, "avaliacao_pendente") === 1);

  const key = "pendingEvals";
  const ids = { prev: "pendPrev", next: "pendNext", info: "pendInfo", size: "pendSize" };

  if (!pagination[key]?._bound) {
    bindPager(key, ids, () => renderPendingEvals(baseUrl, rows));
    ensurePagerState(key, 10);
    pagination[key]._bound = true;
  }

  const st = ensurePagerState(key, 10);
  const meta = slicePage(pendAll, st.page, st.size);
  st.page = meta.page;
  updatePagerInfo(ids, meta);

  tb.innerHTML = meta.rows.length
    ? meta.rows.map(r => {
        const link = ticketLink(baseUrl, r.ticket_id);
        return `
          <tr>
            <td><strong>#${r.ticket_id}</strong></td>
            <td>${dash((r.titulo || "")).slice(0, 70)}</td>
            <td>${dash(r.tecnico)}</td>
            <td>
              <button type="button" onclick="window.__copyEval(${r.ticket_id})">Copiar</button>
              <a href="${link}" target="_blank" rel="noreferrer">Abrir</a>
            </td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="4" class="muted">Nada pendente 😊</td></tr>`;
}


// ===============================
// ✅ Lista: Demandas sem complexidade (com paginação)
function renderNoComplex(rows) {
  const tb = document.getElementById("tbNoComplex");
  if (!tb) return;

  const noComplexAll = rows.filter(r => flag(r, "is_demanda") === 1 && flag(r, "complexidade_pendente") === 1);

  const key = "noComplex";
  const ids = { prev: "ncPrev", next: "ncNext", info: "ncInfo", size: "ncSize" };

  if (!pagination[key]?._bound) {
    bindPager(key, ids, () => renderNoComplex(rows));
    ensurePagerState(key, 10);
    pagination[key]._bound = true;
  }

  const st = ensurePagerState(key, 10);
  const meta = slicePage(noComplexAll, st.page, st.size);
  st.page = meta.page;
  updatePagerInfo(ids, meta);

  tb.innerHTML = meta.rows.length
    ? meta.rows.map(r => `
        <tr>
          <td><strong>#${r.ticket_id}</strong></td>
          <td>${dash((r.titulo || "")).slice(0, 80)}</td>
          <td>${dash(r.tecnico)}</td>
          <td class="muted">${dash(r.categoria || r.categoria_path)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="4" class="muted">Tudo certo 😊</td></tr>`;
}


// ===============================
// ✅ Cards por técnico (com amarelos + demandas)
function renderTechGrid(rows) {
  const byTech = groupBy(rows, r => Number(r.tecnico_id));

  let entries = [...byTech.entries()].map(([techId, items]) => ({
    techId,
    name: items[0]?.tecnico || `Tech ${techId}`,
    items
  }));

  // ✅ allowlist por ID (se você preencher)
  if (TECH_ALLOWLIST.size) {
    entries = entries.filter(e => TECH_ALLOWLIST.has(Number(e.techId)));
  }

  entries.sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));

  // mantém seleção atual do select
  const prevSelected = elTech?.value || "";

  // popula select técnicos
  elTech.innerHTML =
    `<option value="">Todos</option>` +
    entries.map(e => `<option value="${e.techId}">${e.name}</option>`).join("");

  if (prevSelected) elTech.value = prevSelected;

  // cards
  const q = (elSearch?.value || "").trim().toLowerCase();

  elTechGrid.innerHTML = entries
    .filter(e => !q || e.name.toLowerCase().includes(q))
    .map(e => {
      const s = summarizeTech(e.items);

      const statusPill =
        s.missingCx > 0 ? `<span class="pill"><span class="dot bad"></span> Complexidade ${s.missingCx}</span>`
      : s.pendingEvals > 0 ? `<span class="pill"><span class="dot warn"></span> Avaliação ${s.pendingEvals}</span>`
      : `<span class="pill"><span class="dot good"></span> OK</span>`;

      const yellowRow = (x) => `
        <div class="tag">
          <span class="badge">V+30 <strong>${x.v30}</strong></span>
          <span class="badge">Hoje <strong>${x.hoje}</strong></span>
          <span class="badge">7d <strong>${x.sem}</strong></span>
        </div>
      `;

      return `
        <div class="person" data-tech="${e.techId}">
          <div class="person-head">
            <div class="person-name">
              <div class="avatar"></div>
              ${e.name}
            </div>
            ${statusPill}
          </div>

          <div class="person-body">
            <!-- Linha 1 -->
            <div class="cols">
              <div class="kpi">
                <div class="label">Incidentes (fora/no/pend)</div>
                <div class="value">${s.inc.fora}/${s.inc.no}/${s.inc.pend}</div>
                ${yellowRow(s.inc)}
              </div>

              <div class="kpi">
                <div class="label">Requisições (fora/no/pend)</div>
                <div class="value">${s.req.fora}/${s.req.no}/${s.req.pend}</div>
                ${yellowRow(s.req)}
              </div>

              <div class="kpi">
                <div class="label">SLA Inc / Req</div>
                <div class="value">${fmtPct(s.slaInc)} / ${fmtPct(s.slaReq)}</div>
                <div class="tag">
                  <span class="muted">Base: encerrados</span>
                </div>
              </div>
            </div>

            <!-- Linha 2 (Demandas) -->
            <div class="cols" style="margin-top:10px">
              <div class="kpi">
                <div class="label">Atend. Demandas (fora/no/pend)</div>
                <div class="value">${s.demAt.fora}/${s.demAt.no}/${s.demAt.pend}</div>
                ${yellowRow(s.demAt)}
              </div>

              <div class="kpi">
                <div class="label">Solução Demandas (fora/no/pend)</div>
                <div class="value">${s.demSol.fora}/${s.demSol.no}/${s.demSol.pend}</div>
                ${yellowRow(s.demSol)}
              </div>

              <div class="kpi">
                <div class="label">SLA Demandas (At / Sol)</div>
                <div class="value">${fmtPct(s.slaDemAt)} / ${fmtPct(s.slaDemSol)}</div>
                <div class="tag">
                  <span class="muted">Base: demandas encerradas</span>
                </div>
              </div>
            </div>

            <div class="split">
              <span class="badge">⭐ <strong>${s.pendingEvals}</strong> sem avaliação</span>
              <span class="badge">⚠ <strong>${s.missingCx}</strong> sem complexidade</span>
            </div>
          </div>
        </div>
      `;
    }).join("") || `<div class="muted">Sem dados para o filtro.</div>`;

  // clique pra abrir detalhe
  [...document.querySelectorAll(".person")].forEach(card => {
    card.addEventListener("click", () => {
      state.selectedTechId = Number(card.dataset.tech);
      renderTechDetail();
    });
  });
}

function isSlaSolucaoVazia(r){
  // Campo do GLPI: "Tempo para solução" => glpi_tickets.time_to_resolve
  const v = r.time_to_resolve ?? r.dt_limite_resolver ?? r.dt_limite_solucao;

  // Se o backend nem mandou o campo, não dá pra afirmar que é vazio:
  // aí a gente só usa como fallback o id do SLA (se existir).
  if (v === undefined) {
    const ttrId = n0(r.slas_id_ttr ?? r.sla_ttr_id ?? r.sla_id_ttr);
    return ttrId === 0;
  }

  // Quando vem string/data:
  if (v === null || v === "") return true;

  // Alguns setups retornam "0000-00-00 00:00:00" como "vazio"
  if (typeof v === "string" && v.startsWith("0000-00-00")) return true;

  return false; // tem tempo para solução, então NÃO é vazio
}


// ===============================
// ✅ Detalhe do técnico (com paginação nas listas também)
function renderTechDetail() {
  const techId = state.selectedTechId || (elTech.value ? Number(elTech.value) : null);
  if (!techId) {
    elTechDetail.innerHTML = `<div class="muted">Selecione um atendente na visão de cards 👇</div>`;
    return;
  }

  const items = state.rows.filter(r => Number(r.tecnico_id) === Number(techId));
  const name  = items[0]?.tecnico || `Tech ${techId}`;

  const backlog = items.filter(r => flag(r, "is_backlog") === 1);

  // Alertas (solução/TTR)
  const venceHoje = backlog.filter(r => flag(r, "solucao_vence_hoje", "is_vence_hoje") === 1);
  const venceSem  = backlog.filter(r => flag(r, "solucao_vence_7d", "is_vence_7d") === 1);

  // Pendências
  const pendEvalAll = items.filter(r => flag(r, "avaliacao_pendente") === 1);

  // Demandas sem complexidade (com ação abrir)
  const missCxAll = items.filter(r =>
    flag(r, "is_demanda") === 1 && flag(r, "complexidade_pendente") === 1
  );

  // ✅ SLA vazio (Solução p/ todos + Atendimento p/ demandas)
 // ✅ SLA vazio (Solução/TTR apenas)
const slaVazioAll = backlog
  .filter(r => isSlaSolucaoVazia(r))
  .map(r => ({ ...r, __slaTipo: "Solução (TTR)" }));


  // --- Paginação: Sem Avaliação
  const keyPE = `detailPend_${techId}`;
  const idsPE = { prev: "dPendPrev", next: "dPendNext", info: "dPendInfo", size: "dPendSize" };
  ensurePagerState(keyPE, 10);
  const stPE   = ensurePagerState(keyPE, 10);
  const metaPE = slicePage(pendEvalAll, stPE.page, stPE.size);
  stPE.page = metaPE.page;

  // --- Paginação: SLA vazio
  const keySLA = `detailSla_${techId}`;
  const idsSLA = { prev: "dSlaPrev", next: "dSlaNext", info: "dSlaInfo", size: "dSlaSize" };
  ensurePagerState(keySLA, 10);
  const stSLA   = ensurePagerState(keySLA, 10);
  const metaSLA = slicePage(slaVazioAll, stSLA.page, stSLA.size);
  stSLA.page = metaSLA.page;

  // --- Paginação: Sem Complexidade
  const keyCX = `detailCx_${techId}`;
  const idsCX = { prev: "dCxPrev", next: "dCxNext", info: "dCxInfo", size: "dCxSize" };
  ensurePagerState(keyCX, 10);
  const stCX   = ensurePagerState(keyCX, 10);
  const metaCX = slicePage(missCxAll, stCX.page, stCX.size);
  stCX.page = metaCX.page;

  elTechDetail.innerHTML = `
    <div class="detail-grid">
      <div class="detail-left">
        <div class="highlight">
          <div class="highlight-card">
            <div class="highlight-title">Vence hoje ⚡</div>
            <div class="highlight-sub">Solução (TTR)</div>
            <div class="highlight-big">${venceHoje.length}</div>
          </div>
          <div class="highlight-card week">
            <div class="highlight-title">Vence na semana 👀</div>
            <div class="highlight-sub">Solução (TTR)</div>
            <div class="highlight-big">${venceSem.length}</div>
          </div>
        </div>

        <div class="section" style="margin-top:12px">
          <div class="section-head"><h2>${name}</h2></div>
          <div class="section-body">
            <div class="hint">
              ⭐ ${pendEvalAll.length} sem avaliação • ⚠ ${missCxAll.length} sem complexidade • 🧾 ${slaVazioAll.length} SLA solução vazio
            </div>
            <div class="divider"></div>

            <div class="rank">
              <div class="hint">Vence hoje</div>
              ${listTickets(venceHoje)}
              <div class="hint" style="margin-top:10px">Vence na semana</div>
              ${listTickets(venceSem)}
            </div>
          </div>
        </div>
      </div>

      <div class="detail-right">
        <!-- ⭐ Sem avaliação -->
        <div class="section" style="margin-top:0">
          <div class="section-head"><h2>⭐ Sem avaliação (copiar)</h2></div>
          <div class="section-body">
            <table class="table">
              <thead>
                <tr><th>#</th><th>Título</th><th>Ação</th></tr>
              </thead>
              <tbody>
                ${
                  metaPE.rows.length
                    ? metaPE.rows.map(r => {
                        const link = ticketLink(state.baseUrl, r.ticket_id);
                        return `
                          <tr>
                            <td><strong>#${r.ticket_id}</strong></td>
                            <td>${dash((r.titulo || "").slice(0, 70))}</td>
                            <td>
                              <button type="button" onclick="window.__copyEval(${r.ticket_id})">Copiar</button>
                              <a href="${link}" target="_blank" rel="noreferrer">Abrir</a>
                            </td>
                          </tr>
                        `;
                      }).join("")
                    : `<tr><td colspan="3" class="muted">Nada pendente 😊</td></tr>`
                }
              </tbody>
            </table>

            <div class="pager" style="margin-top:10px">
              <button type="button" id="dPendPrev">←</button>
              <span class="pager-info" id="dPendInfo">—</span>
              <button type="button" id="dPendNext">→</button>
              <select id="dPendSize">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 🧾 SLA vazio -->
        <div class="section" style="margin-top:12px">
          <div class="section-head"><h2>🧾 Chamados com SLA vazio</h2></div>
          <div class="section-body">
            <table class="table">
              <thead>
                <tr><th>#</th><th>Título</th><th>Tipo</th><th>Ação</th></tr>
              </thead>
              <tbody>
                ${
                  metaSLA.rows.length
                    ? metaSLA.rows.map(r => {
                        const link = ticketLink(state.baseUrl, r.ticket_id);
                        return `
                          <tr>
                            <td><strong>#${r.ticket_id}</strong></td>
                            <td>${dash((r.titulo || "").slice(0, 70))}</td>
                            <td class="muted">${dash(r.__slaTipo)}</td>
                            <td><a href="${link}" target="_blank" rel="noreferrer">Abrir</a></td>
                          </tr>
                        `;
                      }).join("")
                    : `<tr><td colspan="4" class="muted">Nenhum SLA vazio 🎉</td></tr>`
                }
              </tbody>
            </table>

            <div class="pager" style="margin-top:10px">
              <button type="button" id="dSlaPrev">←</button>
              <span class="pager-info" id="dSlaInfo">—</span>
              <button type="button" id="dSlaNext">→</button>
              <select id="dSlaSize">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        </div>

        <!-- ⚠ Demandas sem complexidade -->
        <div class="section" style="margin-top:12px">
          <div class="section-head"><h2>⚠ Demandas sem complexidade</h2></div>
          <div class="section-body">
            <table class="table">
              <thead>
                <tr><th>#</th><th>Título</th><th>Categoria</th><th>Ação</th></tr>
              </thead>
              <tbody>
                ${
                  metaCX.rows.length
                    ? metaCX.rows.map(r => {
                        const link = ticketLink(state.baseUrl, r.ticket_id);
                        return `
                          <tr>
                            <td><strong>#${r.ticket_id}</strong></td>
                            <td>${dash((r.titulo || "").slice(0, 70))}</td>
                            <td>${dash((r.categoria_path || r.categoria || "").slice(0, 70))}</td>
                            <td><a href="${link}" target="_blank" rel="noreferrer">Abrir</a></td>
                          </tr>
                        `;
                      }).join("")
                    : `<tr><td colspan="4" class="muted">Tudo certo 🎉</td></tr>`
                }
              </tbody>
            </table>

            <div class="pager" style="margin-top:10px">
              <button type="button" id="dCxPrev">←</button>
              <span class="pager-info" id="dCxInfo">—</span>
              <button type="button" id="dCxNext">→</button>
              <select id="dCxSize">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  // bind pagers (depois que os elementos existem)
  bindPager(keyPE, idsPE, () => renderTechDetail());
  updatePagerInfo(idsPE, metaPE);

  bindPager(keySLA, idsSLA, () => renderTechDetail());
  updatePagerInfo(idsSLA, metaSLA);

  bindPager(keyCX, idsCX, () => renderTechDetail());
  updatePagerInfo(idsCX, metaCX);
}


function listTickets(arr) {
  if (!arr.length) return `<div class="muted">Nada aqui 😄</div>`;
  return arr.slice(0, 8).map(r => `
    <div class="rank-item">
      <div class="rank-left">
        <div class="medal">#${r.ticket_id}</div>
        <div class="rank-name">${dash((r.titulo || "").slice(0, 60))}</div>
      </div>
      <div class="rank-right">${dash(((r.categoria_path || r.categoria || "")).slice(0, 40))}</div>
    </div>
  `).join("");
}


// ===============================
// Tema
function setTheme(next) {
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) setTheme(saved);

  if (btnTheme) {
    btnTheme.addEventListener("click", () => {
      const cur = document.documentElement.getAttribute("data-theme") || "dark";
      setTheme(cur === "dark" ? "light" : "dark");
    });
  }
}


// ===============================
// Carregar dados
async function loadData() {
  try {
    const params = new URLSearchParams();
    params.set("tipo", elTipo?.value || "BACKLOG");

    const ano = elAno?.value?.toString().trim();
    const mes = elMes?.value?.toString().trim();

    if (ano) params.set("ano", ano);
    if (mes) params.set("mes", mes);

    if (elTech?.value) params.set("users", elTech.value);

    const res = await fetch(`${API}/api/tickets?${params.toString()}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    state.baseUrl = data.baseUrl;
    state.rows = data.rows || [];

    // ✅ agora o copiar funciona (antes não existia)
    window.__copyEval = async (ticketId) => {
      const msg =
`Queria te pedir um favor: se puder avaliar o chamado com as estrelinhas, agradeço! 😊

${ticketLink(state.baseUrl, ticketId)}`;
      await copyText(msg);
    };

    renderKpis(state.rows);
    renderPendingEvals(state.baseUrl, state.rows);
    renderNoComplex(state.rows);
    renderTechGrid(state.rows);
    renderTechDetail();

  } catch (err) {
    console.error(err);
    alert(`Erro ao carregar dados: ${err.message || err}`);
  }
}


// ===============================
// Events
if (btnApply) {
  btnApply.addEventListener("click", () => {
    state.selectedTechId = null;
    loadData();
  });
}

if (elTech) {
  elTech.addEventListener("change", () => {
    state.selectedTechId = elTech.value ? Number(elTech.value) : null;
    renderTechDetail();
  });
}

if (elSearch) {
  elSearch.addEventListener("input", () => renderTechGrid(state.rows));
}

initTheme();
loadData();