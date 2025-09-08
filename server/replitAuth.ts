import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Generate a username from email or use a default pattern for OAuth users
  const username = claims["email"] ? claims["email"].split('@')[0] + '_oauth' : 'oauth_user_' + claims["sub"];
  
  await storage.upsertUser({
    id: String(claims["sub"]), // Ensure ID is a string
    username: username,
    password: null, // OAuth users don't need passwords
    email: claims["email"] || null,
    firstName: claims["first_name"] || null,
    lastName: claims["last_name"] || null,
    profileImageUrl: claims["profile_image_url"] || null,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    
    // Ensure the user object maintains OAuth structure for session
    console.log("OAuth user created with claims:", { 
      hasUser: !!user, 
      hasClaims: !!(user as any).claims,
      hasSub: !!((user as any).claims && (user as any).claims.sub),
      userKeys: Object.keys(user)
    });
    
    verified(null, user as any);
  };

  // Support both production domains and localhost for development
  const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
  const allDomains = [...domains, "localhost", "7c2800e2-dc85-4b8d-b4f0-349225d230ba.janeway.prod.repl.run", "07484835-201d-4254-8d4d-d43ff0f457fe.janeway.prod.repl.run"];
  
  for (const domain of allDomains) {
    const isLocalhost = domain === "localhost";
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `${isLocalhost ? 'http://localhost:5000' : `https://${domain}`}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => {
    // For OAuth users, serialize the entire user object to preserve claims structure
    console.log("Serializing OAuth user:", { 
      hasUser: !!user, 
      hasClaims: !!(user as any).claims,
      hasSub: !!((user as any).claims && (user as any).claims.sub),
      userKeys: user ? Object.keys(user) : []
    });
    cb(null, user);
  });
  passport.deserializeUser((user: Express.User, cb) => {
    // For OAuth users, the user object already contains all necessary data
    console.log("Deserializing OAuth user:", { 
      hasUser: !!user, 
      hasClaims: !!(user as any).claims,
      hasSub: !!((user as any).claims && (user as any).claims.sub),
      userKeys: user ? Object.keys(user) : []
    });
    cb(null, user);
  });

  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("OAuth callback received for hostname:", req.hostname);
    console.log("Query params:", req.query);
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) {
        console.error("OAuth callback error:", err);
        return res.redirect("/api/login");
      }
      next();
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Check basic authentication
  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Support both OAuth authentication (has claims) and local authentication (has id)
  if (user.claims && user.claims.sub) {
    // OAuth authentication - check token expiration and handle refresh
    if (!user.expires_at) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const now = Math.floor(Date.now() / 1000);
    if (now <= user.expires_at) {
      return next();
    }

    // Try to refresh token
    const refreshToken = user.refresh_token;
    if (!refreshToken) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      return next();
    } catch (error) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
  }
  
  if (user.id) {
    // Local authentication - proceed directly
    return next();
  }

  // Neither authentication method worked
  console.error("Authentication failed: Invalid user structure", { 
    hasUser: !!user, 
    hasClaims: !!(user && user.claims),
    hasSub: !!(user && user.claims && user.claims.sub),
    hasId: !!(user && user.id),
    userKeys: user ? Object.keys(user) : []
  });
  
  return res.status(401).json({ message: "Unauthorized - Invalid session" });
};