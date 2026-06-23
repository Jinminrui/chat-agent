interface AuthCardProps {
  title: string;
  children: React.ReactNode;
}

export function AuthCard({ title, children }: AuthCardProps) {
  return (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  );
}
