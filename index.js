
    // =========================
    // 1) DADOS (mock) — troque por fetch()
    // =========================
    // Campos esperados por ticket:
    // {
    //   ticket_id: number,
    //   titulo: string,
    //   tipo_ticket: 1|2,             // 1 Incidente, 2 Requisição
    //   status_ticket: number,
    //   dt_abertura: "YYYY-MM-DD HH:mm:ss" | null,
    //   dt_solucao: "YYYY-MM-DD HH:mm:ss" | null,
    //   dt_fechamento: "YYYY-MM-DD HH:mm:ss" | null,
    //   dt_limite_resolver: "YYYY-MM-DD HH:mm:ss" | null,
    //   tecnico_id: number,
    //   tecnico: string,              // nome curto
    //   is_backlog: 0|1,
    //   is_encerrado: 0|1,
    //   is_vence_hoje: 0|1,
    //   is_vence_7d: 0|1,
    //   is_vencidos_mais_30d: 0|1,
    //   is_no_prazo: 0|1,
    //   is_fora_prazo: 0|1,
    //   stars: 1..5 | null            // opcional (satisfação)
    // }

    const mockTickets = [
      // Livia (id 1)
      {ticket_id: 74915, titulo:"Requisição - GLPI", tipo_ticket:2, status_ticket:2, dt_abertura:"2025-08-03 10:00:00", dt_solucao:null, dt_fechamento:null, dt_limite_resolver: todayAt("18:00"), tecnico_id:1, tecnico:"Livia", is_backlog:1, is_encerrado:0, is_vence_hoje:1, is_vence_7d:1, is_vencidos_mais_30d:0, is_no_prazo:1, is_fora_prazo:0, stars:null},
      {ticket_id: 74914, titulo:"Requisição - Totvs RM", tipo_ticket:2, status_ticket:2, dt_abertura:"2025-08-04 09:20:00", dt_solucao:null, dt_fechamento:null, dt_limite_resolver: daysFromNow(3), tecnico_id:1, tecnico:"Livia", is_backlog:1, is_encerrado:0, is_vence_hoje:0, is_vence_7d:1, is_vencidos_mais_30d:0, is_no_prazo:1, is_fora_prazo:0, stars:null},
      {ticket_id: 74903, titulo:"Solicitação Cadastro - Cliente", tipo_ticket:2, status_ticket:6, dt_abertura:"2025-08-02 11:00:00", dt_solucao:"2025-08-05 14:00:00", dt_fechamento:"2025-08-05 18:00:00", dt_limite_resolver:"2025-08-06 12:00:00", tecnico_id:1, tecnico:"Livia", is_backlog:0, is_encerrado:1, is_vence_hoje:0, is_vence_7d:0, is_vencidos_mais_30d:0, is_no_prazo:null, is_fora_prazo:null, stars:5},

      // Igor (id 2)
      {ticket_id: 74897, titulo:"Requisição - Protheus Distrib.", tipo_ticket:2, status_ticket:2, dt_abertura:"2025-08-01 08:30:00", dt_solucao:null, dt_fechamento:null, dt_limite_resolver: daysFromNow(0), tecnico_id:2, tecnico:"Igor", is_backlog:1, is_encerrado:0, is_vence_hoje:1, is_vence_7d:1, is_vencidos_mais_30d:0, is_no_prazo:1, is_fora_prazo:0, stars:null},
      {ticket_id: 74896, titulo:"Demandas Sistemas", tipo_ticket:1, status_ticket:2, dt_abertura:"2025-08-01 09:00:00", dt_solucao:null, dt_fechamento:null, dt_limite_resolver: daysFromNow(10), tecnico_id:2, tecnico:"Igor", is_backlog:1, is_encerrado:0, is_vence_hoje:0, is_vence_7d:0, is_vencidos_mais_30d:0, is_no_prazo:1, is_fora_prazo:0, stars:null},
      {ticket_id: 74840, titulo:"Incidente - Softwares", tipo_ticket:1, status_ticket:6, dt_abertura:"2025-08-01 10:00:00", dt_solucao:"2025-08-02 12:00:00", dt_fechamento:"2025-08-02 16:00:00", dt_limite_resolver:"2025-08-03 10:00:00", tecnico_id:2, tecnico:"Igor", is_backlog:0, is_encerrado:1, is_vence_hoje:0, is_vence_7d:0, is_vencidos_mais_30d:0, is_no_prazo:null, is_fora_prazo:null, stars:4},

      // Roberta (id 3)
      {ticket_id: 74701, titulo:"Incidente - BI/DW", tipo_ticket:1, status_ticket:2, dt_abertura:"2025-08-03 13:00:00", dt_solucao:null, dt_fechamento:null, dt_limite_resolver: daysFromNow(6), tecnico_id:3, tecnico:"Roberta", is_backlog:1, is_encerrado:0, is_vence_hoje:0, is_vence_7d:1, is_vencidos_mais_30d:0, is_no_prazo:1, is_fora_prazo:0, stars:null},
      {ticket_id: 74690, titulo:"Requisição - Impressoras", tipo_ticket:2, status_ticket:2, dt_abertura:"2025-08-03 15:10:00", dt_solucao:null, dt_fechamento:null, dt_limite_resolver: daysFromNow(-40), tecnico_id:3, tecnico:"Roberta", is_backlog:1, is_encerrado:0, is_vence_hoje:0, is_vence_7d:0, is_vencidos_mais_30d:1, is_no_prazo:0, is_fora_prazo:1, stars:null},
      {ticket_id: 74555, titulo:"Requisição - RM", tipo_ticket:2, status_ticket:6, dt_abertura:"2025-08-02 11:00:00", dt_solucao:"2025-08-03 10:00:00", dt_fechamento:"2025-08-03 10:10:00", dt_limite_resolver:"2025-08-03 11:00:00", tecnico_id:3, tecnico:"Roberta", is_backlog:0, is_encerrado:1, is_vence_hoje:0, is_vence_7d:0, is_vencidos_mais_30d:0, is_no_prazo:null, is_fora_prazo:null, stars:5},
    ];

    // Se quiser "fixar" lista de atendentes mesmo sem ticket no período, você pode usar isso:
    const fixedTechs = [
      {tecnico_id: 1, tecnico: "Livia"},
      {tecnico_id: 2, tecnico: "Igor"},
      {tecnico_id: 3, tecnico: "Roberta"},
      // {tecnico_id: 4, tecnico: "Lee"}, ...
    ];

    // =========================
    // 2) HELPERS
    // =========================
    function pad(n){ return String(n).padStart(2,"0"); }
    function parseDT(x){
      if(!x) return null;
      // espera "YYYY-MM-DD HH:mm:ss"
      const [d,t] = x.split(" ");
      const [Y,M,D] = d.split("-").map(Number);
      const [h,m,s] = (t || "00:00:00").split(":").map(Number);
      return new Date(Y, (M-1), D, h||0, m||0, s||0, 0);
    }
    function inMonthYear(dt, year, month){
      if(!dt) return false;
      return dt.getFullYear() === year && (dt.getMonth()+1) === month;
    }
    function fmtDate(x){
      const d = parseDT(x);
      if(!d) return "—";
      return `${pad(d.getDate())}/${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    function typeLabel(tipo){ return tipo === 1 ? "Incidente" : "Requisição"; }

    function dotClass(n){
      if (n >= 10) return "bad";
      if (n >= 5)  return "warn";
      return "good";
    }

    // mock: cria datas relativas (pra você ver hoje/semana)
    function daysFromNow(n){
      const d = new Date();
      d.setDate(d.getDate() + n);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} 12:00:00`;
    }
    function todayAt(hhmm){
      const d = new Date();
      const [h,m] = hhmm.split(":").map(Number);
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(h)}:${pad(m)}:00`;
    }

    function groupBy(arr, keyFn){
      const m = new Map();
      for(const x of arr){
        const k = keyFn(x);
        if(!m.has(k)) m.set(k, []);
        m.get(k).push(x);
      }
      return m;
    }

    function safeAvg(nums){
      const v = nums.filter(n => typeof n === "number" && !Number.isNaN(n));
      if(!v.length) return null;
      return v.reduce((a,b)=>a+b,0) / v.length;
    }

    // =========================
    // 3) STATE + ELEMENTOS
    // =========================
    const elGrid = document.getElementById("grid");
    const elAno  = document.getElementById("ano");
    const elMes  = document.getElementById("mes");
    const elTipo = document.getElementById("tipo");
    const elSearch = document.getElementById("searchTech");

    const elMetaInfo = document.getElementById("metaInfo");
    const elKpiTotal = document.getElementById("kpiTotal");
    const elKpiSubTotal = document.getElementById("kpiSubTotal");
    const elKpiHoje = document.getElementById("kpiHoje");
    const elKpiSemana = document.getElementById("kpiSemana");

    const elTopAt = document.getElementById("topAtendimentos");
    const elTopAv = document.getElementById("topAvaliacoes");
    const elTopDe = document.getElementById("topDemandas");

    const elTechSelect = document.getElementById("techSelect");
    const elTechName = document.getElementById("techName");
    const elTechSubtitle = document.getElementById("techSubtitle");
    const elTechHoje = document.getElementById("techVenceHoje");
    const elTechSemana = document.getElementById("techVenceSemana");
    const elIncLine = document.getElementById("incLine");
    const elReqLine = document.getElementById("reqLine");
    const elTblHoje = document.getElementById("tblHoje");
    const elTblSemana = document.getElementById("tblSemana");

    const state = {
      raw: mockTickets,
      filtered: [],
      summaryByTech: new Map(),
      selectedTechId: null,
      search: ""
    };

    // =========================
    // 4) FILTRO (Tipo + Ano + Mês) aplicado no FRONT
    // =========================
    function applyFilters(){
      const tipo = elTipo.value; // BACKLOG | ENCERRADOS
      const year = Number(elAno.value);
      const month = Number(elMes.value);

      // base de data:
      // - BACKLOG -> usa dt_abertura
      // - ENCERRADOS -> usa dt_fechamento (se não tiver, dt_solucao)
      const out = state.raw.filter(t => {
        if(tipo === "BACKLOG"){
          if(!t.is_backlog) return false;
          const d = parseDT(t.dt_abertura);
          return inMonthYear(d, year, month);
        }
        // ENCERRADOS
        if(!t.is_encerrado) return false;
        const d = parseDT(t.dt_fechamento || t.dt_solucao);
        return inMonthYear(d, year, month);
      });

      state.filtered = out;
    }

    // =========================
    // 5) AGREGAÇÃO POR ATENDENTE (pra montar os cards)
    // =========================
    function summarizeTech(techId, techName, tickets){
      // Considera métricas só do dataset filtrado (state.filtered)
      const open = tickets.filter(t => t.is_backlog);

      const inc = open.filter(t => t.tipo_ticket === 1);
      const req = open.filter(t => t.tipo_ticket === 2);

      const inc_pend = inc.length;
      const inc_fora = inc.filter(t => t.is_fora_prazo).length;
      const inc_no   = inc.filter(t => t.is_no_prazo).length;
      const inc_v30  = inc.filter(t => t.is_vencidos_mais_30d).length;
      const inc_hj   = inc.filter(t => t.is_vence_hoje).length;
      const inc_7d   = inc.filter(t => t.is_vence_7d).length;

      const req_pend = req.length;
      const req_fora = req.filter(t => t.is_fora_prazo).length;
      const req_no   = req.filter(t => t.is_no_prazo).length;
      const req_v30  = req.filter(t => t.is_vencidos_mais_30d).length;
      const req_hj   = req.filter(t => t.is_vence_hoje).length;
      const req_7d   = req.filter(t => t.is_vence_7d).length;

      // SLA (se você quiser usar no card): calcula em tickets encerrados (no MES filtrado) DENTRO do SLA
      // Só faz sentido quando o filtro for ENCERRADOS, mas deixo pronto.
      const closed = tickets.filter(t => t.is_encerrado);
      const insideSla = closed.filter(t => {
        const solved = parseDT(t.dt_solucao || t.dt_fechamento);
        const limit = parseDT(t.dt_limite_resolver);
        if(!solved || !limit) return false;
        return solved <= limit;
      });
      const sla = closed.length ? Math.round(100 * (insideSla.length / closed.length)) : null;

      return {
        tecnico_id: techId,
        tecnico: techName,
        inc: {pend: inc_pend, fora: inc_fora, no: inc_no, v30: inc_v30, hoje: inc_hj, d7: inc_7d},
        req: {pend: req_pend, fora: req_fora, no: req_no, v30: req_v30, hoje: req_hj, d7: req_7d},
        slaPercent: sla,
        // listas para detalhe:
        venceHojeList: open.filter(t => t.is_vence_hoje),
        venceSemanaList: open.filter(t => t.is_vence_7d && !t.is_vence_hoje)
      };
    }

    function buildSummary(){
      const byTech = groupBy(state.filtered, t => t.tecnico_id);

      // garante fixedTechs aparecendo mesmo se não tiver nada no mês (fica zerado)
      state.summaryByTech = new Map();
      for(const ft of fixedTechs){
        const list = byTech.get(ft.tecnico_id) || [];
        state.summaryByTech.set(ft.tecnico_id, summarizeTech(ft.tecnico_id, ft.tecnico, list));
      }

      // também inclui qualquer outro técnico que venha nos dados, mesmo fora do fixed
      for(const [techId, list] of byTech.entries()){
        if(!state.summaryByTech.has(techId)){
          const name = list[0]?.tecnico || `Atendente ${techId}`;
          state.summaryByTech.set(techId, summarizeTech(techId, name, list));
        }
      }
    }

    // =========================
    // 6) RANKINGS (Geral)
    // =========================
    function renderRank(container, items, kind){
      // kind: "count" | "stars"
      container.innerHTML = "";
      const medals = ["🥇","🥈","🥉"];

      if(!items.length){
        container.innerHTML = `<div class="muted" style="padding:10px;">Sem dados no período.</div>`;
        return;
      }

      items.slice(0,3).forEach((it, idx) => {
        const val = kind === "stars"
          ? (it.value == null ? "—" : it.value.toFixed(2))
          : it.value;

        const sub = kind === "stars" ? "média ⭐" : "chamados";

        const div = document.createElement("div");
        div.className = "rank-item";
        div.innerHTML = `
          <div class="rank-left">
            <div class="medal">${medals[idx] || "🏅"}</div>
            <div>
              <div class="rank-name">${it.name}</div>
              <div class="muted" style="font-size:12px;">${sub}</div>
            </div>
          </div>
          <div class="rank-right"><strong>${val}</strong></div>
        `;
        container.appendChild(div);
      });
    }

    function buildRankings(){
      // Base: no filtro atual
      const summaries = [...state.summaryByTech.values()];

      // Top Atendimentos: total no filtro (BACKLOG => total aberto do mês; ENCERRADOS => total encerrado do mês)
      const topAt = summaries.map(s => ({
        id: s.tecnico_id,
        name: s.tecnico,
        value: (elTipo.value === "BACKLOG")
          ? (s.inc.pend + s.req.pend)
          : (state.filtered.filter(t => t.tecnico_id === s.tecnico_id).length)
      }))
      .sort((a,b) => b.value - a.value);

      renderRank(elTopAt, topAt.filter(x => x.value > 0), "count");

      // Top Demandas: quem fechou mais no mês/ano selecionado (independente do "Tipo")
      // (usa raw e aplica mês/ano por fechamento)
      const year = Number(elAno.value);
      const month = Number(elMes.value);
      const closedInMonth = state.raw.filter(t => {
        if(!t.is_encerrado) return false;
        const d = parseDT(t.dt_fechamento || t.dt_solucao);
        return inMonthYear(d, year, month);
      });

      const closedByTech = groupBy(closedInMonth, t => t.tecnico_id);
      const topDe = [...state.summaryByTech.values()].map(s => ({
        id: s.tecnico_id,
        name: s.tecnico,
        value: (closedByTech.get(s.tecnico_id) || []).length
      })).sort((a,b) => b.value - a.value);

      renderRank(elTopDe, topDe.filter(x => x.value > 0), "count");

      // Top Avaliações: média stars em encerrados no mês/ano
      const starsByTech = [...state.summaryByTech.values()].map(s => {
        const list = (closedByTech.get(s.tecnico_id) || []);
        const avg = safeAvg(list.map(x => x.stars).filter(v => v != null));
        return { id: s.tecnico_id, name: s.tecnico, value: avg };
      }).filter(x => x.value != null)
        .sort((a,b) => b.value - a.value);

      renderRank(elTopAv, starsByTech, "stars");
    }

    // =========================
    // 7) RENDER: Overview cards
    // =========================
    function cardPerson(s){
      const venceHoje = s.inc.hoje + s.req.hoje;
      const vence7d = s.inc.d7 + s.req.d7;
      return `
        <div class="person" data-tech="${s.tecnico_id}">
          <div class="person-head">
            <div class="person-name">
              <div class="avatar"></div>
              <div>${s.tecnico}</div>
            </div>
            <div class="pill" title="Destaques">
              <span class="dot ${dotClass(venceHoje)}"></span>
              <span>Hoje: <strong style="color:var(--text)">${venceHoje}</strong></span>
              <span style="opacity:.6">•</span>
              <span>7d: <strong style="color:var(--text)">${vence7d}</strong></span>
            </div>
          </div>

          <div class="person-body">
            <div class="split">
              <span class="badge">Inc. pend: <strong>${s.inc.pend}</strong></span>
              <span class="badge">Req. pend: <strong>${s.req.pend}</strong></span>
              <span class="badge">SLA: <strong>${s.slaPercent ?? "—"}%</strong></span>
            </div>

            <div class="divider"></div>

            <div class="cols">
              <div class="kpi">
                <div class="label">Fora do prazo</div>
                <div class="value">${s.inc.fora + s.req.fora}</div>
                <div class="tag"><span class="dot ${dotClass(s.inc.fora + s.req.fora)}"></span> atenção</div>
              </div>
              <div class="kpi">
                <div class="label">Vence hoje</div>
                <div class="value">${venceHoje}</div>
                <div class="tag"><span class="dot warn"></span> destaque</div>
              </div>
              <div class="kpi">
                <div class="label">Vencidos +30d</div>
                <div class="value">${s.inc.v30 + s.req.v30}</div>
                <div class="tag"><span class="dot bad"></span> urgente</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function renderOverview(){
      const search = (state.search || "").trim().toLowerCase();
      const list = [...state.summaryByTech.values()]
        .filter(s => !search || s.tecnico.toLowerCase().includes(search))
        .sort((a,b) => a.tecnico.localeCompare(b.tecnico, "pt-BR"));

      elGrid.innerHTML = list.map(cardPerson).join("");

      // click card => selecionar atendente
      elGrid.querySelectorAll(".person").forEach(card => {
        card.addEventListener("click", () => {
          const id = Number(card.dataset.tech);
          state.selectedTechId = id;
          elTechSelect.value = String(id);
          renderTechDetail();
          document.getElementById("detalhe").scrollIntoView({behavior:"smooth", block:"start"});
        });
      });
    }

    // =========================
    // 8) RENDER: Detalhe atendente
    // =========================
    function renderTicketRows(tickets, limit = 8){
      if(!tickets.length){
        return `<tr><td colspan="4" class="muted">Sem chamados aqui 🎉</td></tr>`;
      }
      return tickets
        .slice(0, limit)
        .map(t => `
          <tr>
            <td><strong>#${t.ticket_id}</strong></td>
            <td>${escapeHtml(t.titulo || "")}</td>
            <td><span class="type-badge">${typeLabel(t.tipo_ticket)}</span></td>
            <td>${fmtDate(t.dt_limite_resolver)}</td>
          </tr>
        `).join("");
    }

    function renderTechDetail(){
      const id = state.selectedTechId ?? Number(elTechSelect.value);
      state.selectedTechId = id;

      const s = state.summaryByTech.get(id);
      if(!s){
        elTechName.textContent = "—";
        elTechSubtitle.textContent = "Sem dados";
        elTechHoje.textContent = "—";
        elTechSemana.textContent = "—";
        elIncLine.textContent = "—";
        elReqLine.textContent = "—";
        elTblHoje.innerHTML = `<tr><td colspan="4" class="muted">Sem dados.</td></tr>`;
        elTblSemana.innerHTML = `<tr><td colspan="4" class="muted">Sem dados.</td></tr>`;
        return;
      }

      elTechName.textContent = s.tecnico;

      const totalOpen = s.inc.pend + s.req.pend;
      const tipoTxt = elTipo.value === "BACKLOG" ? "Backlog" : "Encerrados";
      elTechSubtitle.textContent = `${tipoTxt} no período • ${totalOpen} aberto(s) • Fora do prazo: ${s.inc.fora + s.req.fora}`;

      const venceHoje = s.inc.hoje + s.req.hoje;
      const venceSemana = s.inc.d7 + s.req.d7;

      elTechHoje.textContent = venceHoje;
      elTechSemana.textContent = venceSemana;

      elIncLine.textContent =
        `Pendentes: ${s.inc.pend} • Fora: ${s.inc.fora} • No prazo: ${s.inc.no} • Vence hoje: ${s.inc.hoje} • 7d: ${s.inc.d7} • +30d: ${s.inc.v30}`;

      elReqLine.textContent =
        `Pendentes: ${s.req.pend} • Fora: ${s.req.fora} • No prazo: ${s.req.no} • Vence hoje: ${s.req.hoje} • 7d: ${s.req.d7} • +30d: ${s.req.v30}`;

      // listas (do dataset filtrado)
      const hojeList = s.venceHojeList
        .sort((a,b) => (parseDT(a.dt_limite_resolver) ?? 0) - (parseDT(b.dt_limite_resolver) ?? 0));

      const semanaList = s.venceSemanaList
        .sort((a,b) => (parseDT(a.dt_limite_resolver) ?? 0) - (parseDT(b.dt_limite_resolver) ?? 0));

      elTblHoje.innerHTML = renderTicketRows(hojeList, 10);
      elTblSemana.innerHTML = renderTicketRows(semanaList, 10);
    }

    function escapeHtml(str){
      return String(str)
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;")
        .replaceAll('"',"&quot;")
        .replaceAll("'","&#039;");
    }

    // =========================
    // 9) GERAL KPIs
    // =========================
    function renderGeneral(){
      const total = state.filtered.length;
      const inc = state.filtered.filter(t => t.tipo_ticket === 1).length;
      const req = state.filtered.filter(t => t.tipo_ticket === 2).length;

      // Atenção: vence hoje/semana só faz sentido em ABERTOS.
      const openFromFiltered = state.filtered.filter(t => t.is_backlog);
      const venceHoje = openFromFiltered.filter(t => t.is_vence_hoje).length;
      const venceSemana = openFromFiltered.filter(t => t.is_vence_7d).length;

      elKpiTotal.textContent = total;
      elKpiSubTotal.textContent = `Incidentes: ${inc} • Requisições: ${req}`;

      elKpiHoje.textContent = venceHoje;
      elKpiSemana.textContent = venceSemana;

      elMetaInfo.textContent = `${elTipo.value} • ${elMes.options[elMes.selectedIndex].text}/${elAno.value}`;
    }

    // =========================
    // 10) TECH SELECT
    // =========================
    function renderTechSelect(){
      const list = [...state.summaryByTech.values()]
        .sort((a,b) => a.tecnico.localeCompare(b.tecnico, "pt-BR"));

      elTechSelect.innerHTML = list.map(s =>
        `<option value="${s.tecnico_id}">${s.tecnico}</option>`
      ).join("");

      if(state.selectedTechId == null){
        // tenta selecionar Livia se existir, senão o primeiro
        const liv = list.find(x => x.tecnico.toLowerCase().includes("livia"));
        state.selectedTechId = liv?.tecnico_id ?? list[0]?.tecnico_id ?? null;
      }
      if(state.selectedTechId != null){
        elTechSelect.value = String(state.selectedTechId);
      }
    }

    // =========================
    // 11) BOOTSTRAP + EVENTOS
    // =========================
    function initYears(){
      const now = new Date();
      const y = now.getFullYear();
      for(let i=0;i<6;i++){
        const opt = document.createElement("option");
        opt.value = String(y - i);
        opt.textContent = String(y - i);
        elAno.appendChild(opt);
      }
      // deixa 2025 se existir no dropdown, senão o atual
      const prefer = [...elAno.options].some(o => o.value === "2025") ? "2025" : String(y);
      elAno.value = prefer;
    }

    function loadTheme(){
      const saved = localStorage.getItem("theme");
      if(saved === "light" || saved === "dark"){
        document.documentElement.dataset.theme = saved;
      }
    }

    function toggleTheme(){
      const html = document.documentElement;
      html.dataset.theme = html.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", html.dataset.theme);
    }

    async function reload(){
      // Aqui é onde você troca mock por API:
      // const res = await fetch(`/api/tickets?ano=${elAno.value}&mes=${elMes.value}`);
      // state.raw = await res.json();

      applyFilters();
      buildSummary();
      renderGeneral();
      buildRankings();

      renderTechSelect();
      renderOverview();
      renderTechDetail();
    }

    document.getElementById("toggleTheme").addEventListener("click", toggleTheme);

    document.getElementById("refresh").addEventListener("click", reload);

    [elTipo, elAno, elMes].forEach(el => el.addEventListener("change", reload));

    elTechSelect.addEventListener("change", () => {
      state.selectedTechId = Number(elTechSelect.value);
      renderTechDetail();
    });

    elSearch.addEventListener("input", () => {
      state.search = elSearch.value;
      renderOverview();
    });

    // init
    loadTheme();
    initYears();
    // coloca mês atual se quiser (tira se preferir manter fixo)
    // elMes.value = String(new Date().getMonth()+1);

    reload();
