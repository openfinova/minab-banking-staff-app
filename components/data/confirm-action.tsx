"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z, type ZodSchema } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmActionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
  reasonMaxLength?: number;
  onConfirm: (reason: string) => Promise<void> | void;
}

export function ConfirmAction({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  reasonLabel = "Reason",
  reasonPlaceholder,
  reasonRequired = false,
  reasonMaxLength = 500,
  onConfirm,
}: ConfirmActionProps) {
  const schema: ZodSchema<{ reason: string }> = React.useMemo(() => {
    let reason = z.string().max(reasonMaxLength, `Max ${reasonMaxLength} characters`);
    if (reasonRequired) reason = reason.min(1, "Reason is required");
    return z.object({ reason: reason.optional().or(z.literal("")) }) as never;
  }, [reasonRequired, reasonMaxLength]);

  const form = useForm<{ reason: string }>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  React.useEffect(() => {
    if (!open) form.reset({ reason: "" });
  }, [open, form]);

  const submit = async (values: { reason: string }) => {
    await onConfirm(values.reason);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          {reasonRequired || reasonLabel ? (
            <div className="space-y-1.5">
              <Label htmlFor="reason">
                {reasonLabel}
                {reasonRequired ? <span className="text-destructive"> *</span> : null}
              </Label>
              <Textarea
                id="reason"
                rows={3}
                placeholder={reasonPlaceholder}
                {...form.register("reason")}
              />
              {form.formState.errors.reason ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.reason.message}
                </p>
              ) : null}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{cancelLabel}</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              className={cn(
                destructive
                  ? buttonVariants({ variant: "destructive" })
                  : buttonVariants({ variant: "default" }),
              )}
              disabled={form.formState.isSubmitting}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
