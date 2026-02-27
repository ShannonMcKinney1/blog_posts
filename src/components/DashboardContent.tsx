import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Auth from "./Auth";

export default function DashboardContent() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setEmail(data.user.email ?? null);
        setAuthenticated(true);
      }
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return null;

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1>Sign in</h1>
        <p className="mb-4">Sign in with Google to access your dashboard.</p>
        <Auth redirectTo={`${window.location.origin}/dashboard`} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card shadow-xl p-6" style={{ backgroundColor: "#eae1f4" }}>
        <h1>Welcome {email}</h1>
        <p>We are happy to see you here</p>
        <button
          onClick={handleSignOut}
          className="btn mt-4"
          style={{ backgroundColor: "#8c1a6a", color: "white", border: "none" }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
