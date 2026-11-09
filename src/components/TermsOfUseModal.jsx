import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";

const TERMS_VERSION = "2026-11-09";

function createAcceptanceKey(userId) {
  const safeUserId = userId || "unknown-user";

  return `saa-application-terms:${safeUserId}:${TERMS_VERSION}`;
}

export default function TermsOfUseModal({
  userId,
  userEmail = "",
  onAccepted,
}) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const acceptanceKey = useMemo(
    () => createAcceptanceKey(userId),
    [userId]
  );

  useEffect(() => {
    const previousAcceptance = localStorage.getItem(acceptanceKey);

    if (previousAcceptance) {
      onAccepted?.();
    }
  }, [acceptanceKey, onAccepted]);

  async function acceptTerms() {
    if (!hasAgreed || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      const acceptanceRecord = {
        accepted: true,
        termsVersion: TERMS_VERSION,
        acceptedAt: new Date().toISOString(),
        userId: userId || null,
        userEmail: userEmail || null,
      };

      localStorage.setItem(
        acceptanceKey,
        JSON.stringify(acceptanceRecord)
      );

      onAccepted?.(acceptanceRecord);
    } catch (error) {
      console.error("Unable to save Terms of Use acceptance:", error);

      setSaveError(
        "Your acceptance could not be saved. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div
      className="terms-modal-backdrop"
      role="presentation"
    >
      <section
        className="terms-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
        aria-describedby="terms-modal-description"
      >
        <header className="terms-modal-header">
          <div className="terms-modal-icon" aria-hidden="true">
            <ShieldCheck size={27} />
          </div>

          <div className="terms-modal-heading">
            <span className="terms-modal-eyebrow">
              Authorised access
            </span>

            <h1 id="terms-modal-title">
              South African Airways SOC Ltd
            </h1>

            <p id="terms-modal-description">
              Application Terms of Use
            </p>
          </div>
        </header>

        <div className="terms-modal-notice">
          <FileText size={19} aria-hidden="true" />

          <p>
            Please read these Terms of Use carefully. You must
            acknowledge and accept them before continuing to the
            application.
          </p>
        </div>

        <div
          className="terms-modal-content"
          tabIndex="0"
          aria-label="Application Terms of Use"
        >
          <section className="terms-document">
            <div className="terms-document-title">
              <strong>SOUTH AFRICAN AIRWAYS SOC LTD</strong>
              <strong>APPLICATION TERMS OF USE</strong>
            </div>

            <section>
              <h2>1. Acceptance of Terms</h2>

              <p>
                By accessing, registering for, or using this
                application (&quot;Application&quot;), the user
                (&quot;User&quot;) acknowledges that they have read,
                understood, and agreed to be bound by these Terms of
                Use and all applicable South African laws,
                regulations, policies, and procedures of South
                African Airways SOC Ltd (&quot;SAA&quot;).
              </p>
            </section>

            <section>
              <h2>2. Authorised Use</h2>

              <p>
                The Application is provided exclusively for authorised
                business purposes. Access is restricted to duly
                authorised users and may not be used for any unlawful,
                unauthorised, fraudulent, or personal commercial
                purpose.
              </p>

              <p>
                The User shall use the Application only within the
                scope of their authorised duties and responsibilities.
              </p>
            </section>

            <section>
              <h2>3. Confidentiality</h2>

              <p>
                All information made available through the
                Application, including but not limited to operational,
                commercial, financial, employee, customer, supplier,
                and business information, is confidential and
                proprietary to SAA.
              </p>

              <p>
                The User shall not disclose, copy, reproduce,
                distribute, transmit, publish, or otherwise make
                available any information obtained through the
                Application except where expressly authorised by SAA
                or required by law.
              </p>
            </section>

            <section>
              <h2>4. POPIA Compliance</h2>

              <p>
                SAA processes personal information in accordance with
                the Protection of Personal Information Act, 2013
                (Act No. 4 of 2013) (&quot;POPIA&quot;).
              </p>

              <p>
                By using the Application, the User undertakes to:
              </p>

              <ul>
                <li>
                  Process personal information lawfully and only for
                  authorised business purposes.
                </li>

                <li>
                  Maintain the confidentiality and security of
                  personal information accessed through the
                  Application.
                </li>

                <li>
                  Comply with all applicable privacy, information
                  security, records management, and data protection
                  requirements.
                </li>

                <li>
                  Immediately report any actual or suspected
                  unauthorised access, disclosure, loss, or breach of
                  personal information.
                </li>
              </ul>
            </section>

            <section>
              <h2>
                5. Intellectual Property and Non-Commercialisation
              </h2>

              <p>
                All software, source code, data, reports, dashboards,
                analytics, content, designs, trademarks, business
                processes, documentation, and other intellectual
                property contained within the Application remain the
                exclusive property of SAA.
              </p>

              <p>The User shall not:</p>

              <ul>
                <li>
                  Sell, licence, commercialise, monetise, or otherwise
                  exploit any part of the Application or its contents.
                </li>

                <li>
                  Reverse engineer, decompile, replicate, modify, or
                  create derivative works from the Application.
                </li>

                <li>
                  Extract, redistribute, or use Application data for
                  any purpose unrelated to authorised SAA business
                  activities.
                </li>
              </ul>
            </section>

            <section>
              <h2>6. Monitoring and Audit</h2>

              <p>
                SAA reserves the right to monitor, record, retain,
                review, and audit all Application activity for
                security, compliance, operational, investigative, and
                governance purposes.
              </p>

              <p>
                The User acknowledges and consents to such monitoring
                as a condition of access to the Application.
              </p>
            </section>

            <section>
              <h2>7. Limitation of Liability</h2>

              <p>
                While SAA takes reasonable steps to ensure the
                accuracy, integrity, and availability of information
                contained within the Application, no warranty is
                provided regarding its completeness, accuracy,
                reliability, or uninterrupted availability.
              </p>

              <p>
                To the fullest extent permitted by law, SAA shall not
                be liable for any loss, damage, cost, or liability
                arising from the use of, reliance upon, or inability
                to access the Application.
              </p>
            </section>

            <section>
              <h2>8. Suspension and Termination</h2>

              <p>
                SAA reserves the right to suspend, restrict, or
                terminate access to the Application at any time where
                a User breaches these Terms of Use, applicable laws,
                SAA policies, or security requirements.
              </p>
            </section>

            <section>
              <h2>9. Governing Law</h2>

              <p>
                These Terms of Use shall be governed by and construed
                in accordance with the laws of the Republic of South
                Africa.
              </p>
            </section>

            <section>
              <h2>10. Acknowledgement</h2>

              <p>
                By accessing or using the Application, the User
                acknowledges that they have read, understood, and
                agreed to comply with these Terms of Use.
              </p>
            </section>
          </section>
        </div>

        <footer className="terms-modal-footer">
          <label className="terms-acknowledgement">
            <input
              type="checkbox"
              checked={hasAgreed}
              onChange={(event) => {
                setHasAgreed(event.target.checked);
                setSaveError("");
              }}
            />

            <span>
              I have read, understood, and agree to the South African
              Airways Application Terms of Use, including the Privacy,
              Confidentiality, POPIA Compliance, Monitoring, and
              Non-Commercialisation provisions.
            </span>
          </label>

          {saveError ? (
            <p className="terms-save-error" role="alert">
              {saveError}
            </p>
          ) : null}

          <div className="terms-modal-actions">
            <p>
              Terms version: <strong>{TERMS_VERSION}</strong>
            </p>

            <button
              type="button"
              className="terms-accept-button"
              disabled={!hasAgreed || isSaving}
              onClick={acceptTerms}
            >
              <CheckCircle2 size={18} aria-hidden="true" />

              {isSaving ? "Saving..." : "Accept and continue"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
