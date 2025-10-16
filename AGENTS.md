# AGENTS.md

This file provides guidance to Qoder (qoder.com) when working with code in this repository.

## Project Overview

paicoding-admin is a React-based admin panel for the 技术派 (PaiCoding) community platform. Built with React 18, TypeScript, Vite 3, Ant Design 5.x, Redux, and React Router v6.

## Build and Development Commands

### Development
```bash
npm run dev
# Starts dev server at http://127.0.0.1:3301
# Default login credentials: admin/admin
```

### Build
```bash
# Production build
npm run build:pro

# Development build
npm run build:build:dev

# Test build
npm run build:test
```

### Preview
```bash
npm run preview
```

### Linting and Code Quality
```bash
# ESLint check and auto-fix
npm run lint:eslint

# Prettier formatting
npm run lint:prettier

# Stylelint for CSS/Less/SCSS
npm run lint:stylelint

# Run lint-staged (pre-commit hook)
npm run lint:lint-staged
```

### Git Commits
```bash
# Automated commit flow with commitizen
npm run commit
```

## Architecture

### State Management (Redux)
- Uses Redux with redux-persist for state persistence
- Key modules: `global`, `menu`, `tabs`, `auth`, `breadcrumb`, `disc`
- Location: `src/redux/modules/`
- Store configuration: `src/redux/index.ts`
- Redux DevTools enabled in development
- Middleware: redux-thunk, redux-promise

### Routing
- React Router v6 with lazy loading support
- Route modules auto-loaded from `src/routers/modules/*.tsx` using `import.meta.globEager`
- Main router config: `src/routers/index.tsx`
- Route definitions: `src/routers/route.tsx`
- Supports nested routes, route guards, and multi-tab navigation

### API Layer
- Axios-based HTTP client with custom wrapper class `RequestHttp`
- Global request/response interceptors
- Features: automatic token injection, loading states, error handling, request cancellation
- Base URL configured via `VITE_API_URL` environment variable
- API modules organized by feature in `src/api/modules/`
- Main config: `src/api/index.ts`

### Layout System
- Main layout: `src/layouts/index.tsx`
- Components: Header, Menu, Tabs, Footer
- Uses Ant Design Layout with collapsible sidebar
- Responsive design with window resize handling

### Project Structure
```
src/
├── api/              # API request definitions by module
├── assets/           # Static assets (images, icons, etc.)
├── components/       # Reusable components
├── config/           # Configuration files
├── enums/            # TypeScript enums
├── hooks/            # Custom React hooks
├── layouts/          # Layout components (Header, Menu, Footer, Tabs)
├── redux/            # Redux store and modules
├── routers/          # Route configuration and modules
├── styles/           # Global styles
├── typings/          # TypeScript type definitions
├── utils/            # Utility functions
└── views/            # Page components by feature
```

### Key Views/Features
- `statistics/`: Dashboard with ECharts data visualization
- `config/`: Platform operation configuration
- `article/`: Article management
- `column/`: Column configuration
- `resume/`: Tutorial/course configuration
- `author/`: User/author management
- `category/`: Category management
- `tag/`: Tag management
- `global/`: Global settings
- `login/`: Authentication

## Development Notes

### Environment Variables
- Development: `.env.development` - Backend at `http://127.0.0.1:8080`
- Production: `.env.production`
- Test: `.env.test`

### Backend Integration
- Backend project: [paicoding](https://github.com/itwanger/paicoding)
- Spring Boot-based community platform
- Ensure Redis and backend server are running before starting admin panel

### TypeScript Configuration
- Strict TypeScript enabled
- Path alias `@` configured to `src/`
- Config: `tsconfig.json`

### Vite Configuration
- Proxy configured for `/admin` and `/api/admin` to `http://127.0.0.1:8080`
- Port: 3301 (configurable via `VITE_PORT`)
- Gzip compression enabled for production builds
- Bundle visualization available with `VITE_REPORT`
- SVG icons via vite-plugin-svg-icons
- Config: `vite.config.ts`

### Code Standards
- ESLint with TypeScript, React, and Prettier integration
- Prettier for code formatting
- Stylelint for CSS/Less/SCSS
- Husky + lint-staged for pre-commit hooks
- Commitizen + commitlint for commit message conventions

## Troubleshooting

### Node Modules Issues
If `npm install` fails:
1. Upgrade Node.js to 16+ (recommended 18+)
2. Try: `npm install --registry=http://registry.npmmirror.com`
3. If ECONNRESET error: `npm config set registry http://registry.npmjs.org/`
4. Delete `node_modules` and reinstall

### launch.sh (Mac/Linux)
Helper script for common tasks:
```bash
./launch.sh install  # Install dependencies
./launch.sh server   # Start dev server
./launch.sh pro      # Build, package, and deploy to server
```

If `$'\r': command not found` error:
```bash
sed -i 's/\r//' launch.sh
# or
dos2unix launch.sh
```
