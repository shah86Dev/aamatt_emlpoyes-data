"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Wrong password");
        setBusy(false);
        return;
      }
      const next = params.get("next") || "/";
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <span className="brand-mark">AM</span>
        <h1>A.A Matt</h1>
        <p className="sub">Employee Application &amp; ID System</p>
        <form onSubmit={submit}>
          <input
            type="password"
            placeholder="Site password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
        <p className="err">{err}</p>
      </div>
    </div>
  );
}
