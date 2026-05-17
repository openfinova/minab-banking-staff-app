"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z, type ZodSchema } from "zod";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormVals = {
  reason: string;
  confirmPhrase: string;
};

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
  /** When reason is non-empty and reasonRequired, enforce this minimum length. */
  reasonMinLength?: number;
  reasonRequired?: boolean;
  reasonMaxLength?: number;
  /** Hide the reason textarea (e.g. approve with no comment). */
  omitReasonField?: boolean;
  /** Exact text the operator must type (e.g. CLOSE-3). Case-sensitive match. */
  typedPhraseMustMatch?: string;
  typedPhraseLabel?: string;
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
  reasonMinLength = 0,
  reasonRequired = false,
  reasonMaxLength = 500,
  omitReasonField = false,
  typedPhraseMustMatch,
  typedPhraseLabel,
  onConfirm,
}: ConfirmActionProps) {
  const schema: ZodSchema<FormVals> = React.useMemo(() => {
    const reasonSch: z.ZodTypeAny = reasonRequired
      ? z
          .string()
          .max(reasonMaxLength, `Max ${reasonMaxLength} characters`)
          .min(1, "Reason is required")
          .refine(
            (s: string) => !reasonMinLength || s.trim().length >= reasonMinLength,
            `Reason must be at least ${reasonMinLength} characters`,
          )
      : z.string().max(reasonMaxLength, `Max ${reasonMaxLength} characters`);
    const confirmPhraseSch: z.ZodTypeAny = typedPhraseMustMatch
      ? z
          .string()
          .min(1, "Confirmation text is required")
          .refine((v) => v === typedPhraseMustMatch, {
            message: `Type exactly: ${typedPhraseMustMatch}`,
          })
      : z.string().optional();
    const shape: Record<string, z.ZodTypeAny> = { confirmPhrase: confirmPhraseSch };
    if (!omitReasonField) {
      shape.reason = reasonSch;
    } else {
      shape.reason = z.literal("");
    }
    return z.object(shape as Record<string, z.ZodTypeAny>).strict() as never;
  }, [
    omitReasonField,
    reasonRequired,
    reasonMaxLength,
    reasonMinLength,
    typedPhraseMustMatch,
  ]);

  const form = useForm<FormVals>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "", confirmPhrase: "" },
    mode: "onChange",
  });

  React.useEffect(() => {
    if (!open) form.reset({ reason: "", confirmPhrase: "" });
  }, [open, form]);

  const submit = async (values: FormVals) => {
    await onConfirm(values.reason.trim());
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <div className="space-y-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            {description ? (
              <AlertDialogDescription>{description}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          {typedPhraseMustMatch ? (
            <div className="space-y-1.5">
              <Label htmlFor="confirm-phrase">
                {typedPhraseLabel ?? `Type confirmation phrase`}
              </Label>
              <Input
                id="confirm-phrase"
                placeholder={typedPhraseMustMatch}
                autoComplete="off"
                {...form.register("confirmPhrase")}
              />
              {form.formState.errors.confirmPhrase ? (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.confirmPhrase.message)}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Exact match required (case-sensitive): <code>{typedPhraseMustMatch}</code>
              </p>
            </div>
          ) : null}
          {!omitReasonField ? (
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
                  {String(form.formState.errors.reason.message)}
                </p>
              ) : null}
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{cancelLabel}</AlertDialogCancel>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={form.formState.isSubmitting}
              onClick={(e) => {
                e.preventDefault();
                void form.handleSubmit(submit)();
              }}
            >
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
