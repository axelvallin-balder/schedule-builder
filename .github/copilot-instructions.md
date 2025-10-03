# schedule-builder Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-03

## Active Technologies
- TypeScript 5.2, Node.js 20.x + Nuxt.js 3.x, Vue.js 3.x, Pinia (state management) (002-the-schedule-page)
- TypeScript 5.2, Node.js 20.x + Nuxt.js 3.x, Vue.js 3.x + Pinia (state management), Tailwind CSS (styling), Vitest (testing) (003-the-user-needs)
- Existing PostgreSQL schema from 001-schedule-builder (minimal updates needed) (003-the-user-needs)

## Project Structure
```
backend/
frontend/
tests/
```

## Commands
npm test; npm run lint

## Code Style
TypeScript 5.2, Node.js 20.x: Follow standard conventions

## Critical Guidelines
**API-Database Consistency**: Keep database model and backend API consistent with frontend API and stores. Avoid changing data model unless specifically asked to. If a feature requires or would benefit from an addition or change to the data model, ask for clarification during the specification.

## Recent Changes
- 003-the-user-needs: Added TypeScript 5.2, Node.js 20.x + Nuxt.js 3.x, Vue.js 3.x + Pinia (state management), Tailwind CSS (styling), Vitest (testing)
- 002-the-schedule-page: Added TypeScript 5.2, Node.js 20.x + Nuxt.js 3.x, Vue.js 3.x, Pinia (state management)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
