import "dotenv/config";
import express from "express";
import mariadb from "mariadb";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = Number(process.env.PORT || 3001);
const GLPI_BASE_URL = process.env.GLPI_BASE_URL || "https://chamados.grupofan.com";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// ✅ Serve index.html + styles.css + app.js pela própria API (sem Live Server)
app.use(express.static(__dirname));

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

// ✅ IDs de categorias de Demanda (sua lista)
const DEMAND_CATEGORY_IDS = [
  521,647,740,784,785,786,787,788,789,790,791,792,793,794,795,796,797,798,799,800,801,
  864,865,868,869,877,882,883,884,886,887,888,889,890,891,892,893,894,895,896,897,898,
  899,900,901,902,903,904,905,906
];
const DEMAND_IDS_SQL = DEMAND_CATEGORY_IDS.join(",");
const TEAM_GROUP_IDS = [98, 57, 2, 23, 22, 71];



function monthWindow(ano, mes) {
  const y = Number(ano);
  const m = Number(mes);
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null;

  // usa UTC só pra gerar strings estáveis
  const dtIni = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const dtFim = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  const fmt = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")} 00:00:00`;
  return { dtIni: fmt(dtIni), dtFim: fmt(dtFim) };
}

/**
 * Dataset base: 1 linha = 1 ticket + 1 técnico atribuído
 * - SLA atendimento (TTO) + SLA solução (TTR)
 * - Avaliação pendente (encerrado sem resposta)
 * - Demanda por lista de categorias
 * - Complexidade via plugin fields (glpi_plugin_fields_tickettickets.items_id)
 */
