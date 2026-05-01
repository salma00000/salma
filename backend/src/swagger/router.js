"use strict";

const router = require("express").Router();
const spec = require("./openapi");

// Serve the raw OpenAPI JSON spec
router.get("/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(spec);
});

// Serve a self-contained Swagger UI page (CDN, no npm package needed)
router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SAV Assistant – API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; }
    #swagger-ui .topbar { background-color: #1b1b2f; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: window.location.pathname.replace(/\\/$/, '') + '/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'StandaloneLayout',
      deepLinking: true,
      persistAuthorization: true,
    });
  </script>
</body>
</html>`);
});

module.exports = router;
