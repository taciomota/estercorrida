// EsterCorrida 2026 — App React completo com Supabase
// Instale: npm install @supabase/supabase-js
// Configure as variáveis abaixo com seus dados do Supabase

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIGURE AQUI ───────────────────────────────────────────
const SUPABASE_URL = "https://zwoiscpfxnzyxuyrsbwy.supabase.co";
const SUPABASE_ANON_KEY = "sb_secret_2UdC63G-Z0nGsSRhcY6EWw_NX-RSiO_";
// ──────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── REGRAS DE PONTUAÇÃO ──────────────────────────────────────
function calcBasePts(dist) {
  if (dist < 3) return 0;
  if (dist >= 42.195) return 12;
  if (dist >= 30) return 9;
  if (dist >= 25) return 7;
  if (dist >= 21) return 6;
  if (dist >= 17) return 5;
  if (dist >= 13) return 4;
  if (dist >= 10) return 3;
  if (dist >= 7) return 2;
  return 1;
}

function paceToSeconds(pace) {
  if (!pace || !pace.includes(":")) return 0;
  const [m, s] = pace.split(":").map(Number);
  return m * 60 + (s || 0);
}

function validateActivity(dist, pace, terrain, elev) {
  const errors = [];
  if (dist < 3) errors.push("Distância mínima é 3 km.");
  const sec = paceToSeconds(pace);
  if (sec > 510 && !(terrain === "trail" && elev >= 50)) {
    errors.push("Pace acima de 8'30\". Inválido (exceto trail com +50m elevação).");
  }
  return errors;
}

const BADGE_THRESHOLDS = [
  { min: 400, emoji: "🏆", label: "400+" },
  { min: 350, emoji: "🥇", label: "350+" },
  { min: 300, emoji: "🇳🇬", label: "300+" },
  { min: 225, emoji: "🟢", label: "225+" },
  { min: 180, emoji: "⚫️", label: "180+" },
  { min: 140, emoji: "🟣", label: "140+" },
  { min: 105, emoji: "🟠", label: "105+" },
  { min: 75,  emoji: "🔴", label: "75+" },
  { min: 50,  emoji: "🔵", label: "50+" },
  { min: 30,  emoji: "🟡", label: "30+" },
  { min: 15,  emoji: "⚪", label: "15+" },
];

function getBadge(pts) {
  for (const b of BADGE_THRESHOLDS) {
    if (pts >= b.min) return b.emoji;
  }
  return "";
}

const AVATAR_COLORS = [
  { bg: "#1D9E75", fg: "#fff" }, { bg: "#378ADD", fg: "#fff" },
  { bg: "#BA7517", fg: "#fff" }, { bg: "#D4537E", fg: "#fff" },
  { bg: "#7F77DD", fg: "#fff" }, { bg: "#639922", fg: "#fff" },
  { bg: "#D85A30", fg: "#fff" }, { bg: "#888780", fg: "#fff" },
  { bg: "#185FA5", fg: "#fff" }, { bg: "#3B6D11", fg: "#fff" },
  { bg: "#993556", fg: "#fff" }, { bg: "#985F0D", fg: "#fff" },
];

function getAvatarColor(id) {
  return AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// ─── COMPONENTES ─────────────────────────────────────────────

function Avatar({ runner }) {
  const c = getAvatarColor(runner.id);
  return (
    <div style={{
      width: 38, height: 38, borderRadius: "50%",
      background: c.bg, color: c.fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 600, fontSize: 13, flexShrink: 0,
    }}>
      {getInitials(runner.name)}
    </div>
  );
}

function Badge({ gender }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 6px", borderRadius: 3, fontWeight: 600,
      background: gender === "M" ? "#E6F1FB" : "#FBEAF0",
      color: gender === "M" ? "#185FA5" : "#993556",
      marginLeft: 4,
    }}>
      {gender}
    </span>
  );
}

