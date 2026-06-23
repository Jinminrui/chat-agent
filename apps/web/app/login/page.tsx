import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthCard
      title="Chat Agent"
      description="AI 助手"
      footerText="没有账号？"
      footerLink="/register"
      footerLinkText="立即注册"
    >
      <LoginForm />
    </AuthCard>
  );
}
