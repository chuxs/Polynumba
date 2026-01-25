import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getDatabase, ref, set, onValue, child, get, remove, serverTimestamp } from "firebase/database";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, confirmPasswordReset, sendEmailVerification, applyActionCode, reload } from "firebase/auth";
import session from "express-session";

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBCHqreJZoJt3vDesoVH1ystrhS4U8yy8U",
    databaseURL: "https://polynumba-auth-fb-em-default-rtdb.firebaseio.com/",
    authDomain: "polynumba-auth-fb-em.firebaseapp.com",
    projectId: "polynumba-auth-fb-em",
    storageBucket: "polynumba-auth-fb-em.firebasestorage.app",
    messagingSenderId: "564381794118",
    appId: "1:564381794118:web:29413aed43166a8b082f47",
    measurementId: "G-14DQL3MFE2"
};
  
  // Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const fb_database = getDatabase(firebaseApp);
const auth = getAuth(firebaseApp);


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // Parse JSON request bodies
app.use(express.static(path.join(__dirname, "Public")));
app.use(session({
    secret: "polynumba-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    const registered = req.query.registered === 'true';
    res.render("login", { 
        success: registered ? "Account created successfully! Please log in." : null,
        error: null 
    });
});

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validation
        if (!username || !password) {
            return res.render("login", {
                error: "Username and password are required",
                success: null
            });
        }
        
        // First, try to find user by username in database to get email
        // Note: This requires querying the database. For now, we'll assume username is email
        // In a production app, you'd want to store username->email mapping or use email directly
        
        // For now, we'll use the username field as email (common pattern)
        const email = username; // Assuming username is actually email
        
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Fetch user data from database
        const userSnapshot = await get(ref(fb_database, 'users/' + user.uid));
        const userData = userSnapshot.val();
        
        if (!userData) {
            return res.render("login", {
                error: "User data not found. Please contact support.",
                success: null
            });
        }
        
        // Set default balance to 40000 if not set or is 0
        const balance = (userData.balance !== undefined && userData.balance !== null && userData.balance !== 0) ? userData.balance : 40000;
        
        // Update database if balance was not set or is 0
        if (userData.balance === undefined || userData.balance === null || userData.balance === 0) {
            await set(ref(fb_database, 'users/' + user.uid + '/balance'), 40000);
        }
        
        // Store user data in session
        req.session.user = {
            uid: user.uid,
            email: user.email,
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName,
            balance: balance
        };
        
        // Redirect to dashboard
        res.redirect("/dashboard");
        
    } catch (error) {
        // Handle Firebase errors
        let errorMsg = "An error occurred. Please try again.";
        
        switch(error.code) {
            case 'auth/user-not-found':
                errorMsg = "No account found with this email. Please check your email or sign up.";
                break;
            case 'auth/wrong-password':
                errorMsg = "Incorrect password. Please try again.";
                break;
            case 'auth/invalid-email':
                errorMsg = "Invalid email address. Please check your email and try again.";
                break;
            case 'auth/user-disabled':
                errorMsg = "This account has been disabled. Please contact support.";
                break;
            case 'auth/network-request-failed':
                errorMsg = "Network error. Please check your internet connection and try again.";
                break;
            case 'auth/too-many-requests':
                errorMsg = "Too many failed login attempts. Please try again later.";
                break;
            default:
                errorMsg = error.message || errorMsg;
        }
        
        res.render("login", {
            error: errorMsg,
            success: null
        });
    }
});

app.get("/forgot-password", (req, res) => {
    const { oobCode, mode } = req.query;
    
    // If oobCode is present in query, user clicked reset link from email
    if (oobCode && mode === 'resetPassword') {
        // Extract email from the reset link if available, or show form to enter email
        res.render("forgot-password", { 
            error: null, 
            success: null, 
            formData: { oobCode: oobCode, email: req.query.email || '' },
            resetMode: true
        });
    } else {
        res.render("forgot-password", { error: null, success: null, formData: null, resetMode: false });
    }
});

