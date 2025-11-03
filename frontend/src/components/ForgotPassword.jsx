import React, { useState } from "react";
import { postJSON } from "./api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null); // shown only in dev when API returns token

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    setToken(null);
    try {
      const res = await postJSON("/api/auth/forgot-password", { email });
      setMessage(
        res.message || "If the email exists, a reset token has been generated."
      );
      if (res.token) setToken(res.token); // dev-only: server returns token
    } catch (err) {
      setError(
        err.response?.message || err.message || "Failed to request reset"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", padding: 16 }}>
      <h2>Forgot Password</h2>
      <p>Enter your email to receive a password reset token.</p>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Email
          <input
            type="email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: "8px 12px" }}
        >
          {loading ? "Sending..." : "Send Reset Token"}
        </button>
      </form>

      {message && (
        <div style={{ marginTop: 12, color: "green" }}>{message}</div>
      )}
      {error && <div style={{ marginTop: 12, color: "red" }}>{error}</div>}

      {token && (
        <div style={{ marginTop: 12, padding: 8, background: "#f6f6f6" }}>
          <strong>Dev token (use on Reset page):</strong>
          <pre style={{ whiteSpace: "nowrap", overflowX: "auto" }}>{token}</pre>
        </div>
      )}
    </div>
  );
}
