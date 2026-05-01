"use strict";

const router = require("express").Router();
const spec = require("./openapi");

// Serve the raw OpenAPI JSON spec
router.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(spec);
});

// Swagger UI initialiser — served as a plain JS file so no inline-script CSP issue
router.get("/init.js", (_req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.send(`
window.addEventListener('load', function () {
  SwaggerUIBundle({
    url: window.location.pathname.replace(/\\/init\\.js$/, '') + '/openapi.json',
    dom_id: '#swagger-ui',
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'StandaloneLayout',
    deepLinking: true,
    persistAuthorization: true,
  });
});
`);
});

// Serve a self-contained Swagger UI page (CDN assets, init script served locally)
router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SAV Assistant \u2013 API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>body { margin: 0; } #swagger-ui .topbar { background-color: #1b1b2f; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script src="init.js"></script>
</body>
</html>`);
});

module.exports = router;
