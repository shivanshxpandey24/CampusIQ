"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { readApiResponse } from "@/lib/api-response";
import { loginSchema } from "@/lib/validation";

const demoUsers = [
  ["Super Admin", "superadmin@campusiq.demo"],
  ["College Admin", "admin@campusiq.demo"],
  ["Faculty", "faculty@campusiq.demo"],
  ["Student", "student@campusiq.demo"],
  ["Parent", "parent@campusiq.demo"],
  ["Hostel Warden", "warden@campusiq.demo"],
  ["Transport Manager", "transport@campusiq.demo"],
  ["Accountant", "accounts@campusiq.demo"],
  ["Helpdesk", "helpdesk@campusiq.demo"],
];

export default function LoginForm() {
  const [error, setError] = useState("");
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "admin@campusiq.demo", password: "CampusIQ2026!" },
  });
  async function submit(values: { email: string; password: string }) {
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      await readApiResponse(response, "Could not sign in");
      window.location.assign("/workspace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    }
  }

  return <main className="login-page">
    <section className="login-card">
      <Link className="brand" href="/" aria-label="CampusIQ home"><span className="brand-mark">C</span> CampusIQ</Link>
      <p className="eyebrow">THE SMART CAMPUS PLATFORM</p>
      <h1>Welcome back</h1>
      <p className="muted">Sign in to your campus workspace.</p>
      <form onSubmit={handleSubmit(submit)} className="login-form">
        <label>Email address<input type="email" autoComplete="username" aria-invalid={Boolean(errors.email)} {...register("email")} />{errors.email && <small className="form-error">{errors.email.message}</small>}</label>
        <label>Password<input type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register("password")} />{errors.password && <small className="form-error">{errors.password.message}</small>}</label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button primary full" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in"}</button>
      </form>
      <div className="demo-box">
        <strong>Demo workspace</strong>
        <p>Choose a role (password is <code>CampusIQ2026!</code>)</p>
        <div className="demo-roles">{demoUsers.map(([role, address]) => <button type="button" key={role} onClick={() => setValue("email", address, { shouldValidate: true })}>{role}</button>)}</div>
        <p className="tiny">Run <code>npm run db:seed</code> to add demo accounts and sample data.</p>
      </div>
    </section>
    <aside className="login-aside"><div className="aside-content"><span className="pill">ONE CAMPUS. CONNECTED.</span><h2>Make every campus day work better.</h2><p>Bring people, processes and services together in one clear view.</p><div className="aside-stat"><b>01</b><span>Connected campus operations</span></div><div className="aside-stat"><b>02</b><span>Role-based tools for every team</span></div><div className="aside-stat"><b>03</b><span>Insights that move you forward</span></div></div></aside>
  </main>;
}
