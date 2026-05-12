"use strict";

const prisma = require("../db/prisma");

async function findById(sessionId) {
  return prisma.savSession.findUnique({ where: { session_id: sessionId } });
}

async function create(sessionId, advisorId, draft) {
  return prisma.savSession.create({
    data: {
      session_id: sessionId,
      draft,
      turn: 0,
      advisor_id: advisorId,
      updated_at: new Date(),
    },
  });
}

async function listByAdvisor(advisorId) {
  return prisma.savSession.findMany({
    where: { advisor_id: advisorId },
    orderBy: { updated_at: "desc" },
  });
}

async function remove(sessionId) {
  await prisma.savSession.delete({ where: { session_id: sessionId } });
}

module.exports = { findById, create, listByAdvisor, remove };
