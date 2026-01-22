"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ExportDialog({
  open,
  onOpenChange,
  exportText,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exportText: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl">
        <DialogHeader>
          <DialogTitle>Export data</DialogTitle>
          <DialogDescription>
            If the download button is blocked on your device, copy this JSON and save it somewhere safe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>ForgeFit JSON</Label>
          <Textarea
            value={exportText}
            readOnly
            className="min-h-[260px]"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                if (navigator?.clipboard?.writeText) {
                  await navigator.clipboard.writeText(exportText || "");
                  alert("Copied to clipboard!");
                  return;
                }
              } catch {
                // ignore
              }
              alert("Copy failed on this browser. Select the text and copy manually.");
            }}
          >
            Copy JSON
          </Button>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
