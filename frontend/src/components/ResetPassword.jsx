import React, { useState, useEffect } from "react";
import { postJSON } from "./api";

export default function ResetPassword() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!token)
      return setError("Reset token required (query ?token= or paste token).");
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    try {
      const res = await postJSON("/api/auth/reset-password", {
        token,
        newPassword: password,
      });
      setMessage(
        res.message || "Password reset successful. You can now log in."
      );
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(
        err.response?.message || err.message || "Failed to reset password"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", padding: 16 }}>
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Reset Token (or include ?token= in URL)
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          New Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 8 }}>
          Confirm Password
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "8px 12px" }}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>

      {message && (
        <div style={{ marginTop: 12, color: "green" }}>{message}</div>
      )}
      {error && <div style={{ marginTop: 12, color: "red" }}>{error}</div>}
    </div>
  );
}
