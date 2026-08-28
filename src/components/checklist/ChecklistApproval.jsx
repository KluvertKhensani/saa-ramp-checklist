import {
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { useState } from "react";

const APPROVER_ROLES = [
  "administrator",
  "occ_manager",
  "controller",
];

export default function ChecklistApproval({
  checklistId,
  profile,
  locked,
  approvalDetails,
  approving,
  onApprove,
}) {
  const [notes, setNotes] = useState("");

  const role =
    profile?.role || "viewer";

  const canApprove =
    APPROVER_ROLES.includes(role);

  if (!checklistId) {
    return null;
  }

  if (locked) {
    return (
      <section className="approval-panel approval-locked">
        <div className="approval-icon">
          <LockKeyhole size={23} />
        </div>

        <div>
          <h3>Checklist approved and locked</h3>

          <p>
            This operational record is now read-only.
          </p>

          {approvalDetails?.approvedAt ? (
            <small>
              Approved{" "}
              {new Date(
                approvalDetails.approvedAt
              ).toLocaleString("en-ZA")}
            </small>
          ) : null}

          {approvalDetails?.notes ? (
            <blockquote>
              {approvalDetails.notes}
            </blockquote>
          ) : null}
        </div>
      </section>
    );
  }

  if (!canApprove) {
    return (
      <section className="approval-panel">
        <div>
          <h3>Supervisor approval</h3>

          <p>
            This checklist has not yet been approved.
            An authorized controller or manager must
            review and lock the record.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="approval-panel">
      <div className="approval-heading">
        <div>
          <h3>Supervisor approval</h3>

          <p>
            Approval marks the checklist as completed
            and permanently locks normal editing.
          </p>
        </div>

        <CheckCircle2 size={25} />
      </div>

      <label className="approval-notes">
        <span>Approval notes</span>

        <textarea
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          placeholder="Enter supervisor review notes"
          rows="3"
        />
      </label>

      <button
        type="button"
        className="ramp-button ramp-button-green"
        disabled={approving}
        onClick={() => onApprove(notes)}
      >
        {approving ? (
          <LoaderCircle
            size={17}
            className="spin"
          />
        ) : (
          <LockKeyhole size={17} />
        )}

        {approving
          ? "Approving..."
          : "Approve and Lock"}
      </button>
    </section>
  );
}