app.post("/forgot-password", async (req, res) => {
    try {
        const { email, newPassword, confirmPassword, oobCode } = req.body;
        
        // If oobCode is provided, this is the password reset confirmation step
        if (oobCode) {
            // Validation for password reset confirmation
            if (!newPassword || !confirmPassword) {
                return res.render("forgot-password", {
                    error: "Both password fields are required",
                    success: null,
                    formData: { email: req.body.email, oobCode: oobCode }
                });
            }
            
            if (newPassword.length < 8) {
                return res.render("forgot-password", {
                    error: "Password must be at least 8 characters long",
                    success: null,
                    formData: { email: req.body.email, oobCode: oobCode }
                });
            }
            
            if (newPassword !== confirmPassword) {
                return res.render("forgot-password", {
                    error: "Passwords do not match",
                    success: null,
                    formData: { email: req.body.email, oobCode: oobCode }
                });
            }
            
            // Confirm password reset with the oobCode
            try {
                await confirmPasswordReset(auth, oobCode, newPassword);
                return res.render("forgot-password", {
                    error: null,
                    success: "Password reset successfully! You can now log in with your new password.",
                    formData: null
                });
            } catch (resetError) {
                let errorMsg = "Invalid or expired reset code. Please request a new password reset.";
                
                switch(resetError.code) {
                    case 'auth/expired-action-code':
                        errorMsg = "The password reset link has expired. Please request a new one.";
                        break;
                    case 'auth/invalid-action-code':
                        errorMsg = "Invalid reset code. Please check the link or request a new password reset.";
                        break;
                    case 'auth/weak-password':
                        errorMsg = "Password is too weak. Please use a stronger password.";
                        break;
                    default:
                        errorMsg = resetError.message || errorMsg;
                }
                
                return res.render("forgot-password", {
                    error: errorMsg,
                    success: null,
                    formData: { email: req.body.email }
                });
            }
        }
        
        // Initial password reset request - just email
        if (!email) {
            return res.render("forgot-password", {
                error: "Email address is required",
                success: null,
                formData: req.body
            });
        }
        
        // Send password reset email
        // Note: We don't check if user exists in database to avoid permission issues
        // Firebase Auth will handle this internally and send email if user exists
        // For security, we always show success message regardless of whether user exists
        try {
            await sendPasswordResetEmail(auth, email.trim(), {
                url: `${req.protocol}://${req.get('host')}/forgot-password`,
                handleCodeInApp: false
            });
            
            // Always show success message for security (prevents email enumeration)
            return res.render("forgot-password", {
                error: null,
                success: "If an account with this email exists, a password reset email has been sent. Please check your email inbox and click the link to reset your password.",
                formData: null
            });
        } catch (firebaseError) {
            // Handle Firebase errors
            let errorMsg = "An error occurred. Please try again.";
            
            switch(firebaseError.code) {
                case 'auth/invalid-email':
                    errorMsg = "Invalid email address. Please check your email and try again.";
                    break;
                case 'auth/user-not-found':
                    // For security, don't reveal if email exists - show same success message
                    return res.render("forgot-password", {
                        error: null,
                        success: "If an account with this email exists, a password reset email has been sent. Please check your inbox.",
                        formData: null
                    });
                case 'auth/network-request-failed':
                    errorMsg = "Network error. Please check your internet connection and try again.";
                    break;
                case 'auth/too-many-requests':
                    errorMsg = "Too many password reset requests. Please try again later.";
                    break;
                default:
                    // For any other error, still show generic success message for security
                    console.error("Password reset email error:", firebaseError);
                    return res.render("forgot-password", {
                        error: null,
                        success: "If an account with this email exists, a password reset email has been sent. Please check your inbox.",
                        formData: null
                    });
            }
            
            return res.render("forgot-password", {
                error: errorMsg,
                success: null,
                formData: req.body
            });
        }
        
    } catch (error) {
        // Handle unexpected errors
        console.error("Password reset error:", error);
        res.render("forgot-password", {
            error: "An unexpected error occurred. Please try again.",
            success: null,
            formData: req.body
        });
    }
});

