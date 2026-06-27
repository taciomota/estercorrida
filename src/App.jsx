// EsterCorrida 2026 — App React completo com Supabase + Hugging Face Vision
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zwoiscpfxnzyxuyrsbwy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3b2lzY3BmeG56eXh1eXJzYnd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzOTEwMDEsImV4cCI6MjA5Nzk2NzAwMX0.cDAIBk7KQotxmSMzRCJSyj-jUrsGu4gqmO3lhP8bWW4";
const HF_TOKEN = process.env.REACT_APP_HF_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  { min: 400, emoji: "🏆" }, { min: 350, emoji: "🥇" }, { min: 300, emoji: "🇳🇬" },
  { min: 225, emoji: "🟢" }, { min: 180, emoji: "⚫️" }, { min: 140, emoji: "🟣" },
  { min: 105, emoji: "🟠" }, { min: 75, emoji: "🔴" }, { min: 50, emoji: "🔵" },
  { min: 30, emoji: "🟡" }, { min: 15, emoji: "⚪" },
];

function getBadge(pts) {
  for (const b of BADGE_THRESHOLDS) { if (pts >= b.min) return b.emoji; }
  return "";
}

const AVATAR_COLORS = [
  { bg: "#1D9E75", fg: "#fff" }, { bg: "#378ADD", fg: "#fff" }, { bg: "#BA7517", fg: "#fff" },
  { bg: "#D4537E", fg: "#fff" }, { bg: "#7F77DD", fg: "#fff" }, { bg: "#639922", fg: "#fff" },
  { bg: "#D85A30", fg: "#fff" }, { bg: "#888780", fg: "#fff" }, { bg: "#185FA5", fg: "#fff" },
  { bg: "#3B6D11", fg: "#fff" }, { bg: "#993556", fg: "#fff" }, { bg: "#985F0D", fg: "#fff" },
];

function getAvatarColor(id) { return AVATAR_COLORS[(id - 1) % AVATAR_COLORS.length]; }
function getInitials(name) { return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(); }

async function analyzeRunImage(base64Image, mimeType) {
  const prompt = `You are analyzing a running app screenshot (Strava, Garmin, Nike Run, Apple Watch, etc).

Extract the running data visible in this image and respond ONLY with valid JSON, no extra text:

{
  "distancia_km": distance in km as number (ex: 10.2),
  "pace": average pace as "M:SS" per km (ex: "5:30"),
  "data": date as "YYYY-MM-DD" if visible, otherwise null,
  "elevacao_m": elevation gain in meters as number, 0 if not visible,
  "app_detectado": name of the app or device detected,
  "confianca": "alta"
}

If you cannot identify the distance, respond with {"erro": "nao identificado"}.`;

  try {
    const response = await fetch(
      "https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-11B-Vision-Instruct/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
              ]
            }
          ],
          max_tokens: 512,
          temperature: 0.1,
        })
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error("API erro " + response.status + ": " + errBody);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) throw new Error("Resposta vazia da API");

    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) throw new Error("JSON nao encontrado: " + clean);

    return JSON.parse(clean.slice(firstBrace, lastBrace + 1));

  } catch (err) {
    return { erro: err.message || "Erro desconhecido" };
  }
}

function Avatar({ runner, size = 38 }) {
  const c = getAvatarColor(runner.id);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: c.bg, color: c.fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 600, fontSize: Math.floor(size * 0.36), flexShrink: 0,
    }}>
      {getInitials(runner.name)}
    </div>
  );
}

function GenderBadge({ gender }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 6px", borderRadius: 3, fontWeight: 600, marginLeft: 4,
      background: gender === "M" ? "#E6F1FB" : "#FBEAF0",
      color: gender === "M" ? "#185FA5" : "#993556",
    }}>{gender}</span>
  );
}

function SerieBadge({ serie }) {
  return (
    <span style={{
      fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500,
      background: serie === "A" ? "#E1F5EE" : "#E6F1FB",
      color: serie === "A" ? "#0F6E56" : "#185FA5",
    }}>Série {serie}</span>
  );
}