const SQL_DATASET_BASE = `
SELECT
  t.id                         AS ticket_id,
  t.name                       AS titulo,
  t.type                       AS tipo_ticket,         -- 1 incidente, 2 requisição
  t.status                     AS status_ticket,

  t.date                       AS dt_abertura,
  t.takeintoaccountdate        AS dt_atendimento,
  t.solvedate                  AS dt_solucao,
  t.closedate                  AS dt_fechamento,

  t.slas_id_tto                AS slas_id_tto,
  t.slas_id_ttr                AS slas_id_ttr,
  t.time_to_own                AS dt_limite_atender,
  t.time_to_resolve            AS dt_limite_resolver,

  t.itilcategories_id          AS categoria_id,
  c.completename               AS categoria_path,

  CASE WHEN t.itilcategories_id IN (${DEMAND_IDS_SQL}) THEN 1 ELSE 0 END AS is_demanda,

  -- Técnico atribuído
  tu.users_id                  AS tecnico_id,
  u.name                       AS login_tecnico,
  u.firstname                  AS primeiro_nome_tecnico,
  u.realname                   AS nome_completo_tecnico,
  COALESCE(
    NULLIF(CONCAT(TRIM(u.firstname), ' ', SUBSTRING_INDEX(TRIM(u.realname), ' ', 1)), ' '),
    NULLIF(TRIM(u.firstname), ''),
    NULLIF(SUBSTRING_INDEX(TRIM(u.realname), ' ', 1), ''),
    u.name
  ) AS tecnico,

  -- Requerente + email default
  ur.id                        AS requerente_id,
  ur.realname                  AS requerente_nome,
  urem.email                   AS email_requerente,

  -- ⭐ Avaliação
  ts.satisfaction              AS stars,
  ts.date_answered             AS stars_date,
  ts.comment                   AS stars_comment,

  CASE
    WHEN t.status IN (5,6) AND (ts.tickets_id IS NULL OR ts.date_answered IS NULL) THEN 1
    ELSE 0
  END AS avaliacao_pendente,

  -- ✅ Complexidade (plugin fields)
 pft.plugin_fields_complexidadefielddropdowns_id AS complexidade_id,
cpx.name                                         AS complexidade_label,

CASE
  WHEN pft.plugin_fields_complexidadefielddropdowns_id IS NULL
    OR pft.plugin_fields_complexidadefielddropdowns_id = 0
  THEN NULL
  WHEN cpx.name LIKE '1%' THEN 1
  WHEN cpx.name LIKE '2%' THEN 2
  WHEN cpx.name LIKE '3%' THEN 3
  ELSE NULL
END AS complexidade_points,

CASE
  WHEN t.itilcategories_id IN (${DEMAND_IDS_SQL})
   AND (
     pft.plugin_fields_complexidadefielddropdowns_id IS NULL
     OR pft.plugin_fields_complexidadefielddropdowns_id = 0
   )
  THEN 1 ELSE 0
END AS complexidade_pendente,


  (t.status NOT IN (5,6))      AS is_backlog,
  (t.status IN (5,6))          AS is_encerrado,

  -- SLA Atendimento (TTO)
  (t.time_to_own IS NULL) AS sla_atendimento_faltando,
  CASE WHEN t.time_to_own IS NULL THEN NULL WHEN NOW() >  t.time_to_own THEN 1 ELSE 0 END AS atendimento_fora_prazo,
  CASE WHEN t.time_to_own IS NULL THEN NULL WHEN NOW() <= t.time_to_own THEN 1 ELSE 0 END AS atendimento_no_prazo,
  CASE WHEN t.time_to_own IS NULL THEN NULL WHEN DATE(t.time_to_own) = CURDATE() THEN 1 ELSE 0 END AS atendimento_vence_hoje,
  CASE WHEN t.time_to_own IS NULL THEN NULL WHEN t.time_to_own > NOW() AND t.time_to_own < NOW() + INTERVAL 7 DAY THEN 1 ELSE 0 END AS atendimento_vence_7d,
  CASE WHEN t.time_to_own IS NULL THEN NULL WHEN t.time_to_own < NOW() - INTERVAL 30 DAY THEN 1 ELSE 0 END AS atendimento_vencidos_mais_30d,
  CASE WHEN t.time_to_own IS NULL OR t.takeintoaccountdate IS NULL THEN NULL
       WHEN t.takeintoaccountdate <= t.time_to_own THEN 1 ELSE 0 END AS atendimento_cumpriu_sla,

  -- SLA Solução (TTR)
  (t.time_to_resolve IS NULL) AS sla_solucao_faltando,
  CASE WHEN t.time_to_resolve IS NULL THEN NULL WHEN NOW() >  t.time_to_resolve THEN 1 ELSE 0 END AS solucao_fora_prazo,
  CASE WHEN t.time_to_resolve IS NULL THEN NULL WHEN NOW() <= t.time_to_resolve THEN 1 ELSE 0 END AS solucao_no_prazo,
  CASE WHEN t.time_to_resolve IS NULL THEN NULL WHEN DATE(t.time_to_resolve) = CURDATE() THEN 1 ELSE 0 END AS solucao_vence_hoje,
  CASE WHEN t.time_to_resolve IS NULL THEN NULL WHEN t.time_to_resolve > NOW() AND t.time_to_resolve < NOW() + INTERVAL 7 DAY THEN 1 ELSE 0 END AS solucao_vence_7d,
  CASE WHEN t.time_to_resolve IS NULL THEN NULL WHEN t.time_to_resolve < NOW() - INTERVAL 30 DAY THEN 1 ELSE 0 END AS solucao_vencidos_mais_30d,
  CASE WHEN t.time_to_resolve IS NULL OR t.solvedate IS NULL THEN NULL
       WHEN t.solvedate <= t.time_to_resolve THEN 1 ELSE 0 END AS solucao_cumpriu_sla

       -- Buckets de ATENDIMENTO (baseado no time_to_own)
CASE
  WHEN t.time_to_own IS NULL THEN NULL
  WHEN t.time_to_own < NOW() - INTERVAL 30 DAY THEN 1
  ELSE 0
END AS own_vencidos_mais_30d,

CASE
  WHEN t.time_to_own IS NULL THEN NULL
  WHEN DATE(t.time_to_own) = CURDATE() THEN 1
  ELSE 0
END AS own_vence_hoje,

CASE
  WHEN t.time_to_own IS NULL THEN NULL
  WHEN t.time_to_own > NOW()
   AND t.time_to_own < NOW() + INTERVAL 7 DAY THEN 1
  ELSE 0
END AS own_vence_7d


FROM glpi_tickets t
LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id

JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 2
JOIN glpi_users u ON u.id = tu.users_id

LEFT JOIN glpi_users ur ON ur.id = t.users_id_recipient
LEFT JOIN glpi_useremails urem ON urem.users_id = ur.id AND urem.is_default = 1

LEFT JOIN glpi_ticketsatisfactions ts ON ts.tickets_id = t.id

LEFT JOIN glpi_plugin_fields_ticketrecorrentes pft
  ON pft.items_id = t.id
 AND (pft.itemtype = 'Ticket' OR pft.itemtype IS NULL)

LEFT JOIN glpi_plugin_fields_complexidadefielddropdowns cpx
  ON cpx.id = pft.plugin_fields_complexidadefielddropdowns_id



WHERE t.is_deleted = 0
AND u.id IN (1493,231,1166,1078,369,1036,678,490,13,293,1003,964,564,234,1497, 1474)


`;

