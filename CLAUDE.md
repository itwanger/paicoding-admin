# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

paicoding-admin is the admin dashboard for 技术派 (paicoding), a community platform. Built with React 18, TypeScript, Vite 3, Ant Design 5.x, Redux, and ECharts. It provides comprehensive management capabilities for articles, authors, categories, tags, columns, and site configuration.

Backend API: https://github.com/itwanger/paicoding (Spring Boot based)

## Development Commands

### Local Development
```bash
npm install
# OR if install fails (requires Node.js 16+)
npm install --registry=http://registry.npmmirror.com

npm run dev
# Opens http://127.0.0.1:3301
# Default credentials: admin/admin
```

### Build
```bash
# Production build
npm run build:pro

# Development build
npm run build:dev

# Test environment build
npm run build:test
```

### Code Quality
```bash
# ESLint check and fix
npm run lint:eslint

# Prettier formatting
npm run lint:prettier

# Stylelint for styles
npm run lint:stylelint

# Lint staged files (runs via husky)
npm run lint:lint-staged
```

### Git Commits
```bash
# Interactive commit with commitizen
npm run commit
# This runs: git pull && git add -A && git-cz && git push
```

Commit types follow conventional commits:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (not affecting logic)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `build`: Build system changes
- `ci`: CI configuration changes
- `chore`: Other changes

### Deployment
```bash
# For Mac/Linux users
./launch.sh install  # Install dependencies
./launch.sh server   # Start dev server
./launch.sh pro      # Build, upload to server, and deploy

# Manual deployment
npm run build:pro    # Generates dist/ directory
# Upload dist/ to /home/admin/ on server
# Configure Nginx:
# location ^~ /admin {
#     alias /home/admin/dist/;
#     index index.html;
# }
```

## Architecture

### State Management (Redux)
Located in `src/redux/modules/`:
- **global**: Token, theme, language, assembly size, loading state
- **menu**: Menu collapse state, menu list
- **tabs**: Multi-tab navigation state
- **auth**: Authentication and button permissions
- **breadcrumb**: Breadcrumb navigation
- **disc**: Discussion/forum state

Redux uses `redux-persist` to persist state to localStorage. Uses `redux-thunk` and `redux-promise` middleware.

### Routing System
- Routes defined in `src/routers/modules/*.tsx` (modular approach)
- Auto-imported via `import.meta.globEager` in `src/routers/index.tsx`
- Route modules: article, author, category, column, config, global, home, statistics, tag, resume, error
- Lazy loading enabled via `src/routers/utils/lazyLoad.tsx`
- Auth protection via HOC in `src/routers/utils/authRouter.tsx`
- Multi-tab support with keep-alive using `react-activation`

### API Layer
- Axios wrapper in `src/api/index.ts` with global interceptors
- Request/response interceptors handle:
  - Token injection via `x-access-token` header
  - Loading states via NProgress
  - Error handling (599 = login expired, redirects to login)
  - Duplicate request cancellation
- API modules in `src/api/modules/`: login, article, author, category, column, config, global, statistics, tag, resume, common
- Base URL configured via `.env.*` files: `/api/admin`
- Proxy configured in `vite.config.ts` to forward to `http://127.0.0.1:8080/`

### Layout Structure
Main layout in `src/layouts/index.tsx`:
- **Sider**: Left menu (`LayoutMenu`)
- **Header**: Top navigation with breadcrumb, theme toggle, user avatar (`LayoutHeader`)
- **Tabs**: Multi-tab navigation (`LayoutTabs`)
- **Content**: Main content area (rendered via `<Outlet>`)
- **Footer**: Footer component (`LayoutFooter`)

Responsive: Auto-collapses menu when window width < 1200px.

### Key Features
1. **Custom Components**:
   - `DebounceSelect`: Debounced search select (used in article/column forms)
   - `TableSelect`: Paginated searchable select with table display
   - `ImgCropUpload`: Image upload with crop functionality (Ant Design)
   - `DatePicker`: Custom date picker for expireTime fields
   - `SecondSureModal`: Secondary confirmation modal

2. **Theme System**:
   - Dark mode support
   - Gray mode & color-weak mode
   - Component size switching (small/middle/large)
   - Managed via `src/hooks/useTheme.ts`

3. **Markdown Editor**:
   - Uses `@bytemd/react` with plugins: gfm, highlight, math, gemoji, medium-zoom
   - Theme support via `juejin-markdown-themes`

## File Organization

```
src/
├── api/              # API modules and Axios configuration
├── assets/           # Static assets (icons, images)
├── components/       # Global reusable components
├── config/           # Configuration (nprogress, service loading)
├── enums/            # Enumerations (HTTP status codes, common enums)
├── hooks/            # Custom React hooks (useTheme, etc.)
├── layouts/          # Layout components (Header, Menu, Tabs, Footer)
├── redux/            # Redux store and modules
├── routers/          # Route configuration (modular)
├── styles/           # Global styles (less files)
├── typings/          # TypeScript type definitions
├── utils/            # Utility functions
├── views/            # Page components (organized by feature)
```

### Views Structure
- `article/`: Article list, edit with markdown editor, search
- `author/`: Author whitelist, zsxq list
- `category/`: Category management
- `column/`: Column settings, article sorting, groups
- `config/`: Site configuration with image uploads
- `global/`: Global settings
- `home/`: Dashboard (default redirect from `/`)
- `login/`: Login page
- `resume/`: Resume management
- `statistics/`: Data statistics with ECharts
- `tag/`: Tag management

## Important Notes

### Environment Configuration
- Development: `VITE_API_URL = '/api/admin'`, proxy to `http://127.0.0.1:8080`
- Backend must be running on port 8080 (paicoding Spring Boot app)
- Redis must be running for backend

### Path Alias
- `@` maps to `src/` directory (configured in `vite.config.ts` and `tsconfig.json`)

### TypeScript
- Strict mode disabled for flexibility
- Type definitions in `src/typings/` and `src/api/interface/`

### Styling
- Uses Less preprocessor
- Global variables in `src/styles/var.less`
- Ant Design theme customization supported

### Known Issues
- If `npm install` fails with Node.js < 16, upgrade Node.js to 18+ and npm to 9+
- OR download pre-packaged node_modules (mentioned in README)
- Windows users: Convert `launch.sh` line endings if needed (`dos2unix launch.sh`)

### Backend Integration
- Expects backend at `http://127.0.0.1:8080`
- Login endpoint returns token stored in Redux + localStorage
- Token sent as `x-access-token` header in all requests
- Response format: `{ status: { code, msg }, result: {...} }`
- Code 599 = not logged in (redirects to login page)
- Code 200 = success