function RankingTab({ runners, onSelectRunner }) {
  const serieA = [...runners].filter(r => r.serie === "A").sort((a, b) => b.pts - a.pts || b.total_km - a.total_km);
  const serieB = [...runners].filter(r => r.serie === "B").sort((a, b) => b.pts - a.pts || b.total_km - a.total_km);

  const renderList = (list, serie) => list.map((r, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
    const isLast = serie === "A" && i === list.length - 1;
    const isPromo = serie === "B" && i < 2;
    return (
      <div key={r.id} onClick={() => onSelectRunner(r)} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 6,
        background: "#fff", border: "0.5px solid #e5e5e3", borderRadius: 12, cursor: "pointer", transition: "border-color .15s",
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
            {r.name} <GenderBadge gender={r.gender} />
            {getBadge(r.pts) && <span style={{ fontSize: 16 }}>{getBadge(r.pts)}</span>}
            {isLast && <span style={{ fontSize: 10, background: "#FCEBEB", color: "#791F1F", padding: "2px 6px", borderRadius: 3, fontWeight: 600 }}>⬇ rebaixamento</span>}
            {isPromo && <span style={{ fontSize: 10, background: "#E1F5EE", color: "#085041", padding: "2px 6px", borderRadius: 3, fontWeight: 600 }}>⬆ acesso A</span>}
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

function RegistrarTab({ runners, currentUser, onSuccess }) {
  const [dist, setDist] = useState("");
  const [pace, setPace] = useState("");
  const [elev, setElev] = useState("");
  const [terrain, setTerrain] = useState("road");
  const [bonusType, setBonusType] = useState("none");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [previewImg, setPreviewImg] = useState(null);
  const [appDetected, setAppDetected] = useState(null);
  const fileRef = useRef();

  const distNum = parseFloat(dist) || 0;
  const elevNum = parseInt(elev) || 0;
  const bonusMap = { none: 0, rp: 1, ultra: 2, general: 3 };
  const basePts = calcBasePts(distNum);
  const bonusPts = bonusMap[bonusType] || 0;
  const totalPts = basePts + bonusPts;
  const errors = distNum > 0 ? validateActivity(distNum, pace, terrain, elevNum) : [];

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAnalyzing(true);
    setMsg(null);
    setAppDetected(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64Full = ev.target.result;
      setPreviewImg(base64Full);
      const base64 = base64Full.split(",")[1];
      const mimeType = file.type;

      const result = await analyzeRunImage(base64, mimeType);

      if (result.erro) {
        setMsg({ type: "err", text: "Erro: " + result.erro });
      } else {
        if (result.distancia_km) setDist(String(result.distancia_km));
        if (result.pace) setPace(result.pace);
        if (result.data) setDate(result.data);
        if (result.elevacao_m) setElev(String(result.elevacao_m));
        if (result.elevacao_m >= 50) setTerrain("trail");
        setAppDetected(result.app_detectado);
        setMsg({ type: "ok", text: `✓ Dados lidos! Confira os campos abaixo antes de registrar.` });
      }
      setAnalyzing(false);
    };
    reader.readAsDataURL(file);
  }

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
      setDist(""); setPace(""); setElev(""); setBonusType("none"); setNotes(""); setPreviewImg(null); setAppDetected(null);
      onSuccess();
    } else {
      setMsg({ type: "err", text: "Erro ao salvar. Tente novamente." });
    }
    setLoading(false);
  }

  const inputStyle = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid #ddd", fontSize: 14, background: "#fff", color: "#111", outline: "none" };
  const labelStyle = { fontSize: 12, color: "#888", marginBottom: 3, display: "block" };

  return (
    <div style={{ background: "#f8f8f7", borderRadius: 12, padding: 16, border: "0.5px solid #eee" }}>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageUpload} />
      <div onClick={() => fileRef.current.click()}
        style={{ border: "1.5px dashed #1D9E75", borderRadius: 12, padding: "16px", textAlign: "center", cursor: "pointer", marginBottom: 14, background: "#E1F5EE" }}
      >
        {analyzing ? (
          <div>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F6E56" }}>Analisando o print...</div>
            <div style={{ fontSize: 12, color: "#5DCAA5", marginTop: 4 }}>A IA está lendo os dados da sua corrida</div>
          </div>
        ) : previewImg ? (
          <div>
            <img src={previewImg} alt="Print da corrida" style={{ maxHeight: 120, borderRadius: 8, marginBottom: 8, maxWidth: "100%" }} />
            {appDetected && <div style={{ fontSize: 11, color: "#0F6E56", fontWeight: 500 }}>📱 {appDetected} · Toque para trocar</div>}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 32, marginBottom: 6 }}>📸</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#0F6E56" }}>Enviar print da corrida</div>
            <div style={{ fontSize: 12, color: "#5DCAA5", marginTop: 4 }}>Strava, Garmin, Nike Run, Apple Watch...</div>
            <div style={{ fontSize: 11, color: "#9FE1CB", marginTop: 2 }}>A IA preenche os campos automaticamente</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div><label style={labelStyle}>Data</label><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Distância (km)</label><input type="number" placeholder="0.0" step="0.1" min="0" value={dist} onChange={e => setDist(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Pace (min/km)</label><input type="text" placeholder="5:30" value={pace} onChange={e => setPace(e.target.value)} style={inputStyle} /></div>
        <div><label style={labelStyle}>Elevação (m)</label><input type="number" placeholder="0" min="0" value={elev} onChange={e => setElev(e.target.value)} style={inputStyle} /></div>
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
        <div style={{ background: "#fff", border: "0.5px solid #ddd", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

      {errors.length > 0 && <div style={{ background: "#FAEEDA", color: "#633806", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 10 }}>⚠ {errors[0]}</div>}
      {msg && <div style={{ background: msg.type === "ok" ? "#E1F5EE" : "#FCEBEB", color: msg.type === "ok" ? "#085041" : "#791F1F", padding: "8px 12px", borderRadius: 8, fontSize: 13, marginBottom: 10 }}>{msg.text}</div>}

      <button onClick={submit} disabled={loading || errors.length > 0 || analyzing}
        style={{ width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: (errors.length > 0 || analyzing) ? "#ccc" : "#1D9E75", color: "#fff", fontWeight: 600, fontSize: 15, cursor: (errors.length > 0 || analyzing) ? "not-allowed" : "pointer" }}>
        {loading ? "Registrando..." : "Registrar atividade"}
      </button>
    </div>
  );
}

function RecordesTab({ records }) {
  const dists = ["5km", "10km", "21km", "42km"];
  return (
    <div>
      {dists.map(d => {
        const masc = records.filter(r => r.distance === d && r.gender === "M").sort((a, b) => a.time_str.localeCompare(b.time_str));
        const fem = records.filter(r => r.distance === d && r.gender === "F").sort((a, b) => a.time_str.localeCompare(b.time_str));
        return (
          <div key={d} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 8 }}>Ranking {d}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[{ list: masc, label: "Masculino" }, { list: fem, label: "Feminino" }].map(({ list, label }) => (
                <div key={label} style={{ background: "#fff", border: "0.5px solid #e5e5e3", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#aaa", marginBottom: 6 }}>{label}</div>
                  {list.length === 0 ? <div style={{ fontSize: 12, color: "#ccc" }}>—</div> :
                    list.slice(0, 5).map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: i < Math.min(list.length, 5) - 1 ? "0.5px solid #f0f0f0" : "none" }}>
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

function RegrasTab() {
  const sections = [
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
      ["Trail com elevação +50m", "Pace livre"], ["Intervalo entre corridas/dia", "Mín. 4h"],
      ["Esteira", "Não permitida"],
    ]],
    ["Divisões 2026", [
      ["Série A", "1º ao 8º de 2025"], ["Série B", "9º em diante de 2025"],
      ["Rebaixamento", "8º da Série A no final de 2026"], ["Acesso", "1º e 2º da Série B em 2026"],
    ]],
  ];
  return (
    <div>
      {sections.map(([title, items]) => (
        <div key={title} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
          <div style={{ background: "#fff", border: "0.5px solid #e5e5e3", borderRadius: 10, padding: "4px 14px" }}>
            {items.map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: 13 }}>
                <span style={{ color: "#666" }}>{label}</span>
                <span style={{ fontWeight: 600, color: "#111" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RunnerModal({ runner, onClose }) {
  const [activities, setActivities] = useState([]);
  const c = getAvatarColor(runner.id);
  useEffect(() => {
    supabase.from("activities").select("*").eq("runner_id", runner.id)
      .order("activity_date", { ascending: false }).limit(10)
      .then(({ data }) => setActivities(data || []));
  }, [runner.id]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 20, width: "100%", maxWidth: 380, maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: c.bg, color: c.fg, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>
              {getInitials(runner.name)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{runner.name} {getBadge(runner.pts)}</div>
              <div style={{ fontSize: 12, color: "#888" }}>Série {runner.serie} · {runner.gender === "M" ? "Masculino" : "Feminino"}</div>
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
        <div style={{ fontSize: 12, fontWeight: 600, color: "#888", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 8 }}>Últimas atividades</div>
        {activities.length === 0 ? (
          <div style={{ fontSize: 13, color: "#bbb", padding: "8px 0" }}>Nenhuma atividade registrada ainda.</div>
        ) : activities.map(a => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: 13 }}>
            <span style={{ color: "#555" }}>{a.activity_date} · {parseFloat(a.distance_km).toFixed(1)} km{a.pace ? ` · ${a.pace}/km` : ""}</span>
            <span style={{ fontWeight: 700, color: "#1D9E75" }}>+{a.base_pts + a.bonus_pts} ptos</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5 }}>
          Ester<span style={{ color: "#1D9E75" }}>Corrida</span>
          <span style={{ fontSize: 13, fontWeight: 400, color: "#aaa" }}> 2026</span>
        </div>
        <select value={currentUser?.id || ""} onChange={e => {
          const r = runners.find(x => x.id === parseInt(e.target.value));
          setCurrentUser(r || null);
        }} style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: "0.5px solid #ddd", background: "#fff", color: "#333", maxWidth: 140 }}>
          <option value="">Quem é você?</option>
          {[...runners].sort((a, b) => a.name.localeCompare(b.name)).map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.serie})</option>
          ))}
        </select>
      </div>

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

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "0.5px solid #eee", display: "flex", justifyContent: "space-around", padding: "8px 0 12px", zIndex: 50 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 700 : 400, color: tab === t ? "#1D9E75" : "#999", padding: "4px 12px" }}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {selectedRunner && <RunnerModal runner={selectedRunner} onClose={() => setSelectedRunner(null)} />}
    </div>
  );
}
