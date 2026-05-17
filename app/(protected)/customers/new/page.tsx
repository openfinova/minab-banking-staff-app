"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { RouteGuard } from "@/components/rbac/route-guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { describeApiError } from "@/lib/api/errors";
import {
  customersApi,
  type CreateCustomerBody,
  type CustomerSegmentType,
  type CustomerType,
  type Gender,
  type LegalEntityType,
  type MaritalStatus,
} from "@/lib/api/modules/customers";
import { Permissions } from "@/lib/rbac/permissions";

const TYPES: CustomerType[] = ["INDIVIDUAL", "BUSINESS", "TRUST"];
const SEGMENTS: CustomerSegmentType[] = [
  "RETAIL",
  "PREMIUM",
  "PRIVATE_BANKING",
  "SME",
  "CORPORATE",
  "VIP",
  "MASS_MARKET",
  "NON_RESIDENT",
];

const GENDERS: Gender[] = ["MALE", "FEMALE", "NON_BINARY", "PREFER_NOT_TO_SAY"];
const MARITAL: MaritalStatus[] = [
  "SINGLE",
  "MARRIED",
  "DIVORCED",
  "WIDOWED",
  "SEPARATED",
  "DOMESTIC_PARTNERSHIP",
  "PREFER_NOT_TO_SAY",
];
const LEGAL_ENTITY: LegalEntityType[] = [
  "LLC",
  "CORPORATION",
  "PARTNERSHIP",
  "LLP",
  "SOLE_PROPRIETORSHIP",
  "NON_PROFIT",
  "COOPERATIVE",
  "TRUST",
  "FOUNDATION",
  "GOVERNMENT_ENTITY",
  "BRANCH_OFFICE",
];

export default function NewCustomerPage() {
  return (
    <RouteGuard permissions={[Permissions.CustomerWrite]}>
      <NewCustomerContent />
    </RouteGuard>
  );
}

function NewCustomerContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [customerNumber, setCustomerNumber] = React.useState("");
  const [type, setType] = React.useState<CustomerType>("INDIVIDUAL");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [businessName, setBusinessName] = React.useState("");
  const [taxId, setTaxId] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [nationality, setNationality] = React.useState("");
  const [residenceCountry, setResidenceCountry] = React.useState("");
  const [segment, setSegment] = React.useState<CustomerSegmentType | "">("");
  const [gender, setGender] = React.useState<Gender | "">("");
  const [maritalStatus, setMaritalStatus] = React.useState<MaritalStatus | "">("");
  const [placeOfBirth, setPlaceOfBirth] = React.useState("");
  const [motherMaidenName, setMotherMaidenName] = React.useState("");
  const [occupation, setOccupation] = React.useState("");
  const [annualIncome, setAnnualIncome] = React.useState("");
  const [incorporationDate, setIncorporationDate] = React.useState("");
  const [incorporationCountry, setIncorporationCountry] = React.useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = React.useState("");
  const [legalEntityType, setLegalEntityType] = React.useState<LegalEntityType | "">("");
  const [blockedReason, setBlockedReason] = React.useState("");
  const [pepFlag, setPepFlag] = React.useState(false);
  const [sanctionFlag, setSanctionFlag] = React.useState(false);

  const create = useMutation({
    mutationFn: () => {
      const base: CreateCustomerBody = {
        customerNumber: customerNumber.trim(),
        type,
        pepFlag,
        sanctionFlag,
        ...(taxId.trim() ? { taxId: taxId.trim() } : {}),
        ...(nationality.trim() ? { nationality: nationality.trim().toUpperCase() } : {}),
        ...(residenceCountry.trim()
          ? { residenceCountry: residenceCountry.trim().toUpperCase() }
          : {}),
        ...(segment ? { segment } : {}),
        ...(blockedReason.trim() ? { blockedReason: blockedReason.trim() } : {}),
        ...(type === "INDIVIDUAL"
          ? {
              ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
              ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
              ...(dateOfBirth.trim() ? { dateOfBirth: dateOfBirth.trim() } : {}),
              ...(gender ? { gender } : {}),
              ...(maritalStatus ? { maritalStatus } : {}),
              ...(placeOfBirth.trim() ? { placeOfBirth: placeOfBirth.trim() } : {}),
              ...(motherMaidenName.trim() ? { motherMaidenName: motherMaidenName.trim() } : {}),
              ...(occupation.trim() ? { occupation: occupation.trim() } : {}),
              ...(annualIncome.trim() ? { annualIncome: Number(annualIncome.trim()) } : {}),
            }
          : {
              ...(businessName.trim() ? { businessName: businessName.trim() } : {}),
              ...(incorporationDate.trim() ? { incorporationDate: incorporationDate.trim() } : {}),
              ...(incorporationCountry.trim()
                ? { incorporationCountry: incorporationCountry.trim().toUpperCase() }
                : {}),
              ...(businessRegistrationNumber.trim()
                ? { businessRegistrationNumber: businessRegistrationNumber.trim() }
                : {}),
              ...(legalEntityType ? { legalEntityType } : {}),
              ...(annualIncome.trim() ? { annualIncome: Number(annualIncome.trim()) } : {}),
            }),
      };
      return customersApi.create(base);
    },
    onSuccess: (c) => {
      toast({ title: "Customer created", description: c.customerNumber });
      router.push(`/customers/${c.id}`);
    },
    onError: (error) =>
      toast({ variant: "destructive", title: "Create failed", description: describeApiError(error) }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerNumber.trim()) {
      toast({ variant: "destructive", title: "Customer number required" });
      return;
    }
    create.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New customer"
        description="Onboard a new party with demographics, incorporation, and initial compliance flags."
      />
      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Core</CardTitle>
            <CardDescription>Customer number, type, segment, tax, nationality.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-xl space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cust-no">Customer number</Label>
              <Input
                id="cust-no"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CustomerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === "INDIVIDUAL" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="fn">First name</Label>
                  <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ln">Last name</Label>
                  <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <DateInput id="dob" value={dateOfBirth} onChange={setDateOfBirth} />
                </div>
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <Select
                    value={gender || "__none__"}
                    onValueChange={(v) => setGender(v === "__none__" ? "" : (v as Gender))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Marital status</Label>
                  <Select
                    value={maritalStatus || "__none__"}
                    onValueChange={(v) =>
                      setMaritalStatus(v === "__none__" ? "" : (v as MaritalStatus))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {MARITAL.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="pob">Place of birth</Label>
                  <Input id="pob" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="mmn">Mother maiden name</Label>
                  <Input
                    id="mmn"
                    value={motherMaidenName}
                    onChange={(e) => setMotherMaidenName(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="occ">Occupation</Label>
                  <Input id="occ" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="aind">Annual income</Label>
                  <Input
                    id="aind"
                    inputMode="decimal"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="bn">Business name</Label>
                  <Input id="bn" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Legal entity type</Label>
                  <Select
                    value={legalEntityType || "__none__"}
                    onValueChange={(v) =>
                      setLegalEntityType(v === "__none__" ? "" : (v as LegalEntityType))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {LEGAL_ENTITY.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brn">Business registration number</Label>
                  <Input
                    id="brn"
                    value={businessRegistrationNumber}
                    onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="incd">Incorporation date</Label>
                  <DateInput id="incd" value={incorporationDate} onChange={setIncorporationDate} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="incc">Incorporation country ISO-2</Label>
                  <Input
                    id="incc"
                    maxLength={2}
                    className="font-mono uppercase"
                    value={incorporationCountry}
                    onChange={(e) => setIncorporationCountry(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ainb">Annual income</Label>
                  <Input
                    id="ainb"
                    inputMode="decimal"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="tax">Tax ID (optional)</Label>
              <Input id="tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} autoComplete="off" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="nat">Nationality (ISO-2)</Label>
                <Input
                  id="nat"
                  maxLength={2}
                  className="font-mono uppercase"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value.toUpperCase())}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="res">Residence country (ISO-2)</Label>
                <Input
                  id="res"
                  maxLength={2}
                  className="font-mono uppercase"
                  value={residenceCountry}
                  onChange={(e) => setResidenceCountry(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Segment</Label>
              <Select
                value={segment || "__none__"}
                onValueChange={(v) => setSegment(v === "__none__" ? "" : (v as CustomerSegmentType))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Server default RETAIL" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">(default)</SelectItem>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk &amp; compliance flags</CardTitle>
            <CardDescription>PEP / sanctions; optional blockedReason stored on entity.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-xl space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pepFlag} onChange={(e) => setPepFlag(e.target.checked)} />
              PEP
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sanctionFlag}
                onChange={(e) => setSanctionFlag(e.target.checked)}
              />
              Sanctions flag
            </label>
            <div className="grid gap-2">
              <Label htmlFor="blk">Blocked reason (optional metadata)</Label>
              <Input id="blk" value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create customer"}
        </Button>
      </form>
    </div>
  );
}
