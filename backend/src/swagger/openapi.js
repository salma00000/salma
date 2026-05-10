"use strict";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "SAV Assistant API",
    description:
      "REST API for the SAV Assistant — authentication, conversations, invoices, articles, and SAV tickets.",
    version: "1.0.0",
  },
  servers: [
    {
      url: "/api",
      description: "Current server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "advisor@example.com" },
          password: { type: "string", format: "password", example: "secret" },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          token: { type: "string", description: "JWT access token" },
          advisor: { $ref: "#/components/schemas/Advisor" },
        },
      },
      Advisor: {
        type: "object",
        properties: {
          id: { type: "integer" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
        },
      },
      Session: {
        type: "object",
        properties: {
          session_id: { type: "string" },
          advisor_id: { type: "integer" },
          label: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "integer" },
          session_id: { type: "string" },
          role: { type: "string", enum: ["user", "assistant"] },
          content: { type: "string" },
          created_at: { type: "string", format: "date-time" },
        },
      },
      Facture: {
        type: "object",
        properties: {
          id: { type: "integer" },
          numero_facture: { type: "string", example: "FAC-1024" },
          client_nom: { type: "string", example: "Sophie Renard" },
          client_email: { type: "string", format: "email" },
          client_phone: { type: "string", example: "+32 2 555 01 01", nullable: true },
          client_loyalty_tier: { type: "string", enum: ["bronze", "silver", "gold"], nullable: true },
          customer_id: { type: "string", example: "C-987", nullable: true },
          date_creation: { type: "string", format: "date-time" },
          date_echeance: { type: "string", format: "date", nullable: true },
          montant_ht: { type: "number", example: 649.00 },
          montant_tva: { type: "number", example: 129.80 },
          montant_total: { type: "number", example: 778.80 },
          statut: { type: "string", enum: ["En attente", "Envoyée", "Payée", "Annulée", "En retard"] },
          store: { type: "string", example: "Magasin Bruxelles Centre", nullable: true },
          notes: { type: "string", nullable: true },
        },
      },
      FactureList: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Facture" },
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer" },
              limit: { type: "integer" },
              total: { type: "integer" },
              pages: { type: "integer" },
            },
          },
        },
      },
      Article: {
        type: "object",
        properties: {
          id: { type: "integer" },
          facture_id: { type: "integer" },
          nom_article: { type: "string", example: "Lave-linge Bosch WAG28400" },
          description: { type: "string", nullable: true },
          quantite: { type: "number", example: 1 },
          prix_unitaire: { type: "number", example: 549.00 },
          sous_total: { type: "number", example: 549.00 },
          product_sku: { type: "string", example: "LL-BOSCH-WAG28400", nullable: true },
          product_brand: { type: "string", example: "Bosch", nullable: true },
          product_category: { type: "string", example: "Gros électroménager", nullable: true },
          warranty_months: { type: "integer", example: 24, nullable: true },
        },
      },
      SavTicket: {
        type: "object",
        properties: {
          id: { type: "integer" },
          ticket_id: {
            type: "string",
            example: "SAV-20260310-A3F2",
          },
          facture_id: { type: "integer" },
          issue_description: { type: "string" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          status: {
            type: "string",
            enum: ["open", "in_progress", "resolved", "closed"],
          },
          ai_summary: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    // ── Auth ──────────────────────────────────────────────────────────────
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        description: "Authenticate an advisor and receive a JWT token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Successful login",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          400: {
            description: "Missing email or password",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
          401: {
            description: "Invalid credentials",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Error" } },
            },
          },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current advisor",
        description: "Returns the authenticated advisor's profile.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Advisor profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Advisor" },
              },
            },
          },
          401: { description: "Unauthorized" },
          404: { description: "Advisor not found" },
        },
      },
    },

    // ── Conversations ─────────────────────────────────────────────────────
    "/conversations": {
      get: {
        tags: ["Conversations"],
        summary: "List conversations",
        description: "Returns all sessions belonging to the authenticated advisor.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Array of sessions",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Session" },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Conversations"],
        summary: "Create a conversation",
        description: "Creates a new conversation session.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["session_id"],
                properties: {
                  session_id: { type: "string", example: "sess-abc123" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Session created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Session" } },
            },
          },
          400: { description: "Missing session_id" },
          401: { description: "Unauthorized" },
          409: { description: "Session already exists" },
        },
      },
    },
    "/conversations/{sessionId}": {
      get: {
        tags: ["Conversations"],
        summary: "Get a conversation",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Session",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Session" } },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Session not found" },
        },
      },
      delete: {
        tags: ["Conversations"],
        summary: "Delete a conversation",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          204: { description: "Deleted" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Session not found" },
        },
      },
    },
    "/conversations/{sessionId}/messages": {
      get: {
        tags: ["Conversations"],
        summary: "List messages",
        description: "Returns all messages in a session.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Array of messages",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Message" },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Session not found" },
        },
      },
      post: {
        tags: ["Conversations"],
        summary: "Add a message",
        description: "Appends a message to a session.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "sessionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content: { type: "string", example: "Bonjour, j'ai un problème." },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Message created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Message" } },
            },
          },
          400: { description: "Missing content" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden" },
          404: { description: "Session not found" },
        },
      },
    },

    // ── Factures ──────────────────────────────────────────────────────────
    "/factures": {
      get: {
        tags: ["Factures"],
        summary: "List invoices",
        description: "Returns a paginated list of invoices.",
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20, maximum: 100 },
          },
        ],
        responses: {
          200: {
            description: "Paginated invoices",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FactureList" },
              },
            },
          },
        },
      },
    },
    "/factures/search": {
      get: {
        tags: ["Factures"],
        summary: "Search invoices",
        description:
          "Search invoices by free text or specific fields. At least one criterion is required.",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Free text search" },
          { name: "client", in: "query", schema: { type: "string" } },
          { name: "article", in: "query", schema: { type: "string" } },
          { name: "date", in: "query", schema: { type: "string", format: "date" } },
          { name: "numero", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Search results",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    found: { type: "integer" },
                    results: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Facture" },
                    },
                    search_criteria: { type: "object" },
                  },
                },
              },
            },
          },
          400: { description: "No search criterion provided" },
        },
      },
    },
    "/factures/by-numero/{numero}": {
      get: {
        tags: ["Factures"],
        summary: "Get invoice by numero",
        description: "Lookup a full invoice record by its numero_facture (e.g. FAC-1024). Used by n8n to populate the SAV draft.",
        parameters: [
          {
            name: "numero",
            in: "path",
            required: true,
            schema: { type: "string", example: "FAC-1024" },
          },
        ],
        responses: {
          200: {
            description: "Invoice with all SAV fields",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Facture" } },
            },
          },
          404: { description: "Invoice not found" },
        },
      },
    },
    "/factures/{id}": {
      get: {
        tags: ["Factures"],
        summary: "Get invoice by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Invoice with all SAV fields",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Facture" } },
            },
          },
          400: { description: "Invalid ID" },
          404: { description: "Invoice not found" },
        },
      },
    },

    // ── Articles ──────────────────────────────────────────────────────────
    "/articles": {
      get: {
        tags: ["Articles"],
        summary: "List articles by invoice",
        description: "Returns all articles (line items) for a given invoice.",
        parameters: [
          {
            name: "facture_id",
            in: "query",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          200: {
            description: "Array of articles",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Article" },
                },
              },
            },
          },
          400: { description: "Missing or invalid facture_id" },
          404: { description: "Invoice not found" },
        },
      },
    },

    // ── SAV Tickets ───────────────────────────────────────────────────────
    "/sav/tickets": {
      post: {
        tags: ["SAV Tickets"],
        summary: "Create a SAV ticket",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["facture_id", "issue_description"],
                properties: {
                  facture_id: { type: "integer", example: 1 },
                  issue_description: {
                    type: "string",
                    minLength: 5,
                    example: "Produit défectueux à la livraison",
                  },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    default: "medium",
                  },
                  ai_summary: { type: "string", default: "" },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Ticket created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/SavTicket" } },
            },
          },
          400: { description: "Validation error" },
          404: { description: "Invoice not found" },
        },
      },
      get: {
        tags: ["SAV Tickets"],
        summary: "List SAV tickets",
        parameters: [
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["open", "in_progress", "resolved", "closed"],
            },
          },
          {
            name: "priority",
            in: "query",
            schema: { type: "string", enum: ["low", "medium", "high"] },
          },
        ],
        responses: {
          200: {
            description: "List of tickets",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tickets: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SavTicket" },
                    },
                    total: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/sav/tickets/{ticket_id}": {
      get: {
        tags: ["SAV Tickets"],
        summary: "Get a SAV ticket by ID",
        parameters: [
          {
            name: "ticket_id",
            in: "path",
            required: true,
            schema: { type: "string", example: "SAV-20260310-A3F2" },
          },
        ],
        responses: {
          200: {
            description: "Ticket",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/SavTicket" } },
            },
          },
          400: { description: "Invalid ticket_id format" },
          404: { description: "Ticket not found" },
        },
      },
      patch: {
        tags: ["SAV Tickets"],
        summary: "Update ticket status",
        parameters: [
          {
            name: "ticket_id",
            in: "path",
            required: true,
            schema: { type: "string", example: "SAV-20260310-A3F2" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["open", "in_progress", "resolved", "closed"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated ticket",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/SavTicket" } },
            },
          },
          400: { description: "Invalid status or ticket_id format" },
          404: { description: "Ticket not found" },
        },
      },
    },
  },
};

module.exports = spec;
