"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/api/auth";

/**
 * 登录表单组件
 *
 * 功能：
 * - 支持用户名或邮箱登录
 * - 表单验证（HTML5 原生验证）
 * - 错误处理和 loading 状态
 * - 登录成功后跳转到聊天页面
 */
export function LoginForm() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(usernameOrEmail, password);
      // 登录成功：跳转到聊天页面
      router.push("/chat");
    } catch (err) {
      // 登录失败：显示错误信息
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="usernameOrEmail">用户名或邮箱</Label>
        <Input
          id="usernameOrEmail"
          placeholder="请输入用户名或邮箱"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          type="password"
          placeholder="请输入密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {/* 错误提示：仅在登录失败时显示 */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "登录中..." : "登录"}
      </Button>
    </form>
  );
}
