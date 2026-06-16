# Technical Decisions

## Initial Decisions
- Use `npm` workspaces for the monorepo because the local machine already has `npm` installed.
- Keep the FastAPI app standalone instead of forcing Python into the JavaScript workspace.
- Store mock JSON data at the repository root so it can be shared and replaced easily later.
- Use Next.js App Router with TypeScript for the web scaffold.
- Use minimal Tailwind styling only to support simple placeholder layouts.
- Keep the shared package TypeScript-only for now and mirror contracts manually in Pydantic.
- Reserve `integrations/void` for future copied-in Void code without connecting it to runtime behavior.

## Deliberate Non-Decisions
- No production deployment target yet.
- No database wiring yet.
- No full authentication yet.
- No final frontend design yet.
- No real predictive model claims yet.

