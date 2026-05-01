module.exports = function errorHandler(err, req, res, next) {
  console.error(err);

  // n8n webhook timeout — return 504 so the frontend can show a meaningful message
  if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
    return res
      .status(504)
      .json({
        error: "L'assistant IA n'a pas répondu à temps. Veuillez réessayer.",
      });
  }

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Erreur interne du serveur"
      : err.message || "Erreur interne du serveur";
  res.status(status).json({ error: message });
};