function buildTicketsQuery({ tipo, dtIni, dtFim, tecnicoIds }) {
  const TIPO = String(tipo || "BACKLOG").toUpperCase();
  let sql = SQL_DATASET_BASE;
  const params = [];

  const hasPeriod = Boolean(dtIni && dtFim);

  if (TIPO === "BACKLOG") {
    sql += ` AND t.status NOT IN (5,6)`;
    if (hasPeriod) {
      sql += ` AND t.date >= ? AND t.date < ?`;
      params.push(dtIni, dtFim);
    }
  } else if (TIPO === "ENCERRADOS") {
    sql += ` AND t.status IN (5,6)`;
    if (hasPeriod) {
      sql += ` AND COALESCE(t.closedate, t.solvedate) >= ? AND COALESCE(t.closedate, t.solvedate) < ?`;
      params.push(dtIni, dtFim);
    }
  } else {
    if (hasPeriod) {
      sql += ` AND t.date >= ? AND t.date < ?`;
      params.push(dtIni, dtFim);
    }
  }

  if (tecnicoIds?.length) {
    sql += ` AND u.id IN (${tecnicoIds.map(() => "?").join(",")})`;
    params.push(...tecnicoIds);
  }

  sql += ` ORDER BY tecnico, ticket_id DESC LIMIT 8000`;
  return { sql, params };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, port: PORT });
});

app.get("/api/tickets", async (req, res) => {
  try {
    const tipo = String(req.query.tipo || "BACKLOG").toUpperCase();
    const ano = req.query.ano ? Number(req.query.ano) : null;
    const mes = req.query.mes ? Number(req.query.mes) : null;

    const usersParam = String(req.query.users || "").trim();
    const tecnicoIds = usersParam
      ? usersParam.split(",").map(x => Number(x.trim())).filter(n => Number.isInteger(n))
      : [];

    let dtIni = null, dtFim = null;
    if (ano && mes) {
      const w = monthWindow(ano, mes);
      if (w) ({ dtIni, dtFim } = w);
    }

    const { sql, params } = buildTicketsQuery({ tipo, dtIni, dtFim, tecnicoIds });

    const conn = await pool.getConnection();
    try {
      const rows = await conn.query(sql, params);
      res.json({ baseUrl: GLPI_BASE_URL, rows });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get("/api/pending-evals", async (req, res) => {
  try {
    const ano = req.query.ano ? Number(req.query.ano) : null;
    const mes = req.query.mes ? Number(req.query.mes) : null;

    let dtIni = null, dtFim = null;
    if (ano && mes) {
      const w = monthWindow(ano, mes);
      if (w) ({ dtIni, dtFim } = w);
    }

    let sql = `
      SELECT
        t.id AS ticket_id,
        t.name AS titulo,
        t.closedate AS dt_fechamento,
        COALESCE(
          NULLIF(CONCAT(TRIM(u.firstname), ' ', SUBSTRING_INDEX(TRIM(u.realname), ' ', 1)), ' '),
          NULLIF(TRIM(u.firstname), ''),
          NULLIF(SUBSTRING_INDEX(TRIM(u.realname), ' ', 1), ''),
          u.name
        ) AS tecnico
      FROM glpi_tickets t
      JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 2
      JOIN glpi_users u ON u.id = tu.users_id
      LEFT JOIN glpi_ticketsatisfactions ts ON ts.tickets_id = t.id
      WHERE t.is_deleted = 0
        AND t.status IN (5,6)
        AND (ts.tickets_id IS NULL OR ts.date_answered IS NULL)
    `;
    const params = [];

    if (dtIni && dtFim) {
      sql += ` AND COALESCE(t.closedate, t.solvedate) >= ? AND COALESCE(t.closedate, t.solvedate) < ?`;
      params.push(dtIni, dtFim);
    }

    sql += ` ORDER BY t.closedate DESC LIMIT 500`;

    const conn = await pool.getConnection();
    try {
      const rows = await conn.query(sql, params);
      res.json({ baseUrl: GLPI_BASE_URL, rows });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

app.get("/api/missing-complexity", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    try {
      const sql = `
        SELECT
          t.id AS ticket_id,
          t.name AS titulo,
          c.completename AS categoria_path,
          COALESCE(
            NULLIF(CONCAT(TRIM(u.firstname), ' ', SUBSTRING_INDEX(TRIM(u.realname), ' ', 1)), ' '),
            NULLIF(TRIM(u.firstname), ''),
            NULLIF(SUBSTRING_INDEX(TRIM(u.realname), ' ', 1), ''),
            u.name
          ) AS tecnico
        FROM glpi_tickets t
        LEFT JOIN glpi_itilcategories c ON c.id = t.itilcategories_id
        JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 2
        JOIN glpi_users u ON u.id = tu.users_id
        LEFT JOIN glpi_plugin_fields_tickettickets pft
          ON pft.items_id = t.id
         AND (pft.itemtype = 'Ticket' OR pft.itemtype IS NULL)
        WHERE t.is_deleted = 0
          AND t.status NOT IN (5,6)
          AND t.itilcategories_id IN (${DEMAND_IDS_SQL})
          AND (pft.plugin_fields_complexidadefielddropdowns_id IS NULL OR pft.plugin_fields_complexidadefielddropdowns_id = 0)
        ORDER BY t.date DESC
        LIMIT 500
      `;
      const rows = await conn.query(sql);
      res.json({ rows });
    } finally {
      conn.release();
    }
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

// ✅ fallback: abre o index
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Painel: http://localhost:${PORT}/`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
});
