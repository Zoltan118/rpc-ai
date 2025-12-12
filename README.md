# Chat Application

A Claude-inspired full-screen chat application with Supabase authentication, payment integration, and API key management.

## Features

- **Protected Chat Route**: Only accessible when a Supabase session exists
- **Full-Screen Chat UI**: Claude-inspired design with:
  - Scrollable message list with user and assistant bubbles
  - Avatar icons for both user and assistant
  - Sticky header with logo, user profile dropdown, and theme toggle
  - Sticky composer with textarea and send button
- **Backend Integration**: Connects to `/api/chat`, `/api/payments/link`, and `/api/api-keys` endpoints
- **Real-time Messages**: Messages are rendered in real-time as they're sent
- **Payment Integration**: Stripe checkout button for payment CTAs
- **API Key Management**: 
  - Poll for API keys after successful payment
  - Display API keys in chat messages
  - View all API keys from profile dropdown
- **Conversation History**: Browse and load past conversations from a sidebar/modal
- **Responsive Design**: Works on both mobile and desktop

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Backend API server running

### Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables file:
   ```bash
   cp .env.local.example .env.local
   ```

4. Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── chat/
│   │   │   └── page.tsx          # Protected chat page
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home/login page
│   │   └── globals.css            # Global styles
│   ├── components/
│   │   ├── ChatHeader.tsx         # Header with logo, profile, theme toggle
│   │   ├── MessageBubble.tsx      # Individual message component
│   │   ├── ChatComposer.tsx       # Message input composer
│   │   ├── ApiKeysModal.tsx       # API keys management modal
│   │   └── ConversationHistoryModal.tsx  # Past conversations modal
│   ├── hooks/
│   │   ├── useAuth.ts             # Supabase authentication hook
│   │   └── useTheme.ts            # Theme toggle hook
│   ├── lib/
│   │   └── supabase.ts            # Supabase client setup
│   └── types/
│       └── chat.ts                # TypeScript types
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## Backend API Endpoints

The frontend expects the following backend endpoints:

### Chat API
- `POST /api/chat`: Send messages and receive responses
  - Request body: `{ message: string, conversationId?: string }`
  - Response: `{ message: string, conversationId: string, messageId: string, requiresPayment?: boolean }`

### Payment API
- `POST /api/payments/link`: Create Stripe checkout session
  - Response: `{ url: string }`

### API Keys
- `GET /api/api-keys`: Fetch user's API keys
  - Response: `{ keys: ApiKey[] }`

### Conversations
- `GET /api/conversations`: List all conversations
  - Response: `{ conversations: Conversation[] }`
- `GET /api/conversations/:id`: Get specific conversation
  - Response: `{ conversation: Conversation }`

## Authentication

The app uses Supabase OAuth for authentication. Currently configured for Google OAuth, but can be extended to support other providers.

## Theme

Supports both light and dark modes with a toggle in the header. Theme preference is saved to localStorage.

## License

MIT
