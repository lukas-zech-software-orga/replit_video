# Video Streaming Application

## Overview

This is a full-stack video streaming application built with React frontend and Express.js backend. The application provides synchronized video playback capabilities with real-time controls using WebSocket connections. It features a modern UI built with shadcn/ui components and uses PostgreSQL with Drizzle ORM for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with WebSocket support for real-time features
- **File Serving**: Custom video streaming with HTTP range request support
- **Session Management**: In-memory storage with fallback to database persistence

### Data Storage
- **Primary Database**: PostgreSQL (configured via Neon serverless)
- **ORM**: Drizzle ORM with schema-first approach
- **Migration Management**: Drizzle Kit for schema migrations
- **Session Storage**: Dual approach - MemStorage for development, database for production

## Key Components

### Database Schema
- **Videos Table**: Stores video metadata (filename, title, duration, file size, MIME type)
- **Stream Sessions Table**: Manages synchronized playback sessions with position tracking
- **Shared Schema**: Located in `/shared/schema.ts` for type safety across frontend/backend

### Video Streaming
- **HTTP Range Requests**: Supports partial content delivery for efficient video streaming
- **Multiple Format Support**: Handles various video formats through MIME type detection
- **File System Integration**: Direct file serving from `/videos` directory

### Real-time Synchronization
- **WebSocket Server**: Handles play/pause/seek synchronization across multiple clients
- **Message Schema**: Strongly typed WebSocket messages using Zod validation
- **Session Management**: Tracks playback state and position for each streaming session

### UI Components
- **Video Player Interface**: Custom controls with play/pause, seeking, volume control
- **Modern Design**: Dark theme with professional video player aesthetics
- **Responsive Layout**: Mobile-friendly design with touch controls
- **Toast Notifications**: User feedback for actions and errors

## Data Flow

1. **Video Loading**: Client requests available videos → Backend queries database → Returns video metadata
2. **Session Creation**: Client creates streaming session → Backend generates session ID → WebSocket connection established
3. **Video Streaming**: Client requests video stream → Backend serves file with range support → Progressive download
4. **Synchronization**: User controls (play/pause/seek) → WebSocket message → Broadcast to all connected clients → UI updates
5. **State Persistence**: Playback position automatically saved to database for session recovery

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for Neon database
- **drizzle-orm & drizzle-kit**: Database ORM and migration tools
- **express & ws**: Backend server and WebSocket implementation
- **@tanstack/react-query**: Frontend data fetching and caching
- **@radix-ui/***: Accessible UI component primitives
- **tailwindcss**: Utility-first CSS framework

### Development Tools
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast bundling for production builds
- **vite**: Frontend development server with HMR
- **@replit/vite-plugin-***: Replit-specific development enhancements

## Deployment Strategy

### Development Environment
- **Concurrent Execution**: Single process runs both frontend (Vite) and backend (Express)
- **Hot Module Replacement**: Frontend changes reflect immediately
- **TypeScript Compilation**: Real-time type checking and compilation
- **Database Migrations**: Manual execution via `npm run db:push`

### Production Build
- **Frontend**: Static files generated to `/dist/public` via Vite build
- **Backend**: Bundled to `/dist/index.js` via esbuild with external packages
- **Asset Serving**: Express serves static frontend files in production
- **Database**: Requires PostgreSQL instance with connection string in `DATABASE_URL`

### Configuration Requirements
- **Environment Variables**: `DATABASE_URL` for PostgreSQL connection
- **File Storage**: `/videos` directory for video file storage
- **Port Configuration**: Defaults to standard HTTP ports with WebSocket upgrade support

### Scalability Considerations
- **Session Storage**: Currently in-memory, should migrate to Redis for multi-instance deployment
- **File Storage**: Local filesystem, should consider cloud storage (S3, etc.) for production scale
- **WebSocket Clustering**: May require sticky sessions or message broker for horizontal scaling