app.get("/verify-email", async (req, res) => {
    const { oobCode, mode } = req.query;
    
    // If oobCode is present, user clicked verification link from email - auto-verify
    if (oobCode && mode === 'verifyEmail') {
        try {
            // Apply the verification code
            await applyActionCode(auth, oobCode);
            
            // Get email from query or session
            const email = req.query.email || (req.session.tempUser ? req.session.tempUser.email : null);
            
            // If we have tempUser in session, update database and create session
            if (req.session.tempUser && req.session.tempUser.uid) {
                // Update emailVerified in database
                await set(ref(fb_database, 'users/' + req.session.tempUser.uid + '/emailVerified'), true);
                
                // Fetch user data and create session
                const userSnapshot = await get(ref(fb_database, 'users/' + req.session.tempUser.uid));
                const userData = userSnapshot.val();
                
                if (userData) {
                    req.session.user = {
                        uid: req.session.tempUser.uid,
                        email: req.session.tempUser.email,
                        username: userData.username,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        balance: userData.balance || 0
                    };
                }
                
                // Clear temp user
                delete req.session.tempUser;
                
                // Redirect to dashboard
                return res.redirect("/dashboard?verified=true");
            } else {
                // No session, but verification succeeded - redirect to login
                return res.redirect("/login?verified=true");
            }
        } catch (verifyError) {
            let errorMsg = "Invalid or expired verification link. Please request a new verification email.";
            
            switch(verifyError.code) {
                case 'auth/expired-action-code':
                    errorMsg = "The verification link has expired. Please request a new verification email.";
                    break;
                case 'auth/invalid-action-code':
                    errorMsg = "Invalid verification link. Please check the link or request a new verification email.";
                    break;
                default:
                    errorMsg = verifyError.message || errorMsg;
            }
            
            return res.render("verify-email", {
                error: errorMsg,
                success: null,
                oobCode: null,
                verifying: false,
                email: req.query.email || (req.session.tempUser ? req.session.tempUser.email : null)
            });
        }
    } else {
        // Show verification pending page
        const email = req.session.tempUser ? req.session.tempUser.email : null;
        res.render("verify-email", { 
            error: null, 
            success: null,
            oobCode: null,
            verifying: false,
            email: email
        });
    }
});

app.post("/verify-email", async (req, res) => {
    try {
        const { oobCode } = req.body;
        
        if (!oobCode) {
            return res.render("verify-email", {
                error: "Verification code is required",
                success: null,
                oobCode: null,
                verifying: false,
                email: req.session.tempUser ? req.session.tempUser.email : null
            });
        }
        
        // Apply the verification code
        try {
            await applyActionCode(auth, oobCode);
            
            // Update user data in database
            if (req.session.tempUser && req.session.tempUser.uid) {
                await set(ref(fb_database, 'users/' + req.session.tempUser.uid + '/emailVerified'), true);
            }
            
            // Fetch user data and create session
            if (req.session.tempUser && req.session.tempUser.uid) {
                const userSnapshot = await get(ref(fb_database, 'users/' + req.session.tempUser.uid));
                const userData = userSnapshot.val();
                
                if (userData) {
                    req.session.user = {
                        uid: req.session.tempUser.uid,
                        email: req.session.tempUser.email,
                        username: userData.username,
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        balance: userData.balance || 0
                    };
                }
            }
            
            // Clear temp user
            delete req.session.tempUser;
            
            // Redirect to dashboard
            return res.redirect("/dashboard?verified=true");
            
        } catch (verifyError) {
            let errorMsg = "Invalid or expired verification link. Please request a new verification email.";
            
            switch(verifyError.code) {
                case 'auth/expired-action-code':
                    errorMsg = "The verification link has expired. Please request a new verification email.";
                    break;
                case 'auth/invalid-action-code':
                    errorMsg = "Invalid verification link. Please check the link or request a new verification email.";
                    break;
                default:
                    errorMsg = verifyError.message || errorMsg;
            }
            
            return res.render("verify-email", {
                error: errorMsg,
                success: null,
                oobCode: null,
                verifying: false,
                email: req.session.tempUser ? req.session.tempUser.email : null
            });
        }
        
    } catch (error) {
        console.error("Email verification error:", error);
        res.render("verify-email", {
            error: "An unexpected error occurred. Please try again.",
            success: null,
            oobCode: null,
            verifying: false,
            email: req.session.tempUser ? req.session.tempUser.email : null
        });
    }
});

