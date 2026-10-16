import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { Navigate } from "react-router-dom";

import AppLogo from "../components/AppLogo";
import { useAuth } from "../contexts/useAuth";

const LOGIN_ROLE_OPTIONS = [
  {
    value: "administrator",
    label: "Administrator",
  },
  {
    value: "occ_manager",
    label: "OCC Manager",
  },
  {
    value: "controller",
    label: "Controller",
  },
  {
    value: "turnaround_coordinator",
    label: "Turnaround Coordinator",
  },
  {
    value: "trc_coordinator",
    label: "TRC Coordinator",
  },
  {
    value: "ramp_agent",
    label: "Ramp Agent",
  },
  {
    value: "qa_inspector",
    label: "QA Inspector",
  },
  {
    value: "auditor",
    label: "Auditor",
  },
  {
    value: "viewer",
    label: "Viewer",
  },
  {
    value: "data_analyst",
    label: "Data Analyst",
  },
  {
    value: "duty_officer",
    label: "Duty Officer",
  },
  {
    value: "station_manager",
    label: "Station Manager",
  },
  {
    value: "senior_manager",
    label: "Senior Manager",
  },
];

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase();
}

export default function LoginPage() {
  const { user, authLoading, signIn, signUp, signOut } = useAuth();

  const [mode, setMode] = useState("login");

  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [selectedRole, setSelectedRole] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [message, setMessage] = useState(null);

  if (!authLoading && user && !submitting) {
    return <Navigate to="/" replace />;
  }

  function verifySelectedRole(signedInProfile) {
    if (!signedInProfile) {
      throw new Error("No operational profile was found for this account.");
    }

    const assignedRole = normalizeRole(signedInProfile.role);

    const chosenRole = normalizeRole(selectedRole);

    if (!assignedRole) {
      throw new Error("No operational role is assigned to this account.");
    }

    if (!chosenRole) {
      throw new Error("Select your assigned operational role.");
    }

    if (assignedRole !== chosenRole) {
      throw new Error(
        "The selected role does not match the role assigned to this account.",
      );
    }

    return assignedRole;
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

      if (!selectedRole) {
        throw new Error("Select your assigned operational role.");
      }

      const { data, error } = await signIn({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      const signedInProfile = data?.profile;

      try {
        verifySelectedRole(signedInProfile);
      } catch (roleError) {
        const { error: signOutError } = await signOut();

        if (signOutError) {
          console.error("Sign-out after role mismatch failed:", signOutError);
        }

        throw roleError;
      }

      setMessage({
        type: "success",
        text: "Role verified. Opening OPS Check-List GRU - Turnaround Report...",
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

    if (nextMode === "register") {
      setSelectedRole("");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-visual-content">
          <div className="login-brand-logo">
            <AppLogo
              className="saa-login-logo"
              alt="OPS Check-List GRU - Turnaround Report"
            />
          </div>

          <p className="eyebrow">OPS Check-List GRU - Turnaround Report</p>

          <h1>Precision control from chocks on to pushback</h1>

          <p className="auth-introduction">
            Record operational milestones, monitor turnaround performance, and
            securely synchronise ramp checklists across desktop and mobile
            devices.
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
                alt="OPS Check-List GRU - Turnaround Report"
              />
            </div>

            <div>
              <strong>OPS GRU</strong>

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
              ? "Select your assigned role and use your registered account to continue."
              : "Create an account to securely save and retrieve checklist records."}
          </p>

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

            {mode === "login" ? (
              <label className="input-group" htmlFor="login-role">
                <span>Operational role</span>

                <div className="input-shell">
                  <UserRound size={19} aria-hidden="true" />

                  <select
                    id="login-role"
                    name="role"
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                    disabled={submitting}
                    required
                    autoComplete="off"
                    aria-label="Operational role"
                  >
                    <option value="">Select your assigned role</option>

                    {LOGIN_ROLE_OPTIONS.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
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

          <p className="security-note">
            Access is protected using Supabase Authentication, assigned
            operational roles, and database Row Level Security.
          </p>
        </div>
      </section>
    </main>
  );
}
