import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string) {
  return await bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  // Use PostgreSQL session store in production, memory store in development
  let store;
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Production: Require PostgreSQL session store for persistence
    if (!process.env.DATABASE_URL) {
      console.error('❌ CRITICAL: DATABASE_URL environment variable must be set in production!');
      console.error('   PostgreSQL session store required for production session persistence');
      process.exit(1);
    }
    
    const PgSession = connectPgSimple(session);
    store = new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session', // Table will be created automatically
      createTableIfMissing: true,
      pruneSessionInterval: 60 * 15, // Cleanup every 15 minutes
      errorLog: (error: any) => {
        console.error('Session store error:', error);
      }
    });
    console.log('✅ Using PostgreSQL session store for production');
  } else {
    // Development: Use memory store
    const memoryStore = MemoryStore(session);
    store = new memoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    console.log('🔧 Using memory session store for development');
  }
  
  // Ensure session secret is set in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (isProduction && (!sessionSecret || sessionSecret === 'dev-secret-key-replace-in-prod')) {
    console.error('❌ CRITICAL: SESSION_SECRET environment variable must be set in production!');
    console.error('   Generate a secure secret and set SESSION_SECRET in your production environment');
    process.exit(1);
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret || "dev-secret-key-replace-in-prod",
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
      httpOnly: true,
      secure: isProduction, // true in production for HTTPS, false in development
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
      sameSite: 'lax' // Compatible with OAuth flows while maintaining security
    }
  };
  
  console.log(`🔐 Session configuration: secure=${sessionSettings.cookie!.secure}, sameSite=${sessionSettings.cookie!.sameSite}`);

  // Trust proxy for production deployments (needed for secure cookies behind reverse proxy)
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Alias /api/auth/user to match client expectations (must be AFTER session middleware)
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json(req.user);
  });

  passport.use(
    new LocalStrategy({
        usernameField: 'email' // Use email instead of username
      }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
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
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { 
        password, 
        email, 
        firstName, 
        lastName, 
        homeSuburb, 
        accountType,
        businessName,
        businessDescription,
        businessWebsite,
        businessPhone,
        businessAddress,
        businessCategory
      } = req.body;
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const userData: any = {
        password: await hashPassword(password),
        email: email.toLowerCase(),
        firstName,
        lastName,
        homeSuburb,
        accountType: accountType || 'regular'
      };

      // Add business fields if it's a business account
      if (accountType === 'business') {
        userData.businessName = businessName;
        userData.businessDescription = businessDescription;
        userData.businessWebsite = businessWebsite;
        userData.businessPhone = businessPhone;
        userData.businessAddress = businessAddress;
        userData.businessCategory = businessCategory;
      }

      const user = await storage.createUser(userData);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Login session error:", err);
          return res.status(500).json({ error: "Session error" });
        }
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  // Check if user is authenticated via Passport
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  // Check if user object exists and has valid ID (either local auth or OAuth)
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized - No user" });
  }
  
  // For OAuth authentication (has claims structure)
  if (req.user.claims && req.user.claims.sub) {
    return next();
  }
  
  // For local authentication (direct user object with ID)
  if (req.user.id) {
    return next();
  }
  
  // Neither authentication method worked
  console.error("Authentication failed: User has database fields but no OAuth claims, requiring re-authentication", { 
    hasUser: !!req.user, 
    hasClaims: !!(req.user && req.user.claims),
    hasSub: !!(req.user && req.user.claims && req.user.claims.sub),
    hasId: !!(req.user && req.user.id)
  });
  return res.status(401).json({ message: "Unauthorized - Please log in again" });
}