app.post("/resend-verification", async (req, res) => {
    try {
        if (!req.session.tempUser || !req.session.tempUser.uid) {
            return res.json({ success: false, error: "No pending verification found" });
        }
        
        // Get user from Firebase Auth using the stored UID
        // Note: We need to use Admin SDK for this, but for now we'll use a workaround
        // Store the user reference during registration
        const userUid = req.session.tempUser.uid;
        
        // Try to get user from auth - this requires Admin SDK
        // For now, redirect user to register again or provide alternative
        return res.json({ 
            success: false, 
            error: "Please check your email inbox. If you didn't receive the email, please register again or contact support." 
        });
    } catch (error) {
        console.error("Resend verification error:", error);
        return res.json({ success: false, error: "Failed to resend verification email" });
    }
});

app.get("/register", (req, res) => {
    res.render("register", { error: null, formData: null });
});

app.get("/how-to-play", (req, res) => {
    res.render("how-to-play");
});

app.post("/register", async (req, res) => {
    try {
        const { firstName, lastName, username, email, phone, password, confirmPassword } = req.body;
        
        // Validation
        if (!firstName || !lastName || !username || !email || !phone || !password || !confirmPassword) {
            return res.render("register", {
                error: "All fields are required",
                formData: req.body
            });
        }
        
        if (password.length < 8) {
            return res.render("register", {
                error: "Password must be at least 8 characters long",
                formData: req.body
            });
        }
        
        if (password !== confirmPassword) {
            return res.render("register", {
                error: "Passwords do not match",
                formData: req.body
            });
        }
        
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send email verification
        try {
            await sendEmailVerification(user, {
                url: `${req.protocol}://${req.get('host')}/verify-email`,
                handleCodeInApp: false
            });
        } catch (verificationError) {
            console.error("Error sending verification email:", verificationError);
            // Continue with registration even if email sending fails
        }
        
        // Save additional user data to Realtime Database
        const userData = {
            uid: user.uid,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            username: username.trim(),
            email: email.trim(),
            phone: phone.trim(),
            balance: 40000,
            emailVerified: false,
            createdAt: serverTimestamp()
        };
        
        // Save to database
        await set(ref(fb_database, 'users/' + user.uid), userData);
        
        // Store user in session temporarily for verification page
        req.session.tempUser = {
            uid: user.uid,
            email: user.email
        };
        
        // Redirect to verify email page
        res.redirect("/verify-email");
        
    } catch (error) {
        // Handle Firebase errors
        let errorMsg = "An error occurred. Please try again.";
        
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMsg = "This email is already registered. Please use a different email or try logging in.";
                break;
            case 'auth/invalid-email':
                errorMsg = "Invalid email address. Please check your email and try again.";
                break;
            case 'auth/weak-password':
                errorMsg = "Password is too weak. Please use a stronger password.";
                break;
            case 'auth/network-request-failed':
                errorMsg = "Network error. Please check your internet connection and try again.";
                break;
            default:
                errorMsg = error.message || errorMsg;
        }
        
        res.render("register", {
            error: errorMsg,
            formData: req.body
        });
    }
});

app.get("/dashboard", async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
        return res.redirect("/login");
    }
    
    // Fetch latest user data from database
    try {
        const userSnapshot = await get(ref(fb_database, 'users/' + req.session.user.uid));
        const userData = userSnapshot.val();
        
        if (userData) {
            // Set default balance to 40000 if not set or is 0
            const balance = (userData.balance !== undefined && userData.balance !== null && userData.balance !== 0) ? userData.balance : 40000;
            
            // Update session with latest data
            req.session.user = {
                ...req.session.user,
                username: userData.username,
                firstName: userData.firstName,
                lastName: userData.lastName,
                balance: balance
            };
            
            // Update database if balance was not set or is 0
            if (userData.balance === undefined || userData.balance === null || userData.balance === 0) {
                await set(ref(fb_database, 'users/' + req.session.user.uid + '/balance'), 40000);
            }
        }
        
        res.render("dashboard", {
            user: req.session.user
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.render("dashboard", {
            user: req.session.user
        });
    }
});

