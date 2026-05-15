import type { AccountPermission, RelationshipType } from "@/lib/api/modules/accounts";

export const REL_TYPES: RelationshipType[] = [
  "PRIMARY_HOLDER",
  "SECONDARY_HOLDER",
  "AUTHORIZED_USER",
  "BENEFICIARY",
  "GUARDIAN",
];

export const RELATIONSHIP_ROLE_LABEL: Record<RelationshipType, string> = {
  PRIMARY_HOLDER: "Primary holder",
  SECONDARY_HOLDER: "Joint / secondary holder",
  AUTHORIZED_USER: "Authorized user",
  BENEFICIARY: "Beneficiary",
  GUARDIAN: "Guardian",
};

export const RELATIONSHIP_ADD_HINT: Partial<Record<RelationshipType, string>> = {
  PRIMARY_HOLDER: "Lead party on the account (often matches the account record primary).",
  SECONDARY_HOLDER: "Joint owner or secondary holder with holder rights.",
  AUTHORIZED_USER: "Can act on the account per permissions below (not necessarily an owner).",
  BENEFICIARY: "Payout or death benefit allocation (may also use Add beneficiary).",
  GUARDIAN: "Legal oversight / representative for another party.",
};

export const ALL_PERMISSIONS: AccountPermission[] = ["VIEW", "TRANSACT", "MANAGE", "ADMIN"];

const TYPE_SORT: RelationshipType[] = [
  "PRIMARY_HOLDER",
  "SECONDARY_HOLDER",
  "AUTHORIZED_USER",
  "GUARDIAN",
  "BENEFICIARY",
];

export function sortRelationshipRows<T extends { relationshipType: RelationshipType }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const ia = TYPE_SORT.indexOf(a.relationshipType);
    const ib = TYPE_SORT.indexOf(b.relationshipType);
    const sa = ia === -1 ? 99 : ia;
    const sb = ib === -1 ? 99 : ib;
    if (sa !== sb) return sa - sb;
    return a.relationshipType.localeCompare(b.relationshipType);
  });
}
