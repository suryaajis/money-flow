"use client";

import { Modal } from "@/components/shared/Modal";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onClose,
}) => (
  <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="outline" onClick={onClose}>
        {cancelLabel}
      </Button>
      <Button
        variant={destructive ? "destructive" : "default"}
        onClick={() => {
          onConfirm();
          onClose();
        }}
      >
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);
