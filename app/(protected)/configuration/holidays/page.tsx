"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmAction } from "@/components/data/confirm-action";
import { Can } from "@/components/rbac/can";
import { RouteGuard } from "@/components/rbac/route-guard";
import { Permissions } from "@/lib/rbac/permissions";
import { holidaysApi, type HolidayDTO } from "@/lib/api/modules/config";
import { holidaySchema, holidayTypes, type HolidayInput } from "@/lib/schemas/config";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/utils";

export default function HolidaysPage() {
  return (
    <RouteGuard permissions={[Permissions.HolidayRead]}>
      <HolidaysContent />
    </RouteGuard>
  );
}

function HolidaysContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [country, setCountry] = React.useState("US");
  const [year, setYear] = React.useState<number | undefined>(new Date().getFullYear());
  const [pendingDelete, setPendingDelete] = React.useState<HolidayDTO | null>(null);

  const list = useQuery({
    queryKey: ["holidays", country, year],
    queryFn: () => holidaysApi.list({ countryCode: country, year }),
  });

  const onDelete = async () => {
    if (!pendingDelete) return;
    try {
      await holidaysApi.delete(pendingDelete.countryCode, pendingDelete.date);
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({ title: "Holiday removed" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: describeApiError(error),
      });
    }
    setPendingDelete(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays"
        description="Bank holiday calendar by country and year."
        actions={
          <Can permissions={[Permissions.AdminConfigWrite]}>
            <NewHolidayDialog />
          </Can>
        }
      />
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Country</Label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={2}
              className="w-24"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Year</Label>
            <Input
              type="number"
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : undefined)}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            Holidays for {country} {year ?? ""}
          </CardTitle>
          <CardDescription>Used by transaction processing for value-date logic.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : list.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Bank holiday</TableHead>
                  <TableHead>Observed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.data.map((h) => (
                  <TableRow key={`${h.countryCode}-${h.date}`}>
                    <TableCell className="font-mono text-xs">{formatDate(h.date)}</TableCell>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>
                      <Badge variant="muted">{h.type}</Badge>
                    </TableCell>
                    <TableCell>{h.regionCode ?? "-"}</TableCell>
                    <TableCell>{h.bankHoliday ? "Yes" : "No"}</TableCell>
                    <TableCell>{h.observedHoliday ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right">
                      <Can permissions={[Permissions.AdminConfigWrite]}>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete holiday"
                          onClick={() => setPendingDelete(h)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Can>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="No holidays configured"
              description="Add a holiday to populate the calendar for this country/year."
            />
          )}
        </CardContent>
      </Card>
      <ConfirmAction
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete holiday"
        description={`Removing ${pendingDelete?.name} (${pendingDelete?.date}) from the calendar.`}
        confirmLabel="Delete"
        destructive
        reasonRequired={false}
        reasonLabel="Audit note (optional)"
        onConfirm={onDelete}
      />
    </div>
  );
}

function NewHolidayDialog() {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<HolidayInput>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      date: "",
      countryCode: "",
      regionCode: "",
      name: "",
      description: "",
      type: "NATIONAL",
      bankHoliday: true,
      observedHoliday: false,
    },
  });

  const create = useMutation({
    mutationFn: (input: HolidayInput) =>
      holidaysApi.create({
        date: input.date,
        countryCode: input.countryCode.toUpperCase(),
        regionCode: input.regionCode || undefined,
        name: input.name,
        description: input.description || undefined,
        type: input.type,
        bankHoliday: input.bankHoliday,
        observedHoliday: input.observedHoliday,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({ title: "Holiday added" });
      form.reset();
      setOpen(false);
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Could not add holiday",
        description: describeApiError(error),
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add holiday
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add holiday</DialogTitle>
          <DialogDescription>Define an entry on the bank holiday calendar.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Date" error={form.formState.errors.date?.message}>
              <Input type="date" {...form.register("date")} />
            </Field>
            <Field label="Country code" error={form.formState.errors.countryCode?.message}>
              <Input maxLength={2} {...form.register("countryCode")} />
            </Field>
            <Field label="Region (optional)">
              <Input maxLength={10} {...form.register("regionCode")} />
            </Field>
            <Field label="Type" error={form.formState.errors.type?.message}>
              <Select
                value={form.watch("type")}
                onValueChange={(v) => form.setValue("type", v as HolidayInput["type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {holidayTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Name" error={form.formState.errors.name?.message} className="md:col-span-2">
              <Input maxLength={100} {...form.register("name")} />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <Textarea maxLength={500} rows={2} {...form.register("description")} />
            </Field>
            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>Bank holiday</span>
              <Switch
                checked={form.watch("bankHoliday") ?? false}
                onCheckedChange={(c) => form.setValue("bankHoliday", c)}
              />
            </label>
            <label className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>Observed</span>
              <Switch
                checked={form.watch("observedHoliday") ?? false}
                onCheckedChange={(c) => form.setValue("observedHoliday", c)}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Add holiday
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
