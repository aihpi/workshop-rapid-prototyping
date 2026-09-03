---
name: api-conventions
description: REST API design conventions for our services
---

# API Conventions

- Use kebab-case for URL paths.
- Use camelCase for JSON properties.
- Always include pagination for list endpoints (`?page`, `?limit`).
- Version APIs in the URL path (`/v1/`, `/v2/`), not headers.
- Return `application/problem+json` for errors, with `type`, `title`, `status`, `detail`.
- Prefer resource-oriented routes over RPC-style verbs in the path.
