# Cstudios Project Tracker - LLM Documentation

This document provides a high-level overview of the Project Tracker system for future development. Read this before modifying the codebase.

## 1. Project Overview
A custom project management and financial tracking system designed for Cstudios. It tracks leads, project statuses, design/dev progress, and detailed financial expenses.

## 2. Tech Stack
- **Frontend**: React (TypeScript) + Vite
- **Styling**: Tailwind CSS (follows a "Liquid Glass" / Premium aesthetic)
- **Backend API**: PHP (Vanilla)
- **Database**: PostgreSQL
- **Deployment**: Custom rsync-based SSH script (`push_ssh.exp`)

## 3. Core Logic & Formulas

### Complexity-Based Deadline Warnings
The system uses a quadratic complexity formula to calculate the "Impact PTS" and the margin for deadline warnings:
**Formula**: `Impact (Days) = (25/9) * x^2 + (25/9) * x + (400/9)`
*where `x` is the complexity rating (1 to 7).*

- **Level 1**: ~50 days buffer
- **Level 4**: ~100 days buffer
- **Level 7**: ~200 days buffer

This value is used to trigger the "Approaching Deadline" (Orange) highlight in the project list.

### Financial Analytics
1. **Budget Burn**: Calculated by comparing `total_spent` (sum of all expenses) against `dev_budget`.
2. **Profit Metrics**:
   - **Target Profit**: `Total Project Value - Initial Dev Budget`
   - **Current Profit**: `Total Project Value - Total Spent To Date`
3. **Expense Segments**: Expenses are categorized as Designer, Developer, or Custom. These are reflected in a multi-colored progress bar.

## 4. Key Components
- `ProjectsTable.tsx`: The heart of the application. Handles project list rendering, sorting, expansion logic, and complexity calculations.
- `ExpenseSlideout.tsx`: Manages granular expense entries and budget changes.
- `api/projects.php`: Main API entry point for project CRUD operations, utilizing PostgreSQL JSON aggregation for performance.

## 5. UI/UX Standards
- **Dividers**: Use `border-gray-300` for row separation to ensure high visibility.
- **Highlights**: 
    - **Red**: Overdue projects (Current Date > Deadline).
    - **Orange**: Approaching deadline (based on the Complexity Formula).
- **Icons**: Lucide-react for consistent visual language.
- **Branding**: The app uses the "Cstudios" brand color palette (Slate & Vibrant Orange).

## 6. Development Workflow
- **Local Dev**: `npm run dev` in the `frontend` directory.
- **Deployment**:
    1. Run `npm run build` in `frontend`.
    2. Run `./push_ssh.exp` from the root to deploy `dist/` and `api/` to the staging server.
