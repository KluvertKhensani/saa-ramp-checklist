import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Navigate } from "react-router-dom";

import AppLogo from "../components/AppLogo";
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

  if (!authLoading && user && !submitting) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (mode === "register") {
        if (fullName.trim().length < 2) {
          throw new Error("Enter your full name.");
        }

        if (password.length < 8) {
          throw new Error(
            "Your password must contain at least eight characters.",
          );
        }

        if (typeof signUp !== "function") {
          throw new Error("Account registration is not currently available.");
        }

        const { data, error } = await signUp({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        if (data?.session) {
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
          setPassword("");
        }

        return;
      }

      const { data, error } = await signIn({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      if (!data?.profile) {
        throw new Error("No operational profile was found for this account.");
      }

      setMessage({
        type: "success",
        text: "Access verified. Opening OPS Check-List GRU - Turnaround Report...",
      });
    } catch (error) {
      console.error("Authentication failed:", error);

      setMessage({
        type: "error",
        text: error?.message || "Authentication was unsuccessful.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setMessage(null);
    setPassword("");
    setShowPassword(false);
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-card">
          <div className="login-centered-brand">
            <div className="mobile-logo-shell">
              <AppLogo
                className="saa-mobile-login-logo"
                alt="OPS Check-List GRU - Turnaround Report"
              />
            </div>

            <strong>OPS Check-List GRU</strong>

            <span>Turnaround Report</span>
          </div>

          <p className="eyebrow auth-centered-text">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </p>

          <h2 className="auth-centered-text">
            {mode === "login"
              ? "Sign in to continue"
              : "Register for operational access"}
          </h2>

          {mode === "register" ? (
            <p className="auth-helper auth-centered-text">
              Create an account to save and retrieve checklist records.
            </p>
          ) : null}

          <div
            className="auth-tabs"
            role="tablist"
            aria-label="Authentication options"
          >
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
              role="tab"
              aria-selected={mode === "login"}
            >
              Sign in
            </button>

            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => changeMode("register")}
              role="tab"
              aria-selected={mode === "register"}
            >
              Register
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <label className="input-group" htmlFor="register-full-name">
                <span>Full name</span>

                <div className="input-shell">
                  <UserRound size={19} aria-hidden="true" />

                  <input
                    id="register-full-name"
                    name="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    disabled={submitting}
                    required
                  />
                </div>
              </label>
            ) : null}

            <label className="input-group" htmlFor="login-email">
              <span>Email address</span>

              <div className="input-shell">
                <Mail size={19} aria-hidden="true" />

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  autoComplete={mode === "login" ? "username" : "email"}
                  inputMode="email"
                  disabled={submitting}
                  required
                />
              </div>
            </label>

            <label className="input-group" htmlFor="login-password">
              <span>Password</span>

              <div className="input-shell">
                <LockKeyhole size={19} aria-hidden="true" />

                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={8}
                  disabled={submitting}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="login-password"
                  disabled={submitting}
                >
                  {showPassword ? (
                    <EyeOff size={19} aria-hidden="true" />
                  ) : (
                    <Eye size={19} aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            {message ? (
              <div
                className={`form-message ${message.type}`}
                role="alert"
                aria-live="assertive"
              >
                {message.text}
              </div>
            ) : null}

            <button
              className="primary-auth-button"
              type="submit"
              disabled={submitting || authLoading}
            >
              {submitting
                ? mode === "login"
                  ? "Verifying access..."
                  : "Creating account..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
