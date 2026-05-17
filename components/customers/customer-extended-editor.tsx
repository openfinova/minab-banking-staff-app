"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  type CustomerResponse,
  type CustomerSegmentType,
  type Gender,
  type LegalEntityType,
  type MaritalStatus,
} from "@/lib/api/modules/customers";

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
const LEGAL: LegalEntityType[] = [
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

export function CustomerExtendedEditor({ id, data }: { id: string; data: CustomerResponse }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [nationality, setNationality] = React.useState("");
  const [residenceCountry, setResidenceCountry] = React.useState("");
  const [segment, setSegment] = React.useState<CustomerSegmentType | "">("");
  const [placeOfBirth, setPlaceOfBirth] = React.useState("");
  const [occupation, setOccupation] = React.useState("");
  const [annualIncome, setAnnualIncome] = React.useState("");
  const [gender, setGender] = React.useState<Gender | "">("");
  const [maritalStatus, setMaritalStatus] = React.useState<MaritalStatus | "">("");
  const [incorporationDate, setIncorporationDate] = React.useState("");
  const [incorporationCountry, setIncorporationCountry] = React.useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = React.useState("");
  const [legalEntityType, setLegalEntityType] = React.useState<LegalEntityType | "">("");
  const [pep, setPep] = React.useState(false);
  const [sanction, setSanction] = React.useState(false);

  React.useEffect(() => {
    setNationality(data.nationality ?? "");
    setResidenceCountry(data.residenceCountry ?? "");
    setSegment((data.segment as CustomerSegmentType) ?? "");
    setPlaceOfBirth(data.placeOfBirth ?? "");
    setOccupation(data.occupation ?? "");
    setAnnualIncome(data.annualIncome != null ? String(data.annualIncome) : "");
    setGender((data.gender as Gender) ?? "");
    setMaritalStatus((data.maritalStatus as MaritalStatus) ?? "");
    setIncorporationDate(data.incorporationDate?.slice(0, 10) ?? "");
    setIncorporationCountry(data.incorporationCountry ?? "");
    setBusinessRegistrationNumber(data.businessRegistrationNumber ?? "");
    setLegalEntityType((data.legalEntityType as LegalEntityType) ?? "");
    setPep(Boolean(data.pepFlag));
    setSanction(Boolean(data.sanctionFlag));
  }, [data]);

  const saveAttrs = useMutation({
    mutationFn: () =>
      customersApi.update(id, {
        ...(nationality.trim() ? { nationality: nationality.trim().toUpperCase() } : {}),
        ...(residenceCountry.trim()
          ? { residenceCountry: residenceCountry.trim().toUpperCase() }
          : {}),
        ...(segment ? { segment } : {}),
        ...(placeOfBirth.trim() ? { placeOfBirth: placeOfBirth.trim() } : {}),
        ...(occupation.trim() ? { occupation: occupation.trim() } : {}),
        ...(annualIncome.trim() ? { annualIncome: Number(annualIncome.trim()) } : {}),
        ...(gender ? { gender } : {}),
        ...(maritalStatus ? { maritalStatus } : {}),
        ...(incorporationDate.trim() ? { incorporationDate: incorporationDate.trim() } : {}),
        ...(incorporationCountry.trim()
          ? { incorporationCountry: incorporationCountry.trim().toUpperCase() }
          : {}),
        ...(businessRegistrationNumber.trim()
          ? { businessRegistrationNumber: businessRegistrationNumber.trim() }
          : {}),
        ...(legalEntityType ? { legalEntityType } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
      toast({ title: "Attributes saved" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Save failed", description: describeApiError(e) }),
  });

  const saveFlags = useMutation({
    mutationFn: () =>
      customersApi.updateComplianceFlags(id, {
        pepFlag: pep,
        sanctionFlag: sanction,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", "detail", id] });
      toast({ title: "Compliance flags updated" });
    },
    onError: (e) =>
      toast({ variant: "destructive", title: "Update failed", description: describeApiError(e) }),
  });

  const isBusiness = data.type === "BUSINESS" || data.type === "TRUST";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Extended attributes</CardTitle>
          <CardDescription>
            Maintain segmentation, nationality, demographics, or incorporation details aligned to customer type.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-3xl space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nx-nat">Nationality ISO-2</Label>
              <Input
                id="nx-nat"
                maxLength={2}
                className="font-mono uppercase"
                value={nationality}
                onChange={(e) => setNationality(e.target.value.toUpperCase())}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nx-res">Residence ISO-2</Label>
              <Input
                id="nx-res"
                maxLength={2}
                className="font-mono uppercase"
                value={residenceCountry}
                onChange={(e) => setResidenceCountry(e.target.value.toUpperCase())}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Segment</Label>
              <Select
                value={segment || "__none__"}
                onValueChange={(v) => setSegment(v === "__none__" ? "" : (v as CustomerSegmentType))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isBusiness ? (
              <>
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <Select
                    value={gender || "__none__"}
                    onValueChange={(v) => setGender(v === "__none__" ? "" : (v as Gender))}
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                      <SelectValue />
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
                  <Label htmlFor="nx-pob">Place of birth</Label>
                  <Input id="nx-pob" value={placeOfBirth} onChange={(e) => setPlaceOfBirth(e.target.value)} />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="nx-occ">Occupation</Label>
                  <Input id="nx-occ" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label>Legal entity type</Label>
                  <Select
                    value={legalEntityType || "__none__"}
                    onValueChange={(v) =>
                      setLegalEntityType(v === "__none__" ? "" : (v as LegalEntityType))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {LEGAL.map((l) => (
                        <SelectItem key={l} value={l}>
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nx-brn">Business registration number</Label>
                  <Input
                    id="nx-brn"
                    value={businessRegistrationNumber}
                    onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nx-incd">Incorporation date</Label>
                  <DateInput id="nx-incd" value={incorporationDate} onChange={setIncorporationDate} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nx-incc">Incorporation country ISO-2</Label>
                  <Input
                    id="nx-incc"
                    maxLength={2}
                    className="font-mono uppercase"
                    value={incorporationCountry}
                    onChange={(e) => setIncorporationCountry(e.target.value.toUpperCase())}
                  />
                </div>
              </>
            )}
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="nx-inc">Annual income</Label>
              <Input
                id="nx-inc"
                inputMode="decimal"
                value={annualIncome}
                onChange={(e) => setAnnualIncome(e.target.value)}
              />
            </div>
          </div>
          <Button type="button" disabled={saveAttrs.isPending} onClick={() => saveAttrs.mutate()}>
            {saveAttrs.isPending ? "Saving…" : "Save attributes"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PEP &amp; sanctions</CardTitle>
          <CardDescription>Toggle PEP and sanction screening outcomes for AML monitoring.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pep} onChange={(e) => setPep(e.target.checked)} />
            PEP
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sanction} onChange={(e) => setSanction(e.target.checked)} />
            Sanctions flag
          </label>
          <Button type="button" disabled={saveFlags.isPending} onClick={() => saveFlags.mutate()}>
            {saveFlags.isPending ? "Saving…" : "Save flags"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
