"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { delegationsApi } from "@/lib/api/modules/delegations";
import { auditApi } from "@/lib/api/modules/audit";
import { describeApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

export type UserSuggestionSource = "delegation-staff" | "audit";

export type StaffUserFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  /** Merged onto {@link Label}; use filter-form style to match e.g. security audit {@link Field} labels. */
  labelClassName?: string;
  /**
   * Which API supplies suggestions. {@code delegation-staff} requires {@code admin:doa:read};
   * {@code audit} requires {@code audit:read} (all user types).
   */
  suggestionSource?: UserSuggestionSource;
};

/**
 * User typeahead for delegation ({@code admin:doa:read}, STAFF-only) or security audit filters
 * ({@code audit:read}, all user types). Selecting a row sets {@code value} to the user's UUID.
 */
export function StaffUserField({
  id,
  label,
  value,
  onChange,
  disabled,
  className,
  inputClassName,
  labelClassName,
  suggestionSource = "delegation-staff",
}: StaffUserFieldProps) {
  const [searchText, setSearchText] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  /** After a row is chosen, hide matches until the user edits the search again. */
  const [suggestionsHidden, setSuggestionsHidden] = React.useState(false);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(searchText.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchText]);

  React.useEffect(() => {
    if (value === "") {
      setSearchText("");
      setSuggestionsHidden(false);
    }
  }, [value]);

  const staffSearch = useQuery({
    queryKey: ["identity-user-suggestions", suggestionSource, debounced],
    queryFn: () =>
      suggestionSource === "audit"
        ? auditApi.suggestUsers(debounced)
        : delegationsApi.staffSuggestions(debounced),
    enabled: !disabled && debounced.length >= 1,
  });

  const rows = staffSearch.data ?? [];
  const showPanel = debounced.length >= 1 && !suggestionsHidden && !disabled;

  const selectUser = (u: { id: string; username: string }) => {
    onChange(u.id);
    setSearchText(u.username);
    setSuggestionsHidden(true);
  };

  return (
    <div className={cn("relative space-y-1.5 overflow-visible", className)}>
      <Label htmlFor={id} className={labelClassName}>
        {label}
      </Label>
      <Input
        id={id}
        className={inputClassName}
        value={searchText}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Search username, email, or UUID…"
        onChange={(e) => {
          const v = e.target.value;
          setSearchText(v);
          onChange(v.trim());
          setSuggestionsHidden(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && showPanel) {
            e.preventDefault();
            setSuggestionsHidden(true);
          }
        }}
      />
      {showPanel ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
            "ring-1 ring-border/60",
          )}
          role="listbox"
          aria-label={suggestionSource === "audit" ? "User matches" : "Staff user matches"}
        >
          {staffSearch.isLoading ? (
            <div className="p-3">
              <Skeleton className="h-16 w-full" />
            </div>
          ) : staffSearch.isError ? (
            <p className="text-destructive p-3 text-sm">{describeApiError(staffSearch.error)}</p>
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground p-3 text-sm">
              {suggestionSource === "audit"
                ? "No matching users—keep typing or apply the value as entered."
                : "No matching staff users—keep typing or submit the value as entered."}
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 bg-popover">Username</TableHead>
                    <TableHead className="sticky top-0 bg-popover">Email</TableHead>
                    {suggestionSource === "audit" ? (
                      <TableHead className="sticky top-0 bg-popover">Type</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((u) => (
                    <TableRow
                      key={u.id}
                      role="option"
                      tabIndex={0}
                      className="cursor-pointer hover:bg-muted/70"
                      onClick={() => selectUser(u)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectUser(u);
                        }
                      }}
                    >
                      <TableCell className="font-medium">{u.username}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email ?? "—"}</TableCell>
                      {suggestionSource === "audit" ? (
                        <TableCell className="text-muted-foreground text-xs">{u.userType ?? "—"}</TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
