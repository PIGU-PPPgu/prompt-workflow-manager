import type { Request } from "express";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

type SupabaseJwtPayload = JWTPayload & {
  sub?: string;
  email?: string;
  app_metadata?: { provider?: string };
  user_metadata?: Record<string, unknown>;
};

const encoder = new TextEncoder();

let supabaseJwksClient:
  | ReturnType<typeof createRemoteJWKSet>
  | null = null;

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value.trim();
}

async function verifyWithRemoteJwks(
  token: string
): Promise<SupabaseJwtPayload | null> {
  if (!ENV.supabaseUrl) return null;

  try {
    if (!supabaseJwksClient) {
      const jwksUrl = new URL("/auth/v1/certs", ENV.supabaseUrl);
      supabaseJwksClient = createRemoteJWKSet(jwksUrl);
    }

    const { payload } = await jwtVerify(token, supabaseJwksClient, {
      algorithms: ["RS256", "ES256"],
    });
    return payload as SupabaseJwtPayload;
  } catch (error) {
    console.warn("[Auth] Supabase JWKS verification failed:", error);
    return null;
  }
}

async function verifySupabaseJwt(token: string): Promise<SupabaseJwtPayload | null> {
  // 1) 新版 Supabase: 使用 JWKS (ES/RS 签名)
  const jwksPayload = await verifyWithRemoteJwks(token);
  if (jwksPayload) return jwksPayload;

  // 2) 旧版/本地开发: 使用 HS256 Secret 验证
  if (ENV.supabaseJwtSecret) {
    try {
      const { payload } = await jwtVerify(
        token,
        encoder.encode(ENV.supabaseJwtSecret),
        { algorithms: ["HS256", "HS384", "HS512"] }
      );
      return payload as SupabaseJwtPayload;
    } catch (hs256Error) {
      console.warn("[Auth] HS256 verification failed:", hs256Error);
    }
  }

  console.warn("[Auth] Supabase JWT verification failed for all strategies");
  return null;
}

function deriveDisplayName(payload: SupabaseJwtPayload): string | null {
  const meta = payload.user_metadata || {};
  const candidates = [
    meta["name"],
    meta["full_name"],
    meta["display_name"],
    payload.email,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  const payload = await verifySupabaseJwt(token);
  if (!payload?.sub) return null;

  const openId = payload.sub;
  const email =
    typeof payload.email === "string" ? payload.email : null;
  const name = deriveDisplayName(payload);
  const loginMethod =
    (payload.app_metadata?.provider as string) || "supabase";

  try {
    await db.upsertUser({
      openId,
      email,
      name,
      loginMethod,
      lastSignedIn: new Date(),
    });
  } catch (error) {
    console.error("[Auth] Failed to upsert Supabase user:", error);
    return null;
  }

  const user = await db.getUserByOpenId(openId);
  return user ?? null;
}
