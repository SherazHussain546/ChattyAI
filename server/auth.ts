import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { adminAuth } from './firebase';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Verify Firebase ID token and return the decoded token
export async function verifyFirebaseToken(token: string) {
  try {
    if (!adminAuth) {
      throw new Error('Firebase Admin not initialized');
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw error;
  }
}

// Get or create a user from a Firebase auth token
async function getUserFromFirebaseToken(decodedToken: any) {
  try {
    // Check if user already exists with this Firebase UID
    const existingUser = await storage.getUserByFirebaseUid(decodedToken.uid);
    
    if (existingUser) {
      return existingUser;
    }
    
    // Create a new user record
    const newUser = await storage.createUser({
      username: decodedToken.email || `user_${Date.now()}`, // Fallback if email not available
      email: decodedToken.email,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      firebaseUid: decodedToken.uid,
      isAnonymous: decodedToken.firebase?.sign_in_provider === 'anonymous'
    });
    
    return newUser;
  } catch (error) {
    console.error('Error getting/creating user from Firebase token:', error);
    throw error;
  }
}

// Create a guest user (anonymous authentication)
async function createGuestUser() {
  try {
    // Create an anonymous user
    const guestUser = await storage.createUser({
      username: `guest_${Date.now()}`,
      isAnonymous: true,
      displayName: "Guest User"
    });
    
    return guestUser;
  } catch (error) {
    console.error('Error creating guest user:', error);
    throw error;
  }
}

// Firebase authentication middleware
export function firebaseAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // No token, proceed to next middleware
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  verifyFirebaseToken(idToken)
    .then(async (decodedToken) => {
      if (!req.isAuthenticated()) {
        // Get or create user from Firebase token
        const user = await getUserFromFirebaseToken(decodedToken);
        
        // Log user in
        req.login(user, (err) => {
          if (err) {
            console.error('Error logging in Firebase user:', err);
            return next(err);
          }
          next();
        });
      } else {
        next();
      }
    })
    .catch((error) => {
      console.error('Error in Firebase auth middleware:', error);
      next();
    });
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string | undefined) {
  if (!stored) return false;
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET not set. Using a default secret (not secure for production).");
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password ?? ''))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        console.error("Error in authentication:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).send("Error registering user");
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.status(200).json(userWithoutPassword);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Don't send password back to client
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
  
  // Firebase auth login route
  app.post("/api/firebase-auth", async (req, res, next) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ error: "No token provided" });
      }
      
      // Verify the Firebase token
      const decodedToken = await verifyFirebaseToken(idToken);
      
      // Get or create user from Firebase token
      const user = await getUserFromFirebaseToken(decodedToken);
      
      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error("Error logging in Firebase user:", err);
          return next(err);
        }
        
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error in Firebase authentication:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  });
  
  // Guest login route
  app.post("/api/guest-login", async (req, res, next) => {
    try {
      // Create a guest user
      const guestUser = await createGuestUser();
      
      // Log user in
      req.login(guestUser, (err) => {
        if (err) {
          console.error("Error logging in guest user:", err);
          return next(err);
        }
        
        // Don't send password back to client
        const { password, ...userWithoutPassword } = guestUser;
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error in guest login:", error);
      res.status(500).json({ error: "Failed to create guest account" });
    }
  });
  
  // Use Firebase auth middleware for all routes
  app.use(firebaseAuthMiddleware);
}