function SerieBadge({ serie }) {
  return (
    <span style={{
      fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500,
      background: serie === "A" ? "#E1F5EE" : "#E6F1FB",
      color: serie === "A" ? "#0F6E56" : "#185FA5",
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      Série {serie}
    </span>
  );
}

// ─── TAB: RANKING ─────────────────────────────────────────────
function RankingTab({ runners, onSelectRunner }) {
  const serieA = [...runners].filter((r) => r.serie === "A").sort((a, b) => b.pts - a.pts || b.total_km - a.total_km);
  const serieB = [...runners].filter((r) => r.serie === "B").sort((a, b) => b.pts - a.pts || b.total_km - a.total_km);

  const renderList = (list, serie) => list.map((r, i) => {
    const isLast = serie === "A" && i === list.length - 1;
    const isPromo = serie === "B" && i < 2;
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
    const badge = getBadge(r.pts);
    return (
      <div key={r.id} onClick={() => onSelectRunner(r)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px", marginBottom: 6,
          background: "#fff", border: "0.5px solid #e5e5e3",
          borderRadius: 12, cursor: "pointer",
          transition: "border-color .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#bbb"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e5e3"}
      >
        <div style={{ minWidth: 26, textAlign: "center", fontSize: medal ? 18 : 13, fontWeight: 500, color: "#888" }}>
          {medal || i + 1}
        </div>
        <Avatar runner={r} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            {r.name} <Badge gender={r.gender} />
            {badge && <span style={{ fontSize: 16 }}>{badge}</span>}
            {isLast && <span style={{ fontSize: 10, color: "#A32D2D", fontWeight: 600 }}>⬇ rebaixamento</span>}
            {isPromo && <span style={{ fontSize: 10, color: "#0F6E56", fontWeight: 600 }}>⬆ acesso Série A</span>}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>{r.total_km.toFixed(1)} km</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: "#111" }}>{r.pts}</div>
          <div style={{ fontSize: 11, color: "#aaa" }}>ptos</div>
        </div>
      </div>
    );
  });

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 8 }}>
        <SerieBadge serie="A" /> — Semana 26/52
      </div>
      {renderList(serieA, "A")}
      <div style={{ fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: ".5px", textTransform: "uppercase", margin: "20px 0 8px" }}>
        <SerieBadge serie="B" />
      </div>
      {renderList(serieB, "B")}
      <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 12 }}>
        Toque em um corredor para ver detalhes · Empate desfeito por km percorridos
      </div>
    </div>
  );
}

