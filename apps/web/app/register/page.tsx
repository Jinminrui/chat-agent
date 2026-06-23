import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

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
