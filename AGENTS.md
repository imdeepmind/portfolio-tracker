# AGENTS.md

Operating guidelines, branching rules, commit message standards, and development workflows for AI agents and automated contributors working on `portfolio-tracker`.

---

## 1. Branching Strategy

AI agents must always create a dedicated git branch for each task or issue before making any changes.

### Branch Naming Convention

- **Format**: `<type>/#<issue>-<short-description>` or `#<issue>-<short-description>`
- **Allowed Types**: `feat`, `bug`, `chore`, `ci`
- **Examples**:
  - `feat/#72-remove-epf-emergency-options`
  - `bug/#21-remove-total-amount-invested`
  - `feat/#82-ledger-mobile-card-view`
  - `chore/#86-create-agents-md`

### Branch Rules

- **Branch Off Latest `main`**: Always ensure your branch is created from the latest commit on `main`.
- **Single Issue Scope**: Keep branches strictly focused on a single issue. Do not mix unrelated changes, refactorings, or fixes in the same branch.
- **Never Commit Directly to Protected Branches**: Never commit or push directly to `main` or `develop`.

---

## 2. Strict Commit Message Convention

All commit messages must strictly adhere to the project's commitlint configuration (`commitlint.config.js`), specifically enforced by the custom `header-match-issue` rule.

### Commit Pattern

```text
type(scope): #<issue>: <message>
```

### Allowed Types

| Type    | Description                                                                   |
| :------ | :---------------------------------------------------------------------------- |
| `feat`  | A new user-facing feature or application capability                           |
| `bug`   | A bug fix (note: use `bug`, not `fix`)                                        |
| `chore` | Maintenance, refactoring, dependencies, config, internal tasks, documentation |
| `ci`    | CI/CD pipelines, workflows, and deployment configurations                     |

### Scope Rules

- **Format**: Lowercase alphanumeric characters with hyphens: `[a-z0-9-]+`
- **Common Scopes**:
  - `holdings`: Asset & holding portfolio features
  - `transactions`: Buy/sell records and transaction history
  - `expenses`: Expense tracking and categorization
  - `calculator`: Investment/FIRE calculator tools
  - `ledger`: Unified transaction ledger
  - `dashboard`: Home overview charts and analytics
  - `auth`: Authentication and session management
  - `ui`: Shared UI components (`GlassCard`, buttons, inputs)
  - `api`: Backend route handlers and endpoints
  - `pwa`: Progressive Web App, service workers, manifests
  - `commitlint`: Git hooks and commitlint configuration

### Additional Header Rules

- **Header Max Length**: 120 characters maximum.
- **No Trailing Period**: Do not end the commit message with a period (`.`).
- **All Lowercase Type & Scope**: Types and scopes must be strictly lowercase.

### Commit Examples

#### ✅ Valid

- `feat(calculator): #72: remove excludeEPF and excludeEmergency options`
- `bug(transactions): #21: remove totalAmountInvested denormalized field`
- `chore(auth): #30: move authOptions to src/lib/auth.ts`
- `chore(docs): #86: add AGENTS.md development guidelines`
- `feat(ledger): #82: implement mobile card view for transactions`

#### ❌ Invalid

- `feat: #72: remove exclude options` _(Missing scope)_
- `feat(calculator): remove exclude options` _(Missing issue reference `#72:`)_
- `fix(ledger): #82: fix ledger styling.` _(Type `fix` is not allowed; must use `bug`; trailing period not allowed)_
- `FEAT(Calculator): #72: Updated options` _(Uppercase type and scope not allowed)_
- `chore(auth): #30: move authOptions to src/lib/auth.ts and refactor user model and update package.json` _(Exceeds 120 chars)_

---

## 3. Development & Verification Workflow

Before committing any changes or submitting a Pull Request, agents must run and verify all quality checks locally.

### Verification Checklist

Run each of the following scripts from the root directory:

