"use client";

import { useState } from "react";

export function Composer({ onSubmit }: { onSubmit: (message: string) => void }) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        placeholder="输入消息..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">发送</button>
    </form>
  );
}
