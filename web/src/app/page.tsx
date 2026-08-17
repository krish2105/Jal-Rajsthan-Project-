import { AuthGate } from "@/components/LoginGate";
import { AppShell } from "@/components/AppShell";

export default function Home() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}