```bash
# 1. Validate TypeScript types across the codebase
npm run type-check

# 2. Run ESLint checks
npm run lint

# 3. Format code with Prettier
npm run format

# 4. Verify Next.js production build succeeds
npm run build
```

### Git Hooks & Automation

The repository uses **Husky** and **lint-staged** to automate quality checks:

- `.husky/pre-commit`: Triggers `npx lint-staged` on staged files before commit:
  - `*.{js,jsx,ts,tsx}`: Runs `eslint --fix` and `prettier --write`
  - `*.{json,md,css,scss}`: Runs `prettier --write`
  - `src/**/*.{ts,tsx}`: Runs `npm run type-check`
- `.husky/commit-msg`: Enforces commit message validation with `commitlint`.

> **Note**: Never bypass git hooks using `--no-verify` unless explicitly instructed by the user.

---

## 4. Architecture & Coding Conventions

### Next.js 16 App Router

- **Server Components by Default**: Prefer React Server Components for pages, layouts, and data-fetching.
- **Client Components**: Isolate client-side state, event handlers, and browser APIs to leaf components marked with `'use client'`.
- **Route Handlers**: Implement API endpoints in `src/app/api/.../route.ts` using named HTTP exports (`GET`, `POST`, `PUT`, `DELETE`).
- **Asynchronous Route Params**: In Next.js 16, dynamic route `params` are promises. Always await them:
  ```typescript
  export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // ...
  }
  ```

### TypeScript

- **Strict Typing**: The project enforces `strict: true`. Avoid `any`, `as unknown as T`, or loose typings.
- **Centralized DTOs & Interfaces**:
  - Keep domain models and Mongoose interfaces in `src/models/`.
  - Place centralized DTOs, API request/response types, and shared data structures in `src/types/`.

### Database (MongoDB & Mongoose)

- **Connection Management**: Always connect via `await dbConnect()` imported from `@/lib/mongodb`.
- **ObjectId Validation**: Validate MongoDB ObjectIDs before querying the database:

  ```typescript
  import mongoose from 'mongoose';

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
  }
  ```

- **User Scoping**: Always scope queries to the authenticated user ID (`session.user.id`) to prevent unauthorized cross-user data access.
- **No Derivable Running Totals**: Do not persist running balances or totals that can be derived from raw transactions. Compute balances dynamically on query or aggregation.
- **Cascade Deletes**: Ensure child documents are cleanly deleted when a parent document is removed (e.g., delete associated transactions when a holding is deleted).

### Styling & UI Design System

- **Tailwind CSS v4**: Styling is powered by Tailwind CSS v4 configured via `@import "tailwindcss";` and `@theme` in `src/app/globals.css`.
- **Glassmorphism Aesthetic**:
  - Dark base theme: `#0a0a1a` to `#111130` background gradient.
  - Cards: Use the reusable `GlassCard` component (`backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl`).
  - Accent Color: Crimson/Rose palette (`#fb2645` / `var(--accent)`).
  - Atoms & Bits: Use existing components in `src/components/bits/` (`Input`, `Select`, `Button`, `IconButton`, `StatCard`, `PageHeader`, `Spinner`).
- **Responsive & Mobile-First**:
  - Design mobile-first, ensuring high usability on phone screens and PWA viewports.
  - Support safe area insets on mobile (`pb-safe`, `viewport-fit=cover`).

---

## 5. Pull Request Standards

When opening a Pull Request:

1. **Title**: Follow the commit convention (e.g., `feat(calculator): #72: remove excludeEPF and excludeEmergency options` or `chore(docs): #86: create AGENTS.md`).
2. **Issue Link**: Clearly link the issue in the description using GitHub keywords (e.g., `Closes #86` or `Fixes #86`).
3. **Verification Details**: Include verification status and command outputs (`type-check`, `lint`, `build`).
4. **Visual Proof**: For UI changes, attach responsive screenshots showing both desktop and mobile viewports.
