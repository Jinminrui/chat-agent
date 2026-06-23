"use client";

import { useState } from "react";
import { login } from "@/lib/api/auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const emailOrUsername = formData.get("emailOrUsername") as string;
    const password = formData.get("password") as string;

    try {
      await login(emailOrUsername, password);
      window.location.href = "/";
    } catch {
      setError("登录失败，请检查邮箱和密码");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p role="alert">{error}</p>}
      <label>
        邮箱或用户名
        <input name="emailOrUsername" type="text" required />
      </label>
      <label>
        密码
        <input name="password" type="password" required />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
