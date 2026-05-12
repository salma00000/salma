"use strict";

const prisma = require("../db/prisma");

async function findBySession(sessionId) {
  return prisma.savMessage.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: "asc" },
  });
}

async function insert(sessionId, role, content) {
  return prisma.savMessage.create({
    data: { session_id: sessionId, role, content },
  });
}

module.exports = { findBySession, insert };