app.post("/start-game", async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user || !req.session.user.uid) {
            return res.json({ 
                success: false, 
                error: "Please log in to start a game",
                requiresLogin: true
            });
        }
        
        const { gameType, betAmount, attempts, odds } = req.body;
        
        // Validate bet amount
        if (!betAmount || betAmount <= 0) {
            return res.json({ 
                success: false, 
                error: "Please select a bet amount",
                requiresBetAmount: true
            });
        }
        
        const gameTypeNum = parseInt(gameType) || 4;
        const betAmountNum = parseFloat(betAmount);
        const attemptsNum = parseInt(attempts) || 3;
        const oddsNum = parseFloat(odds) || 8;
        
        // Get user's current balance
        const userSnapshot = await get(ref(fb_database, 'users/' + req.session.user.uid));
        const userData = userSnapshot.val();
        
        // Set default balance to 40000 if not set
        let currentBalance = userData?.balance || 40000;
        
        // Check if user has sufficient balance
        if (currentBalance < betAmountNum) {
            return res.json({ 
                success: false, 
                error: "Insufficient balance. Please select a lower amount."
            });
        }
        
        // Subtract bet amount from balance
        const newBalance = currentBalance - betAmountNum;
        await set(ref(fb_database, 'users/' + req.session.user.uid + '/balance'), newBalance);
        
        // Generate random numbers (0-9) without duplicates
        const generateRandomNumbers = (count) => {
            // Ensure count doesn't exceed available digits (0-9 = 10 digits)
            const maxCount = Math.min(count, 10);
            const numbers = [];
            const used = new Set();
            
            // If count is 10 or less, we can generate unique numbers
            // For counts > 10, we'd need to allow duplicates, but limit to 10 unique
            const availableNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
            
            // Shuffle and take first 'maxCount' numbers
            for (let i = availableNumbers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableNumbers[i], availableNumbers[j]] = [availableNumbers[j], availableNumbers[i]];
            }
            
            return availableNumbers.slice(0, maxCount);
        };
        
        const generatedNumbers = generateRandomNumbers(gameTypeNum);
        
        // Store in user's database
        const gameData = {
            numbers: generatedNumbers,
            gameType: gameTypeNum,
            attempts: attemptsNum,
            odds: oddsNum,
            attemptsUsed: 0,
            betAmount: betAmountNum,
            createdAt: serverTimestamp(),
            status: 'active'
        };
        
        // Store in users/{uid}/currentGame
        await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame'), gameData);
        
        // Update session balance
        req.session.user.balance = newBalance;
        
        // Return success (but don't send the actual numbers to client)
        return res.json({ 
            success: true,
            message: "Numbers generated successfully",
            attempts: attemptsNum,
            odds: oddsNum,
            betAmount: betAmountNum,
            newBalance: newBalance
        });
        
    } catch (error) {
        console.error("Error starting game:", error);
        return res.json({ 
            success: false, 
            error: "Failed to start game. Please try again." 
        });
    }
});

app.get("/get-game-status", async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user || !req.session.user.uid) {
            return res.json({ 
                success: false, 
                hasActiveGame: false
            });
        }
        
        // Get user balance
        const userSnapshot = await get(ref(fb_database, 'users/' + req.session.user.uid));
        const userData = userSnapshot.val();
        const balance = userData?.balance || 40000;
        
        // Check if user has a game
        const gameSnapshot = await get(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame'));
        
        if (gameSnapshot.exists()) {
            const gameData = gameSnapshot.val();
            // Only return hasActiveGame: true if status is 'active'
            const isActive = gameData.status === 'active';
            
            return res.json({ 
                success: true,
                hasActiveGame: isActive,
                gameType: gameData.gameType,
                attempts: gameData.attempts || (gameData.gameType === 4 ? 3 : 4),
                attemptsUsed: gameData.attemptsUsed || 0,
                betAmount: gameData.betAmount || 0,
                status: gameData.status || 'active',
                winAmount: gameData.winAmount || 0,
                balance: balance
            });
        } else {
            return res.json({ 
                success: true,
                hasActiveGame: false,
                balance: balance
            });
        }
        
    } catch (error) {
        console.error("Error getting game status:", error);
        return res.json({ 
            success: false, 
            hasActiveGame: false
        });
    }
});

