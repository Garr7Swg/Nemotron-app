const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.NVIDIA_API_KEY;
const MODEL = process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b";
const BASE_URL = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");

app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, model: MODEL, keyConfigured: Boolean(API_KEY) });
});

const clamp = (n, min, max, fallback) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback;
};

app.post("/api/chat", async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({
      error: "NVIDIA_API_KEY is not set. Add it in Replit under Tools > Secrets, then restart."
    });
  }

  const body = req.body || {};
  const messages = Array.isArray(body.messages)
    ? body.messages
        .filter(
          (m) =>
            m &&
            ["system", "user", "assistant"].includes(m.role) &&
            typeof m.content === "string"
        )
        .map((m) => ({ role: m.role, content: m.content }))
    : [];

  if (!messages.length) {
    return res.status(400).json({ error: "No messages provided." });
  }

  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream"
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: clamp(body.temperature, 0, 2, 0.6),
        top_p: clamp(body.top_p, 0, 1, 0.95),
        max_tokens: Math.round(clamp(body.max_tokens, 1, 32768, 4096)),
        stream: true
      }),
      signal: controller.signal
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      let message = text;
      try {
        const j = JSON.parse(text);
        message = j.detail || j.error?.message || j.message || text;
      } catch {}
      return res
        .status(upstream.status)
        .json({ error: `NVIDIA API ${upstream.status}: ${String(message).slice(0, 400)}` });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    for await (const chunk of upstream.body) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    if (err.name === "AbortError") return;
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(502).json({ error: "Could not reach the NVIDIA API: " + err.message });
    } else {
      res.end();
    }
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Nemotron chat running on port ${PORT}`);
  console.log(`Model: ${MODEL} | API key ${API_KEY ? "found" : "MISSING"}`);
});
