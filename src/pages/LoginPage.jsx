import { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import AppLogo from "../components/AppLogo";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

export default function LoginPage() {
  const { user, authLoading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  if (!authLoading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (mode === "register") {
        if (fullName.trim().length < 2) {
          throw new Error("Enter your full name.");
        }

        if (password.length < 8) {
          throw new Error(
            "Your password must contain at least eight characters."
          );
        }

        const { data, error } = await signUp({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          setMessage({
            type: "success",
            text: "Account created successfully. Opening the checklist...",
          });
        } else {
          setMessage({
            type: "success",
            text: "Account created. Check your email to confirm your account before signing in.",
          });
          setMode("login");
        }
      } else {
        const { error } = await signIn({
          email: email.trim(),
          password,
        });

        if (error) throw error;
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Authentication was unsuccessful.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage(null);
    setPassword("");
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-visual-content">
          
          <div className="login-brand-logo">
            <AppLogo
            className="saa-login-logo"
            alt="South African Airways"
          />
        </div>

          <p className="eyebrow">Turnaround Operations</p>
          <h1>Precision control from chocks on to pushback</h1>
          <p className="auth-introduction">
            Record operational milestones, monitor turnaround performance,
            and securely synchronise ramp checklists across desktop and
            mobile devices.
          </p>

          <div className="auth-capabilities">
            <span>Live pushback countdown</span>
            <span>Supabase-secured records</span>
            <span>Mobile-ready operations</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-brand">
            
            <div className="mobile-logo-shell">
              <AppLogo
              className="saa-mobile-login-logo"
              alt="South African Airways"
             />
          </div>


            <div>
              <strong>SAA Ramp Checklist</strong>
              <span>Turnaround Operations</span>
            </div>
          </div>

          <p className="eyebrow">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </p>

          <h2>
            {mode === "login"
              ? "Sign in to continue"
              : "Register for operational access"}
          </h2>

          <p className="auth-helper">
            {mode === "login"
              ? "Use your registered account to access your ramp checklists."
              : "Create an account to securely save and retrieve checklist records."}
          </p>

          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
            >
              Sign in
            </button>

            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => changeMode("register")}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" && (
              <label className="input-group">
                <span>Full name</span>
                <div className="input-shell">
                  <UserRound size={19} aria-hidden="true" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />
                </div>
              </label>
            )}

            <label className="input-group">
              <span>Email address</span>
              <div className="input-shell">
                <Mail size={19} aria-hidden="true" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="input-group">
              <span>Password</span>
              <div className="input-shell">
                <LockKeyhole size={19} aria-hidden="true" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>

            {message && (
              <div
                className={`form-message ${message.type}`}
                role="alert"
              >
                {message.text}
              </div>
            )}

            <button
              className="primary-auth-button"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Please wait..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="security-note">
            Access is protected using Supabase Authentication and
            database Row Level Security.
          </p>
        </div>
      </section>
    </main>
  );
}


