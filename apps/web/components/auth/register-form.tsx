"use client";

import { useState } from "react";
import { register } from "@/lib/api/auth";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      await register(email, password);
      window.location.href = "/";
    } catch {
      setError("注册失败，该邮箱可能已被注册");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p role="alert">{error}</p>}
      <label>
        邮箱
        <input name="email" type="email" required />
      </label>
      <label>
        密码
        <input name="password" type="password" minLength={8} required />
      </label>
      <button type="submit" disabled={loading}>
        {loading ? "注册中..." : "注册"}
      </button>
    </form>
  );
}