// ─── TAB: REGISTRAR ──────────────────────────────────────────
function RegistrarTab({ runners, currentUser, onSuccess }) {
  const [dist, setDist] = useState("");
  const [pace, setPace] = useState("");
  const [elev, setElev] = useState("");
  const [terrain, setTerrain] = useState("road");
  const [bonusType, setBonusType] = useState("none");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const distNum = parseFloat(dist) || 0;
  const elevNum = parseInt(elev) || 0;
  const bonusMap = { none: 0, rp: 1, ultra: 2, general: 3 };
  const basePts = calcBasePts(distNum);
  const bonusPts = bonusMap[bonusType] || 0;
  const totalPts = basePts + bonusPts;
  const errors = distNum > 0 ? validateActivity(distNum, pace, terrain, elevNum) : [];

  async function submit() {
    if (!currentUser) { setMsg({ type: "err", text: "Selecione seu nome primeiro (topo da tela)." }); return; }
    if (errors.length) { setMsg({ type: "err", text: errors[0] }); return; }
    if (distNum < 3) { setMsg({ type: "err", text: "Distância mínima é 3 km." }); return; }
    setLoading(true);
    const { error } = await supabase.from("activities").insert({
      runner_id: currentUser.id,
      activity_date: date,
      distance_km: distNum,
      pace,
      elevation_m: elevNum,
      terrain,
      base_pts: basePts,
      bonus_pts: bonusPts,
      bonus_type: bonusType,
      notes,
    });
    if (!error) {
      await supabase.from("runners").update({
        pts: currentUser.pts + totalPts,
        total_km: parseFloat((currentUser.total_km + distNum).toFixed(2)),
      }).eq("id", currentUser.id);
      setMsg({ type: "ok", text: `✓ Atividade registrada! +${totalPts} ptos para ${currentUser.name}` });
      setDist(""); setPace(""); setElev(""); setBonusType("none"); setNotes("");
      onSuccess();
    } else {
      setMsg({ type: "err", text: "Erro ao salvar. Tente novamente." });
    }
    setLoading(false);
  }

  const inputStyle = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "0.5px solid #ddd", fontSize: 14, background: "#fff",
    color: "#111", outline: "none",
  };
  const labelStyle = { fontSize: 12, color: "#888", marginBottom: 3, display: "block" };

  return (
    <div style={{ background: "#f8f8f7", borderRadius: 12, padding: 16, border: "0.5px solid #eee" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={labelStyle}>Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Distância (km)</label>
          <input type="number" placeholder="0.0" step="0.1" min="0" value={dist} onChange={e => setDist(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Pace (min/km)</label>
          <input type="text" placeholder="5:30" value={pace} onChange={e => setPace(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Elevação (m)</label>
          <input type="number" placeholder="0" min="0" value={elev} onChange={e => setElev(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Terreno</label>
          <select value={terrain} onChange={e => setTerrain(e.target.value)} style={inputStyle}>
            <option value="road">Asfalto / Pista</option>
            <option value="trail">Trail / Montanha</option>
            <option value="sand">Areia</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Bônus</label>
          <select value={bonusType} onChange={e => setBonusType(e.target.value)} style={inputStyle}>
            <option value="none">Nenhum</option>
            <option value="rp">RP pessoal (+1 pto)</option>
            <option value="ultra">Ultrapassagem (+2 ptos)</option>
            <option value="general">Recorde Geral (+3 ptos)</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Observações (opcional)</label>
        <input type="text" placeholder="ex: Corrida no Aterro..." value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} />
      </div>

      {distNum >= 3 && (
        <div style={{
          background: "#fff", border: "0.5px solid #ddd", borderRadius: 10,
          padding: "10px 14px", marginBottom: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#888" }}>Pontos a ganhar</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1D9E75" }}>{totalPts} {totalPts === 1 ? "pto" : "ptos"}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#888" }}>
            Base: {basePts} pto{basePts !== 1 ? "s" : ""}<br />
            {bonusPts > 0 ? `Bônus: +${bonusPts} pto${bonusPts !== 1 ? "s" : ""}` : "Sem bônus"}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div style={{ background: "#FAEEDA", color: "#633806", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 10 }}>
          ⚠ {errors[0]}
        </div>
      )}

      {msg && (
        <div style={{
          background: msg.type === "ok" ? "#E1F5EE" : "#FCEBEB",
          color: msg.type === "ok" ? "#085041" : "#791F1F",
          padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 10,
        }}>
          {msg.text}
        </div>
      )}

      <button onClick={submit} disabled={loading || errors.length > 0}
        style={{
          width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
          background: errors.length > 0 ? "#ccc" : "#1D9E75",
          color: "#fff", fontWeight: 600, fontSize: 15, cursor: errors.length > 0 ? "not-allowed" : "pointer",
        }}>
        {loading ? "Registrando..." : "Registrar atividade"}
      </button>
    </div>
  );
}

// ─── TAB: RECORDES ───────────────────────────────────────────
function RecordesTab({ records }) {
  const dists = ["5km", "10km", "21km", "42km"];
  return (
    <div>
      {dists.map(d => {
        const masc = records.filter(r => r.distance === d && r.gender === "M").sort((a, b) => a.time_str.localeCompare(b.time_str));
        const fem = records.filter(r => r.distance === d && r.gender === "F").sort((a, b) => a.time_str.localeCompare(b.time_str));
        return (
          <div key={d} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 8 }}>
              Ranking {d}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[{ list: masc, label: "Masculino" }, { list: fem, label: "Feminino" }].map(({ list, label }) => (
                <div key={label} style={{ background: "#fff", border: "0.5px solid #e5e5e3", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>{label}</div>
                  {list.length === 0 ? <div style={{ fontSize: 12, color: "#ccc" }}>—</div> : list.slice(0, 5).map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: i < list.slice(0,5).length - 1 ? "0.5px solid #f0f0f0" : "none" }}>
                      <span style={{ color: "#555" }}>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`} {r.runner_name}</span>
                      <span style={{ fontWeight: 600, color: "#111" }}>{r.time_str}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TAB: REGRAS ─────────────────────────────────────────────
function RegrasTab() {
  const rows = (items) => items.map(([label, val]) => (
    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: 13 }}>
      <span style={{ color: "#666" }}>{label}</span>
      <span style={{ fontWeight: 600, color: "#111" }}>{val}</span>
    </div>
  ));
  return (
    <div>
      {[
        ["Pontuação por distância", [
          ["3 – 6,99 km", "1 pto"], ["7 – 9,99 km", "2 ptos"], ["10 – 12,99 km", "3 ptos"],
          ["13 – 16,99 km", "4 ptos"], ["17 – 20,99 km", "5 ptos"], ["21 – 24,99 km", "6 ptos"],
          ["25 – 29,99 km", "7 ptos"], ["30 – 42,19 km", "9 ptos"], ["42,195 km+ (maratona)", "12 ptos"],
        ]],
        ["Bônus (não cumulativo)", [
          ["RP pessoal (5/10/21 km)", "+1 pto"], ["Ultrapassagem de posição", "+2 ptos"], ["Recorde Geral", "+3 ptos"],
        ]],
        ["Premiação por período", [
          ["Melhor do mês (M e F separado)", "+3 ptos"], ["Melhor do semestre (M e F separado)", "+5 ptos"],
        ]],
        ["Validação", [
          ["Distância mínima", "3 km"], ["Pace máximo (asfalto/pista)", "8'30\"/km"],
          ["Trail com elevação +50m", "Pace livre"], ["Intervalo entre corridas no mesmo dia", "Mín. 4h"],
          ["Esteira", "Não permitida"],
        ]],
        ["Divisões 2026", [
          ["Série A", "1º ao 8º de 2025"], ["Série B", "9º em diante de 2025"],
          ["Rebaixamento", "8º da Série A no final de 2026"], ["Acesso", "1º e 2º da Série B em 2026"],
        ]],
      ].map(([title, items]) => (
        <div key={title} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
          <div style={{ background: "#fff", border: "0.5px solid #e5e5e3", borderRadius: 10, padding: "4px 14px" }}>
            {rows(items)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MODAL DE CORREDOR ───────────────────────────────────────
function RunnerModal({ runner, onClose }) {
  const [activities, setActivities] = useState([]);
  const c = getAvatarColor(runner.id);

  useEffect(() => {
    supabase.from("activities").select("*").eq("runner_id", runner.id).order("activity_date", { ascending: false }).limit(10)
      .then(({ data }) => setActivities(data || []));
  }, [runner.id]);

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 380,
        maxHeight: "80vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>
              {getInitials(runner.name)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{runner.name}</div>
              <div style={{ fontSize: 12, color: "#888" }}>Série {runner.serie} · {runner.gender === "M" ? "Masculino" : "Feminino"} {getBadge(runner.pts)}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa" }}>×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
          {[["Pontos", runner.pts], ["Km totais", runner.total_km.toFixed(1)]].map(([l, v]) => (
            <div key={l} style={{ background: "#f8f8f7", borderRadius: 10, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#aaa" }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 8 }}>
          Últimas atividades
        </div>
        {activities.length === 0 ? (
          <div style={{ fontSize: 13, color: "#bbb", padding: "8px 0" }}>Nenhuma atividade registrada ainda.</div>
        ) : activities.map(a => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: 13 }}>
            <span style={{ color: "#555" }}>{a.activity_date} · {parseFloat(a.distance_km).toFixed(1)} km {a.pace ? `· ${a.pace}/km` : ""}</span>
            <span style={{ fontWeight: 700, color: "#1D9E75" }}>+{a.base_pts + a.bonus_pts} ptos</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ───────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("ranking");
  const [runners, setRunners] = useState([]);
  const [records, setRecords] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedRunner, setSelectedRunner] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [{ data: r }, { data: rec }] = await Promise.all([
      supabase.from("runners").select("*").order("pts", { ascending: false }),
      supabase.from("speed_records").select("*"),
    ]);
    setRunners(r || []);
    setRecords(rec || []);
    if (currentUser) {
      const updated = (r || []).find(x => x.id === currentUser.id);
      if (updated) setCurrentUser(updated);
    }
    setLoading(false);
  }, [currentUser?.id]);

  useEffect(() => { fetchData(); }, []);

  const tabs = ["ranking", "registrar", "recordes", "regras"];
  const tabLabels = { ranking: "Ranking", registrar: "Registrar", recordes: "Recordes", regras: "Regras" };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "16px 16px 80px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#f5f5f3", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
          Ester<span style={{ color: "#1D9E75" }}>Corrida</span>{" "}
          <span style={{ fontSize: 13, fontWeight: 400, color: "#aaa" }}>2026</span>
        </div>
        <select
          value={currentUser?.id || ""}
          onChange={e => {
            const r = runners.find(x => x.id === parseInt(e.target.value));
            setCurrentUser(r || null);
          }}
          style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "0.5px solid #ddd", background: "#fff", color: "#333", maxWidth: 140 }}
        >
          <option value="">Quem é você?</option>
          {[...runners].sort((a, b) => a.name.localeCompare(b.name)).map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.serie})</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>Carregando...</div>
      ) : (
        <>
          {tab === "ranking" && <RankingTab runners={runners} onSelectRunner={setSelectedRunner} />}
          {tab === "registrar" && <RegistrarTab runners={runners} currentUser={currentUser} onSuccess={fetchData} />}
          {tab === "recordes" && <RecordesTab records={records} />}
          {tab === "regras" && <RegrasTab />}
        </>
      )}

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#fff", borderTop: "0.5px solid #eee",
        display: "flex", justifyContent: "space-around", padding: "8px 0 12px",
        zIndex: 50,
      }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: tab === t ? 700 : 400,
              color: tab === t ? "#1D9E75" : "#999",
              padding: "4px 12px",
            }}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* Runner Modal */}
      {selectedRunner && <RunnerModal runner={selectedRunner} onClose={() => setSelectedRunner(null)} />}
    </div>
  );
}
