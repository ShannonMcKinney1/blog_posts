import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        window.location.href = "/dashboard";
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return;
    }

    window.location.href = "/dashboard";
  };

  if (loading) return null;

  return (
    <div className="max-w-md mx-auto p-6">
      <h1>Sign in</h1>
      <p>
        New here?{" "}
        <a href="/register" style={{ color: "#8c1a6a", textDecoration: "underline" }}>
          Create an account
        </a>
      </p>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control w-full">
          <label className="label" htmlFor="email">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input input-bordered w-full"
            style={{ backgroundColor: "#eae1f4" }}
            required
          />
        </div>
        <div className="form-control w-full">
          <label className="label" htmlFor="password">
            <span className="label-text">Password</span>
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input input-bordered w-full"
            style={{ backgroundColor: "#eae1f4" }}
            required
          />
        </div>
        <button
          type="submit"
          className="btn w-full"
          style={{ backgroundColor: "#8c1a6a", color: "white", border: "none" }}
        >
          Login
        </button>
      </form>
    </div>
  );
}
