import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1>Check your email</h1>
        <p>
          We sent a confirmation link to <strong>{email}</strong>.
        </p>
        <p className="mt-4">
          <a href="/signin" style={{ color: "#8c1a6a", textDecoration: "underline" }}>
            Go to sign in
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1>Register</h1>
      <p>
        Already have an account?{" "}
        <a href="/signin" style={{ color: "#8c1a6a", textDecoration: "underline" }}>
          Sign in
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
          Register
        </button>
      </form>
    </div>
  );
}
