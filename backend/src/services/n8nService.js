const axios = require("axios");

const N8N_URL = process.env.N8N_WEBHOOK_URL;
const N8N_USER = process.env.N8N_BASIC_AUTH_USER;
const N8N_PASS = process.env.N8N_BASIC_AUTH_PASSWORD;

console.log("[n8nService] Initialising — N8N_WEBHOOK_URL:", N8N_URL);
console.log("[n8nService] Auth user:", N8N_USER);

const n8nClient = axios.create({
  baseURL: N8N_URL,
  auth: {
    username: N8N_USER,
    password: N8N_PASS,
  },
  // 180 s — Groq compound model + multiple LLM hops can be slow
  timeout: 180000,
});

async function sendMessage(sessionId, content) {
  const payload = { chatInput: content, sessionId };
  console.log(
    `[n8nService] POST ${N8N_URL} | sessionId=${sessionId} | chatInput="${content.slice(0, 80)}..."`,
  );
  const startMs = Date.now();
  try {
    const { data, status } = await n8nClient.post("", payload);
    console.log(
      `[n8nService] Response ${status} in ${Date.now() - startMs}ms | raw:`,
      JSON.stringify(data).slice(0, 300),
    );
    return data?.output ?? data?.text ?? data?.message ?? JSON.stringify(data);
  } catch (err) {
    console.error(
      `[n8nService] ERROR after ${Date.now() - startMs}ms | code=${err.code} | message=${err.message}`,
    );
    if (err.response) {
      console.error(
        `[n8nService] n8n HTTP ${err.response.status}:`,
        JSON.stringify(err.response.data).slice(0, 500),
      );
    }
    throw err;
  }
}

module.exports = { sendMessage };
