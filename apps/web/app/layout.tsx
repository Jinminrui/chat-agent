import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

/** Geist 字体配置：用于全局的无衬线字体 */
const geist = Geist({subsets:['latin'],variable:'--font-sans'});

/** 全局元数据：用于 SEO 和浏览器标签页 */
export const metadata: Metadata = {
  title: "Chat Agent",
  description: "AI 助手",
};

/**
 * 根布局组件
 *
 * 所有页面的根容器，负责：
 * - 设置 HTML 语言为中文
 * - 应用全局字体（Geist）
 * - 设置基础样式（最小高度、背景色、字体平滑）
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={cn("font-sans", geist.variable)}>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