app.post("/guess", async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user || !req.session.user.uid) {
            return res.json({ 
                success: false, 
                error: "Please log in to place a bet",
                requiresLogin: true
            });
        }
        
        // Get current game from database
        const gameSnapshot = await get(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame'));
        
        if (!gameSnapshot.exists()) {
            return res.json({ 
                success: false, 
                error: "No active game found. Please start a new game.",
                noActiveGame: true
            });
        }
        
        const gameData = gameSnapshot.val();
        
        // Check if game is still active
        if (gameData.status !== 'active') {
            return res.json({ 
                success: false, 
                error: "This game has already ended. Please start a new game.",
                gameEnded: true
            });
        }
        
        // Check if user has attempts remaining
        const remainingAttempts = gameData.attempts - gameData.attemptsUsed;
        if (remainingAttempts <= 0) {
            return res.json({ 
                success: false, 
                error: "You have used all your attempts!",
                noAttemptsLeft: true
            });
        }
        
        // Get guess from request body
        const gameType = gameData.gameType;
        const guess = [];
        
        // Extract guess numbers based on game type
        for (let i = 1; i <= gameType; i++) {
            const guessValue = parseInt(req.body[`guess${i}`]);
            if (guessValue === undefined || guessValue === null || isNaN(guessValue) || guessValue < 0 || guessValue > 9) {
                return res.json({ 
                    success: false, 
                    error: `Please enter a valid number (0-9) for position ${i}`
                });
            }
            guess.push(guessValue);
        }
        
        // Get the generated numbers
        const generatedNumbers = gameData.numbers;
        
        // Check if guess matches exactly
        let exactMatch = true;
        let correctPositions = 0;
        let correctNumbers = 0;
        
        // Count exact position matches
        for (let i = 0; i < gameType; i++) {
            if (guess[i] === generatedNumbers[i]) {
                correctPositions++;
            } else {
                exactMatch = false;
            }
        }
        
        // Count correct numbers (regardless of position) - but only count each number once
        const guessCounts = {};
        const generatedCounts = {};
        
        for (let i = 0; i < gameType; i++) {
            guessCounts[guess[i]] = (guessCounts[guess[i]] || 0) + 1;
            generatedCounts[generatedNumbers[i]] = (generatedCounts[generatedNumbers[i]] || 0) + 1;
        }
        
        for (const num in guessCounts) {
            if (generatedCounts[num]) {
                correctNumbers += Math.min(guessCounts[num], generatedCounts[num]);
            }
        }
        
        // Increment attempts used
        const newAttemptsUsed = gameData.attemptsUsed + 1;
        const newRemainingAttempts = gameData.attempts - newAttemptsUsed;
        
        // Calculate win amount if exact match
        let winAmount = 0;
        let gameWon = false;
        let gameLost = false;
        
        if (exactMatch) {
            // User wins! Calculate win amount based on stored odds
            const odds = gameData.odds || (gameType === 4 ? 6 : 8); // Fallback to old system if odds not stored
            winAmount = gameData.betAmount * odds;
            
            // Update user balance
            const userSnapshot = await get(ref(fb_database, 'users/' + req.session.user.uid));
            const userData = userSnapshot.val();
            const currentBalance = userData?.balance || 0;
            
            // Add bet amount back PLUS winnings to balance
            // User gets their original bet returned + their winnings
            const totalPayout = gameData.betAmount + winAmount;
            const newBalance = currentBalance + totalPayout;
            
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/balance'), newBalance);
            
            // Update session balance
            req.session.user.balance = newBalance;
            
            // Mark game as won
            gameWon = true;
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/status'), 'won');
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/attemptsUsed'), newAttemptsUsed);
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/winAmount'), winAmount);
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/endedAt'), serverTimestamp());
            // Store user's winning guess
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/userNumbers'), guess);
            
        } else if (newRemainingAttempts <= 0) {
            // User lost - no attempts left
            gameLost = true;
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/status'), 'lost');
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/attemptsUsed'), newAttemptsUsed);
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/endedAt'), serverTimestamp());
            // Store user's final guess
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/userNumbers'), guess);
        } else {
            // Update attempts used but game continues
            await set(ref(fb_database, 'users/' + req.session.user.uid + '/currentGame/attemptsUsed'), newAttemptsUsed);
        }
        
        // Return feedback
        return res.json({ 
            success: true,
            exactMatch: exactMatch,
            correctPositions: correctPositions,
            correctNumbers: correctNumbers,
            remainingAttempts: newRemainingAttempts,
            gameWon: gameWon,
            gameLost: gameLost,
            winAmount: winAmount,
            message: exactMatch 
                ? `🎉 Congratulations! You won! The numbers were ${generatedNumbers.join(', ')}. You won ₦${winAmount.toLocaleString()}.` 
                : gameLost 
                    ? `Game Over! The correct numbers were ${generatedNumbers.join(', ')}. Better luck next time!`
                    : `You got ${correctPositions} number(s) in the correct position and ${correctNumbers} correct number(s) total. ${newRemainingAttempts} attempt(s) remaining.`
        });
        
    } catch (error) {
        console.error("Error processing guess:", error);
        return res.json({ 
            success: false, 
            error: "Failed to process your bet. Please try again." 
        });
    }
});

