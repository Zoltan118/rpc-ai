# RPC AI Frontend

A modern React frontend for RPC endpoint management and optimization, built with Vite, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Responsive Landing Page**: Beautiful, mobile-friendly landing page with theme support
- **Authentication**: 
  - Google OAuth integration
  - Magic Link (email-based) authentication
  - Automatic session persistence
  - Auth state management
- **Theme Support**: Dark/light mode toggle with system preference detection
- **Type-Safe**: Full TypeScript support for type safety
- **Modern Styling**: Tailwind CSS with shadcn/ui components

## Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file in the frontend directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev
```

The app will be available at http://localhost:5173

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── Layout.tsx   # Main layout wrapper
│   │   ├── GoogleAuth.tsx
│   │   └── MagicLinkAuth.tsx
│   ├── contexts/        # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── lib/             # Utilities and config
│   │   ├── supabase.ts  # Supabase client
│   │   └── utils.ts
│   ├── pages/           # Page components
│   │   ├── LandingPage.tsx
│   │   ├── ChatPage.tsx
│   │   └── AuthCallback.tsx
│   ├── App.tsx          # Main app component with routing
│   ├── main.tsx
│   └── index.css        # Global styles
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
└── package.json
```

## Authentication Flow

1. User lands on `/` (LandingPage)
2. User can authenticate via:
   - **Google OAuth**: Redirects to Google, then to `/auth/callback`
   - **Magic Link**: Enters email, receives link, clicks link to auth
3. After successful auth, user is redirected to `/chat`
4. Session is persisted in localStorage automatically
5. Theme preference is saved locally

## Responsive Design

The app is fully responsive and works on:
- Mobile (< 640px)
- Tablet (640px - 1024px)
- Desktop (> 1024px)

## Theme System

The app includes a complete theme system with:
- Light mode (default)
- Dark mode
- System preference detection
- Toggle button in header
- Persistent storage

## Technologies

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Component library
- **Supabase**: Backend and authentication
- **React Router**: Client-side routing
- **Lucide React**: Icons

## License

MIT
