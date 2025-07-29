# Firebase Authentication Setup

This application now includes Firebase authentication with middleware and token handling. Here's how to set it up:

## 1. Firebase Configuration

### Client-side Environment Variables (NEXT*PUBLIC*\*)

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Server-side Environment Variables

Add these to your `.env.local` file for server-side authentication:

```env
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

## 2. Firebase Console Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password authentication
4. Get your configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps" section
   - Add a web app if you haven't already
   - Copy the configuration values

## 3. Service Account Setup (for server-side auth)

1. In Firebase Console, go to Project Settings > Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Use the values from the JSON file for your server-side environment variables:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

## 4. Features Added

### Authentication Components

- `AuthContext`: Manages user state and authentication methods
- `LoginForm`: Email/password login form
- `ProtectedRoute`: Wraps components that require authentication

### Middleware

- `middleware.ts`: Protects routes and API endpoints
- Redirects unauthenticated users to login page
- Validates tokens for API requests

### API Routes

- `/api/auth/verify`: Verifies Firebase ID tokens
- All existing API routes now require authentication

### Navigation

- Updated top navigation to show user info and logout button
- Automatic redirect to login for unauthenticated users

## 5. Usage

### Login

Users will be automatically redirected to the login page if not authenticated.

### Protected Routes

All pages are now protected by default. The middleware will:

- Check for authentication tokens
- Redirect to login if not authenticated
- Allow access to authenticated users

### API Protection

All API routes now require authentication headers. The client automatically includes Firebase ID tokens in requests.

## 6. Testing

1. Start the development server: `npm run dev`
2. Navigate to any page - you should be redirected to login
3. Create a test user in Firebase Console or use an existing one
4. Login with email/password
5. You should now have access to the dashboard

## 7. Customization

### Public Routes

To make routes public, add them to the `publicPaths` array in `middleware.ts`:

```typescript
const publicPaths = ["/login", "/signup", "/forgot-password", "/public-page"];
```

### Public API Routes

To make API routes public, add them to the `publicApiRoutes` array in `middleware.ts`:

```typescript
const publicApiRoutes = ["/api/auth", "/api/public"];
```
