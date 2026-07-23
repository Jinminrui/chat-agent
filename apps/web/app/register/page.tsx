import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

/**
 * 注册页面
 *
 * 使用 AuthCard 组件提供统一的认证页面布局，
 * 包含注册表单和指向登录页的链接。
 */
export default function RegisterPage() {
  return (
    <AuthCard
      title="创建账号"
      description="注册新账号"
      footerText="已有账号？"
      footerLink="/login"
      footerLinkText="立即登录"
    >
      <RegisterForm />
    </AuthCard>
  );
}
