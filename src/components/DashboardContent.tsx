import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function DashboardContent() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/signin";
      } else {
        setEmail(data.user.email ?? null);
        setLoading(false);
      }
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/signin";
  };

  if (loading) return null;

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
