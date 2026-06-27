export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { base64Image, mimeType } = req.body;

    if (!base64Image || !mimeType) {
      return res.status(400).json({ erro: "base64Image e mimeType são obrigatórios" });
    }

    const prompt = `You are analyzing a running app screenshot (Strava, Garmin, Nike Run, Apple Watch, etc). Extract the running data and respond ONLY with valid JSON, no extra text:
{
  "distancia_km": distance in km as number,
  "pace": average pace as "M:SS" per km,
  "data": date as "YYYY-MM-DD" if visible or null,
  "elevacao_m": elevation gain in meters as number or 0,
  "app_detectado": name of app or device,
  "confianca": "alta"
}
If you cannot identify distance, respond with {"erro": "nao identificado"}.`;

    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-11B-Vision-Instruct/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.REACT_APP_HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }],
          max_tokens: 512,
          temperature: 0.1,
        })
      }
    );

    const text = await hfResponse.text();

    if (!hfResponse.ok) {
      return res.status(hfResponse.status).json({ erro: "HF erro: " + text });
    }

    const data = JSON.parse(text);
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ erro: err.message || "Erro interno" });
  }
}