app.post("/clear-completed-game", async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user || !req.session.user.uid) {
            return res.json({ 
                success: false, 
                error: "Please log in"
            });
        }
        
        const userId = req.session.user.uid;
        
        // Get current game from database
        const gameSnapshot = await get(ref(fb_database, 'users/' + userId + '/currentGame'));
        
        if (gameSnapshot.exists()) {
            const gameData = gameSnapshot.val();
            // Only move if game is won or lost
            if (gameData.status === 'won' || gameData.status === 'lost') {
                // Create history entry with all game data plus user ID
                const historyEntry = {
                    ...gameData,
                    userId: userId,
                    completedAt: serverTimestamp()
                };
                
                // Generate a unique game ID for history
                const gameId = gameData.createdAt ? gameData.createdAt.toString() : Date.now().toString();
                
                // Move to gameHistory node
                await set(ref(fb_database, 'users/' + userId + '/gameHistory/' + gameId), historyEntry);
                
                // Remove from currentGame
                await remove(ref(fb_database, 'users/' + userId + '/currentGame'));
            }
        }
        
        return res.json({ 
            success: true,
            message: "Completed game moved to history"
        });
        
    } catch (error) {
        console.error("Error moving completed game:", error);
        return res.json({ 
            success: false, 
            error: "Failed to move game to history" 
        });
    }
});

app.get("/get-game-history", async (req, res) => {
    try {
        // Check if user is logged in
        if (!req.session.user || !req.session.user.uid) {
            return res.json({ 
                success: false, 
                error: "Please log in",
                history: []
            });
        }
        
        const userId = req.session.user.uid;
        
        // Get game history from database
        const historySnapshot = await get(ref(fb_database, 'users/' + userId + '/gameHistory'));
        
        if (historySnapshot.exists()) {
            const historyData = historySnapshot.val();
            // Convert to array and sort by completedAt (most recent first)
            const historyArray = Object.keys(historyData).map(key => ({
                id: key,
                ...historyData[key]
            })).sort((a, b) => {
                // Sort by completedAt timestamp, most recent first
                const timeA = a.completedAt || a.createdAt || 0;
                const timeB = b.completedAt || b.createdAt || 0;
                return timeB - timeA;
            });
            
            return res.json({ 
                success: true,
                history: historyArray
            });
        } else {
            return res.json({ 
                success: true,
                history: []
            });
        }
        
    } catch (error) {
        console.error("Error getting game history:", error);
        return res.json({ 
            success: false, 
            error: "Failed to get game history",
            history: []
        });
    }
});

app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
        }
        res.redirect("/");
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
