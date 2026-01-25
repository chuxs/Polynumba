# Polynumba - Project Workflow Documentation

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        POLYNUMBA SYSTEM                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Client     │         │   Express    │         │   Firebase   │
│   Browser    │◄───────►│   Server    │◄───────►│   Services   │
│              │  HTTP   │  (index.js)  │  API    │              │
└──────────────┘         └──────────────┘         └──────────────┘
                              │
                              │ EJS Templates
                              ▼
                    ┌──────────────────┐
                    │   Views Folder   │
                    │  (EJS Templates) │
                    └──────────────────┘
```

## Application Routes & Endpoints

### Public Routes (No Authentication Required)
1. **GET /** - Home/Index Page
   - Displays game interface
   - Shows 4-Number and 3-Number prediction options
   - Requires login to start game

2. **GET /login** - Login Page
   - Email and password form
   - Password visibility toggle
   - "Forgot password?" link
   - Success message after registration

3. **POST /login** - Login Handler
   - Validates credentials
   - Authenticates with Firebase Auth
   - Creates session
   - Redirects to dashboard

4. **GET /register** - Registration Page
   - User registration form
   - Password visibility toggles
   - Form validation

5. **POST /register** - Registration Handler
   - Validates form data
   - Creates Firebase Auth user
   - Sends email verification
   - Saves user data to Realtime Database
   - Sets balance to ₦40,000
   - Redirects to verify-email page

6. **GET /forgot-password** - Password Reset Page
   - Email input form
   - New password fields (when reset link clicked)

7. **POST /forgot-password** - Password Reset Handler
   - Sends password reset email
   - Handles password reset confirmation

8. **GET /verify-email** - Email Verification Page
   - Shows verification pending message
   - Auto-verifies when link clicked
   - Redirects to dashboard after verification

9. **POST /verify-email** - Email Verification Handler
   - Processes verification code
   - Updates user data
   - Creates session

### Protected Routes (Authentication Required)
10. **GET /dashboard** - User Dashboard
    - Displays balance (₦40,000.00)
    - Shows game interface
    - "Play Game" tab with prediction interface
    - "My Betting Details" tab with stats and history
    - Recent activity with bet details popup

11. **POST /start-game** - Start Game Handler
    - Validates bet amount selected
    - Checks user balance
    - Generates random numbers (server-side)
    - Stores game data in Firebase
    - Subtracts bet amount from balance
    - Returns game status

12. **GET /get-game-status** - Get Game Status
    - Checks for active game
    - Returns game type, attempts, bet amount

13. **POST /logout** - Logout Handler
    - Destroys session
    - Redirects to login

## User Flow Diagrams

### Registration Flow
```
User → /register
  ↓
Fill Registration Form
  ↓
POST /register
  ↓
Firebase Auth: Create User
  ↓
Firebase Database: Save User Data (balance: ₦40,000)
  ↓
Send Email Verification
  ↓
Redirect to /verify-email
  ↓
User receives email
  ↓
Click verification link
  ↓
GET /verify-email?oobCode=...
  ↓
Auto-verify & Create Session
  ↓
Redirect to /dashboard
```

### Login Flow
```
User → /login
  ↓
Enter Email & Password
  ↓
POST /login
  ↓
Firebase Auth: Authenticate
  ↓
Firebase Database: Fetch User Data
  ↓
Set Balance to ₦40,000 (if not set)
  ↓
Create Session
  ↓
Redirect to /dashboard
```

### Game Flow
```
User → Dashboard (/dashboard)
  ↓
Select Game Type (4-Number or 3-Number)
  ↓
Select Bet Amount
  ↓
Click "Start Game"
  ↓
POST /start-game
  ├─ Validate bet amount
  ├─ Check balance
  ├─ Generate random numbers (server-side)
  ├─ Store in Firebase: users/{uid}/currentGame
  │   ├─ numbers: [0-9 array]
  │   ├─ gameType: 4 or 3
  │   ├─ attempts: 3 (4-number) or 4 (3-number)
  │   ├─ attemptsUsed: 0
  │   ├─ betAmount: amount
  │   └─ status: 'active'
  ├─ Subtract bet amount from balance
  └─ Return success
  ↓
