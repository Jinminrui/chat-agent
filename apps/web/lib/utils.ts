import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 Tailwind CSS 类名的工具函数
 *
 * 结合了 clsx（条件类名）和 tailwind-merge（智能合并）的功能。
 * - clsx: 处理条件类名，如 cn("base", isActive && "active")
 * - tailwind-merge: 智能合并冲突的 Tailwind 类，如 cn("p-2", "p-4") → "p-4"
 *
 * @example
 * cn("px-2 py-1", "px-4") // → "px-4 py-1"
 * cn("bg-red-500", isActive && "bg-blue-500") // → isActive ? "bg-blue-500" : "bg-red-500"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
