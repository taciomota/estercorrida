export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { base64Image, mimeType } = req.body;

  const prompt = `You are analyzing a running app screenshot (Strava, Garmin, Nike Run, Apple Watch, etc). Extract the running data and respond ONLY with valid JSON:
{
  "distancia_km": distance in km as number,
  "pace": average pace as "M:SS" per km,
  "data": date as "YYYY-MM-DD" if visible or null,
  "elevacao_m": elevation gain in meters as number or 0,
  "app_detectado": name of app or device,
  "confianca": "alta"
}
If you cannot identify distance, respond with {"erro": "nao identificado"}.`;

  const response = await fetch(
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

  const data = await response.json();
  res.status(response.status).json(data);
}
