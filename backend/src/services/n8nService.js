const axios = require("axios");

const n8nClient = axios.create({
  baseURL: process.env.N8N_WEBHOOK_URL,
  auth: {
    username: process.env.N8N_BASIC_AUTH_USER,
    password: process.env.N8N_BASIC_AUTH_PASSWORD,
  },
  // 180 s — Groq compound model + multiple LLM hops can be slow
  timeout: 180000,
});

async function sendMessage(sessionId, content) {
  const { data } = await n8nClient.post("", {
    chatInput: content,
    sessionId,
  });
  return data?.output ?? data?.text ?? data?.message ?? JSON.stringify(data);
}

module.exports = { sendMessage };