Display "* * * *" (numbers hidden)
  ↓
Show bet amount in prediction section
  ↓
User makes predictions
  ↓
[Future: Submit guesses and check against stored numbers]
```

### Password Reset Flow
```
User → /forgot-password
  ↓
Enter Email
  ↓
POST /forgot-password
  ↓
Firebase Auth: Send Reset Email
  ↓
User receives email with reset link
  ↓
Click link → /forgot-password?oobCode=...&mode=resetPassword
  ↓
Enter New Password (twice)
  ↓
POST /forgot-password (with oobCode)
  ↓
Firebase Auth: Confirm Password Reset
  ↓
Password updated
  ↓
Redirect to login
```

## Database Structure (Firebase Realtime Database)

```
users/
  {uid}/
    uid: string
    firstName: string
    lastName: string
    username: string
    email: string
    phone: string
    balance: number (default: 40000)
    emailVerified: boolean
    createdAt: timestamp
    currentGame/
      numbers: [number, number, number, number] (0-9)
      gameType: 4 or 3
      attempts: 3 or 4
      attemptsUsed: number
      betAmount: number
      status: 'active'
      createdAt: timestamp
```

## Game Rules & Configuration

### 4-Number Prediction
- **Attempts**: 3
- **Odds**: 6x
- **Number Range**: 0-9
- **Example**: User guesses [1, 2, 3, 4], Winning numbers [1, 8, 3, 6] → 2 correct

### 3-Number Prediction
- **Attempts**: 4
- **Odds**: 8x
- **Number Range**: 0-9
- **Example**: User guesses [5, 2, 9], Winning numbers [5, 7, 9] → 2 correct

## Security Features

1. **Server-Side Number Generation**
   - Numbers generated on server
   - Stored in Firebase (not accessible client-side)
   - Prevents cheating

2. **Session Management**
   - Express sessions for authentication
   - 24-hour session timeout
   - Protected routes check session

3. **Email Verification**
   - Required for account activation
   - Prevents fake accounts

4. **Password Security**
   - Minimum 8 characters
   - Password visibility toggles
   - Secure password reset flow

## UI Components

### Pages
1. **index.ejs** - Main game page (public)
2. **login.ejs** - Login page
3. **register.ejs** - Registration page
4. **forgot-password.ejs** - Password reset page
5. **verify-email.ejs** - Email verification page
6. **dashboard.ejs** - User dashboard (protected)

### Key Features
- Dark theme design
- Responsive layout
- Password visibility toggles
- Toast notifications
- Modal popups for bet details
- Tab navigation (Play Game / My Betting Details)
- Real-time balance display (₦40,000.00)

## Technology Stack

- **Backend**: Express.js (Node.js)
- **Templating**: EJS
- **Authentication**: Firebase Auth
- **Database**: Firebase Realtime Database
- **Session**: express-session
- **Styling**: CSS (Custom)
- **Frontend**: Vanilla JavaScript

## Key Features Implemented

✅ User Registration with Email Verification
✅ User Login with Session Management
✅ Password Reset Functionality
✅ Game Number Generation (Server-Side)
✅ Bet Amount Selection & Validation
✅ Balance Management (₦40,000 default)
✅ Game State Management (Attempts Tracking)
✅ Responsive Dark Theme UI
✅ Password Visibility Toggles
✅ Toast Notifications
✅ Bet Details Modal Popup
✅ Dashboard with Tabs
✅ Recent Activity Display

## Future Enhancements (Not Yet Implemented)

- [ ] Guess submission and validation
- [ ] Win/loss calculation
- [ ] Balance updates on win
- [ ] Bet history storage
- [ ] Real-time balance updates
- [ ] Game completion logic

