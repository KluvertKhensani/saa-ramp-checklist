import {
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import {
  canApproveChecklist,
  getRoleLabel,
} from "../../utils/roles";

function formatApprovalTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(value));
}

export default function ChecklistApproval({
  checklistId,
  profile,
  locked,
  approvalDetails,
  approving,
  onApprove,
}) {
  const [notes, setNotes] = useState("");

  if (!checklistId) {
    return (
      <section className="approval-panel">
        <div className="approval-heading">
          <ShieldCheck size={25} />

          <div>
            <h3>Supervisor approval</h3>

            <p>
              Save the checklist before requesting
              supervisor or QA approval.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (locked) {
    return (
      <section className="approval-panel approval-locked">
        <div className="approval-heading">
          <LockKeyhole size={25} />

          <div>
            <h3>Approved and locked</h3>

            <p>
              This operational checklist is read-only
              and cannot be changed through the normal
              save workflow.
            </p>
          </div>
        </div>

        <dl className="approval-details">
          <div>
            <dt>Approved by</dt>

            <dd>
              {approvalDetails?.approvedByName ||
                approvalDetails?.approvedBy ||
                "Authorised user"}
            </dd>
          </div>

          <div>
            <dt>Approved at</dt>

            <dd>
              {approvalDetails?.approvedAt
                ? formatApprovalTime(
                    approvalDetails.approvedAt
                  )
                : "Not available"}
            </dd>
          </div>

          <div>
            <dt>Approval notes</dt>

            <dd>
              {approvalDetails?.notes ||
                "No approval notes entered."}
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  if (!canApproveChecklist(profile?.role)) {
    return (
      <section className="approval-panel">
        <div className="approval-heading">
          <ShieldCheck size={25} />

          <div>
            <h3>Awaiting approval</h3>

            <p>
              This checklist requires review by an
              authorised supervisor, coordinator, or
              QA inspector.
            </p>
          </div>
        </div>

        <p className="approval-role-note">
          Current role:{" "}
          <strong>
            {getRoleLabel(profile?.role)}
          </strong>
        </p>
      </section>
    );
  }

  async function handleApproval() {
    const confirmed = window.confirm(
      "Approve and permanently lock this checklist?"
    );

    if (!confirmed) {
      return;
    }

    await onApprove(notes);
  }

  return (
    <section className="approval-panel">
      <div className="approval-heading">
        <CheckCircle2 size={25} />

        <div>
          <h3>Supervisor approval</h3>

          <p>
            Approval marks the checklist as completed
            and locks further operational editing.
          </p>
        </div>
      </div>

      <label className="approval-notes">
        <span>Approval notes</span>

        <textarea
          value={notes}
          onChange={(event) =>
            setNotes(event.target.value)
          }
          placeholder="Record the review outcome, exceptions, or approval comments"
          rows="4"
          disabled={approving}
        />
      </label>

      <button
        type="button"
        className="ramp-button ramp-button-green"
        onClick={handleApproval}
        disabled={approving}
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