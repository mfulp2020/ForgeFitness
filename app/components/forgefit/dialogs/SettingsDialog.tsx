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

import { SettingsPanel } from "./SettingsPanel";

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  templates,
  onChange,
  onResetRequest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: any;
  templates: any[];
  onChange: (settings: any) => void;
  onResetRequest: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Update profile, schedule, and training rules in one place.
          </DialogDescription>
        </DialogHeader>
        <SettingsPanel
          settings={settings}
          templates={templates}
          onChange={onChange}
          onResetRequest={onResetRequest}
        />
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
