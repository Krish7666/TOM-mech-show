import { useEffect } from "react";

/**
 * Accessible, styled confirmation dialog — replaces window.confirm / window.alert.
 * Traps focus on Escape key; clicks the backdrop to cancel.
 *
 * Props:
 *   isOpen       — boolean
 *   title        — string
 *   message      — string
 *   confirmLabel — string (default "Confirm")
 *   cancelLabel  — string (default "Cancel")
 *   danger       — boolean — renders confirm button in red when true
 *   onConfirm    — () => void
 *   onCancel     — () => void
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-dialog-backdrop"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-msg"
      >
        <h3 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h3>
        <p id="confirm-dialog-msg" className="confirm-dialog__message">
          {message}
        </p>
        <div className="confirm-dialog__actions">
          <button type="button" className="secondary-btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? "button button--danger" : "primary-btn"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
