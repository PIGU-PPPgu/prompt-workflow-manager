import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/lib/trpc";
import { APP_LOGO, APP_TITLE } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "signin" | "signup";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const registerMutation = trpc.auth.register.useMutation();
  const validateCodeQuery = trpc.invitationCodes.validate.useQuery(
    { code: invitationCode },
    {
      enabled: mode === "signup" && invitationCode.length >= 6,
      retry: false,
    }
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        // Sign in with Supabase
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) {
          setError(authError.message);
          setLoading(false);
          return;
        }

        setMessage("登录成功，即将进入应用...");
        setTimeout(() => setLocation("/"), 600);
      } else {
        // Register with backend API (includes invitation code validation)
        if (!validateCodeQuery.data?.valid) {
          setError("请输入有效的邀请码");
          setLoading(false);
          return;
        }

        await registerMutation.mutateAsync({
          email,
          password,
          name: name || undefined,
          invitationCode,
        });

        setMessage("注册成功！请使用邮箱和密码登录。");
        // Switch to sign in mode after successful registration
        setTimeout(() => {
          setMode("signin");
          setPassword("");
          setInvitationCode("");
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f6f4] to-[#ecebe8] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl border border-black/5 p-8">
        <div className="flex flex-col items-center gap-2 mb-8 text-center">
          <div className="w-12 h-12 bg-[#f4f4f1] border border-black/5 rounded-xl flex items-center justify-center">
            <img src={APP_LOGO} alt="logo" className="w-8 h-8" />
          </div>
          <p className="text-sm text-neutral-500">欢迎使用</p>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {APP_TITLE}
          </h1>
          <p className="text-sm text-neutral-500">
            使用 Email + 密码登录（Supabase Auth）
          </p>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">
                邀请码 <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                placeholder="请输入邀请码"
                value={invitationCode}
                required
                onChange={e => setInvitationCode(e.target.value.toUpperCase())}
                className={
                  invitationCode.length >= 6
                    ? validateCodeQuery.data?.valid
                      ? "border-green-500"
                      : "border-red-500"
                    : ""
                }
              />
              {invitationCode.length >= 6 && (
                <p
                  className={`text-sm ${
                    validateCodeQuery.data?.valid
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {validateCodeQuery.data?.valid
                    ? "✓ 邀请码有效"
                    : validateCodeQuery.data?.error || "邀请码无效"}
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">
              邮箱 <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              required
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700">
              密码 <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              placeholder="至少 6 位"
              minLength={6}
              value={password}
              required
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {mode === "signup" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">
                姓名（可选）
              </label>
              <Input
                type="text"
                placeholder="您的姓名"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <Button
            type="submit"
            className="w-full h-11"
            disabled={loading}
          >
            {loading
              ? "请稍候..."
              : mode === "signin"
                ? "登录"
                : "注册"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-600">
          {mode === "signin" ? (
            <>
              没有账号？
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="font-medium text-neutral-900 underline ml-1"
              >
                注册
              </button>
            </>
          ) : (
            <>
              已有账号？
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="font-medium text-neutral-900 underline ml-1"
              >
                直接登录
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
