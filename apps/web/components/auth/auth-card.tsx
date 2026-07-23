import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import Link from "next/link";

interface AuthCardProps {
  /** 卡片标题 */
  title: string;
  /** 卡片描述 */
  description: string;
  /** 卡片内容（表单组件） */
  children: React.ReactNode;
  /** 底部提示文本（如"没有账号？"） */
  footerText: string;
  /** 底部链接地址（如注册页） */
  footerLink: string;
  /** 底部链接文本（如"立即注册"） */
  footerLinkText: string;
}

/**
 * 认证卡片组件
 *
 * 用于登录和注册页面的布局容器，提供统一的视觉样式。
 * 包含标题、描述、表单内容区域和底部链接。
 *
 * 使用示例：
 * ```tsx
 * <AuthCard
 *   title="Chat Agent"
 *   description="AI 助手"
 *   footerText="没有账号？"
 *   footerLink="/register"
 *   footerLinkText="立即注册"
 * >
 *   <LoginForm />
 * </AuthCard>
 * ```
 */
export function AuthCard({
  title,
  description,
  children,
  footerText,
  footerLink,
  footerLinkText,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-[420px]">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <MessageSquare className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {footerText}{" "}
            <Link href={footerLink} className="text-primary hover:underline">
              {footerLinkText}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
