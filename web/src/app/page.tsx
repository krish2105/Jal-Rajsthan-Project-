import { AuthProvider } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default function Home() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
