import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await signOut(auth);
    navigate("/login");
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button onClick={logout} className="bg-transparent border text-current">Log out</Button>
      </header>
      <p className="opacity-80">Signed in as <strong>{user?.email}</strong></p>
    </main>
  );
}
