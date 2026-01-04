import type { Request } from "express";
import { jwtVerify, importJWK, type JWTPayload, type KeyLike } from "jose";
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

// Supabase ES256 公钥 (JWK 格式)
const SUPABASE_JWK = {
  "x": "LzZGPnouBoh2U1xFf_DcmSuMQLs6DdcBaZiQLOkqYD0",
  "y": "dfuKYEc6DG9dQXNBFubBV9T1iF7XqAJUMCswHMfF548",
  "alg": "ES256",
  "crv": "P-256",
  "ext": true,
  "kid": "bdfafc57-b0e6-4e69-97fe-a886830ad366",
  "kty": "EC",
  "key_ops": ["verify"]
};

let cachedPublicKey: KeyLike | null = null;

async function getSupabasePublicKey(): Promise<KeyLike> {
  if (cachedPublicKey) return cachedPublicKey;
  cachedPublicKey = await importJWK(SUPABASE_JWK, "ES256") as KeyLike;
  return cachedPublicKey;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== "string") return null;
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value.trim();
}

async function verifySupabaseJwt(token: string): Promise<SupabaseJwtPayload | null> {
  // 首先尝试 ES256 验证 (新版 Supabase)
  try {
    const publicKey = await getSupabasePublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ["ES256"]
    });
    return payload as SupabaseJwtPayload;
  } catch (es256Error: any) {
    // 如果 ES256 失败，尝试 HS256 (旧版 Supabase 或 Legacy secret)
    if (ENV.supabaseJwtSecret) {
      try {
        const { payload } = await jwtVerify(
          token,
          encoder.encode(ENV.supabaseJwtSecret),
          { algorithms: ["HS256", "HS384", "HS512"] }
        );
        return payload as SupabaseJwtPayload;
      } catch (hs256Error) {
        console.warn("[Auth] HS256 verification also failed:", hs256Error);
      }
    }
    console.warn("[Auth] Supabase JWT verification failed:", es256Error);
    return null;
  }
}

function deriveDisplayName(payload: SupabaseJwtPayload): string | null {
  const meta = payload.user_metadata || {};
  const candidates = [
    meta["name"],
    meta["full_name"],
    meta["display_name"],
    payload.email,
  ];
  return (
    candidates.find(
      value => typeof value === "string" && value.trim().length > 0
    ) ?? null
  );
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

  return db.getUserByOpenId(openId);
}
