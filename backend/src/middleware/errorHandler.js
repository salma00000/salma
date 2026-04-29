module.exports = function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Erreur interne du serveur'
    : err.message || 'Erreur interne du serveur';
  res.status(status).json({ error: message });
};
