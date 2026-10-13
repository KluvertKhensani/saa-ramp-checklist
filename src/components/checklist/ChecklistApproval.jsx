import {
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { canApproveChecklist, getRoleLabel } from "../../utils/roles";

const MAX_APPROVAL_NOTES_LENGTH = 1000;

function formatApprovalTime(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(parsedDate);
}

export default function ChecklistApproval({
  checklistId,
  profile,
  locked = false,
  approvalDetails,
  approving = false,
  onApprove,
}) {
  const [notes, setNotes] = useState("");

  const [approvalRequested, setApprovalRequested] = useState(false);

  const canApprove = canApproveChecklist(profile?.role);

  const approvalBusy = approving || approvalRequested;

  if (!checklistId) {
    return (
      <section className="approval-panel">
        <div className="approval-heading">
          <ShieldCheck size={25} aria-hidden="true" />

          <div>
            <h3>Supervisor approval</h3>

            <p>
              Save the checklist before requesting supervisor or QA approval.
            </p>
          </div>
        </div>

        <p className="approval-role-note">
          Approval becomes available after the checklist has been saved to the
          database.
        </p>
      </section>
    );
  }

  if (locked) {
    return (
      <section className="approval-panel approval-locked">
        <div className="approval-heading">
          <LockKeyhole size={25} aria-hidden="true" />

          <div>
            <h3>Approved and locked</h3>

            <p>
              This operational checklist is read-only and cannot be changed
              through the normal save workflow.
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

            <dd>{formatApprovalTime(approvalDetails?.approvedAt)}</dd>
          </div>

          <div>
            <dt>Approval notes</dt>

            <dd>{approvalDetails?.notes || "No approval notes entered."}</dd>
          </div>
        </dl>
      </section>
    );
  }

  if (!canApprove) {
    return (
      <section className="approval-panel">
        <div className="approval-heading">
          <ShieldCheck size={25} aria-hidden="true" />

          <div>
            <h3>Awaiting approval</h3>

            <p>
              This checklist requires review by an authorised supervisor,
              coordinator, or QA inspector.
            </p>
          </div>
        </div>

        <p className="approval-role-note">
          Current role: <strong>{getRoleLabel(profile?.role)}</strong>
        </p>
      </section>
    );
  }

  async function handleApproval() {
    if (approvalBusy) {
      return;
    }

    const confirmed = window.confirm(
      "Approve and permanently lock this checklist?\n\n" +
        "After approval, Flight Information, checklist activities, comments, and task lifecycle actions will become read-only.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setApprovalRequested(true);

      await onApprove?.(notes.trim());
    } catch (error) {
      console.error("Approval request failed:", error);
    } finally {
      setApprovalRequested(false);
    }
  }

  function handleNotesChange(event) {
    if (approvalBusy) {
      return;
    }

    setNotes(event.target.value.slice(0, MAX_APPROVAL_NOTES_LENGTH));
  }

  return (
    <section className="approval-panel" aria-busy={approvalBusy}>
      <div className="approval-heading">
        <CheckCircle2 size={25} aria-hidden="true" />

        <div>
          <h3>Supervisor approval</h3>

          <p>
            Approval marks the checklist as completed and locks further
            operational editing.
          </p>
        </div>
      </div>

      <div className="approval-warning">
        <LockKeyhole size={17} aria-hidden="true" />

        <span>
          Review Flight Information, checklist activity times, comments, and
          exceptions before approval.
        </span>
      </div>

      <label className="approval-notes">
        <span>Approval notes</span>

        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder="Record the review outcome, exceptions, or approval comments"
          rows={4}
          maxLength={MAX_APPROVAL_NOTES_LENGTH}
          disabled={approvalBusy}
          aria-describedby="approval-notes-help"
        />

        <small id="approval-notes-help" className="approval-notes-help">
          {notes.length}/{MAX_APPROVAL_NOTES_LENGTH} characters
        </small>
      </label>

      <button
        type="button"
        className="ramp-button ramp-button-green"
        onClick={handleApproval}
        disabled={approvalBusy}
        aria-disabled={approvalBusy}
      >
        {approvalBusy ? (
          <LoaderCircle size={17} className="spin" aria-hidden="true" />
        ) : (
          <LockKeyhole size={17} aria-hidden="true" />
        )}

        {approvalBusy ? "Approving..." : "Approve and Lock"}
      </button>
    </section>
  );
}
