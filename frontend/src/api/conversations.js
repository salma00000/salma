import client from './client';

export const listConversations = () =>
  client.get('/conversations').then((r) => r.data);

export const createConversation = (session_id) =>
  client.post('/conversations', { session_id }).then((r) => r.data);

export const getConversation = (sessionId) =>
  client.get(`/conversations/${sessionId}`).then((r) => r.data);

export const deleteConversation = (sessionId) =>
  client.delete(`/conversations/${sessionId}`);

export const getMessages = (sessionId) =>
  client.get(`/conversations/${sessionId}/messages`).then((r) => r.data);

export const sendMessage = (sessionId, content) =>
  client.post(`/conversations/${sessionId}/messages`, { content }).then((r) => r.data);
