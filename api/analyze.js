export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { base64Image, mimeType } = req.body;
    if (!base64Image || !mimeType) {
      return res.status(400).json({ erro: "Dados ausentes" });
    }

    const imageBuffer = Buffer.from(base64Image, "base64");

    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-11B-Vision-Instruct",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.REACT_APP_HF_TOKEN}`,
          "Content-Type": "application/json",
          "x-wait-for-model": "true",
        },
        body: JSON.stringify({
          inputs: {
            image: base64Image,
            question: "This is a running app screenshot. Extract: distance in km, average pace per km as MM:SS, date as YYYY-MM-DD, elevation gain in meters. Reply ONLY with JSON: {distancia_km, pace, data, elevacao_m, app_detectado}"
          }
        }),
        signal: AbortSignal.timeout(25000),
      }
    );

    const text = await hfResponse.text();
    if (!hfResponse.ok) {
      return res.status(hfResponse.status).json({ erro: "HF: " + text });
    }

    const data = JSON.parse(text);
    const content = Array.isArray(data) ? data[0]?.generated_text || data[0]?.answer || "" : data?.generated_text || "";

    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");
    if (firstBrace === -1) {
      return res.status(200).json({ erro: "Não identificado: " + content.slice(0, 100) });
    }

    const parsed = JSON.parse(content.slice(firstBrace, lastBrace + 1));
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ erro: err.message || "Erro interno" });
  }
}
