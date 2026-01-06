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
  // 调试: 打印 token 的前 50 个字符和 secret 信息
  console.log("[Auth] Verifying JWT token (first 50 chars):", token.substring(0, 50) + "...");
  console.log("[Auth] JWT Secret configured:", ENV.supabaseJwtSecret ? `Yes (${ENV.supabaseJwtSecret.length} chars)` : "No");

  // 1) Supabase Cloud / 本地开发: 优先使用 HS256 Secret 验证
  if (ENV.supabaseJwtSecret) {
    // 尝试方式1: 直接使用 UTF-8 编码的 secret（最常见情况）
    try {
      const rawSecretKey = encoder.encode(ENV.supabaseJwtSecret);
      console.log("[Auth] Trying raw UTF-8 secret, key length:", rawSecretKey.length);
      const { payload } = await jwtVerify(
        token,
        rawSecretKey,
        { algorithms: ["HS256", "HS384", "HS512"] }
      );
      console.log("[Auth] JWT verified with raw UTF-8 secret");
      return payload as SupabaseJwtPayload;
    } catch (rawError: any) {
      console.log("[Auth] Raw UTF-8 verification failed:", rawError.code || rawError.message);
    }

    // 尝试方式2: base64 解码后的 secret
    try {
      const decoded = Buffer.from(ENV.supabaseJwtSecret, 'base64');
      console.log("[Auth] Trying base64 decoded secret, decoded length:", decoded.length);
      if (decoded.length > 0) {
        const decodedSecretKey = new Uint8Array(decoded);
        const { payload } = await jwtVerify(
          token,
          decodedSecretKey,
          { algorithms: ["HS256", "HS384", "HS512"] }
        );
        console.log("[Auth] JWT verified with base64 decoded secret");
        return payload as SupabaseJwtPayload;
      }
    } catch (base64Error: any) {
      console.log("[Auth] Base64 decoded verification failed:", base64Error.code || base64Error.message);
    }

    console.warn("[Auth] HS256 verification failed with both raw and base64 secret");
  } else {
    console.warn("[Auth] No SUPABASE_JWT_SECRET configured");
  }

  // 2) 自托管 Supabase: 使用 JWKS (ES/RS 签名)
  const jwksPayload = await verifyWithRemoteJwks(token);
  if (jwksPayload) {
    console.log("[Auth] JWT verified with JWKS");
    return jwksPayload;
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
