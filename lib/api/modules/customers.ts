import { api, request } from "@/lib/api/client";
import { withPaging, type PageResponse } from "@/lib/api/query";

export type CustomerType = "INDIVIDUAL" | "BUSINESS" | "TRUST" | string;
export type CustomerStatus =
  | "PROSPECT"
  | "ACTIVE"
  | "INACTIVE"
  | "BLOCKED"
  | "DECEASED"
  | "CLOSED"
  | "ANONYMIZED"
  | string;
export type KYCStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED"
  | string;
export type CustomerSegmentType =
  | "RETAIL"
  | "PREMIUM"
  | "PRIVATE_BANKING"
  | "SME"
  | "CORPORATE"
  | "VIP"
  | "MASS_MARKET"
  | "NON_RESIDENT"
  | string;
export type ContactType =
  | "EMAIL"
  | "PHONE_MOBILE"
  | "PHONE_HOME"
  | "PHONE_WORK"
  | "FAX"
  | "WEBSITE"
  | string;
export type AddressType = "LEGAL" | "PHYSICAL" | "MAILING" | "REGISTERED_OFFICE" | string;
export type CustomerRelationshipType =
  | "SPOUSE"
  | "BUSINESS_PARTNER"
  | "PARENT"
  | "CHILD"
  | "SIBLING"
  | "AUTHORIZED_USER"
  | "POWER_OF_ATTORNEY"
  | "BENEFICIARY"
  | "GUARDIAN"
  | "CORPORATE_OFFICER"
  | string;
export type KYCDecision = "APPROVED" | "REJECTED" | "REQUIRES_ADDITIONAL_INFO" | string;
export type DocumentType =
  | "PASSPORT"
  | "DRIVERS_LICENSE"
  | "NATIONAL_ID"
  | "SOCIAL_SECURITY_CARD"
  | "TAX_ID_DOCUMENT"
  | "UTILITY_BILL"
  | "INCORPORATION_CERTIFICATE"
  | string;

export type DocumentStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED"
  | "SUPERSEDED"
  | string;

export type Gender = "MALE" | "FEMALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY" | string;
export type MaritalStatus =
  | "SINGLE"
  | "MARRIED"
  | "DIVORCED"
  | "WIDOWED"
  | "SEPARATED"
  | "DOMESTIC_PARTNERSHIP"
  | "PREFER_NOT_TO_SAY"
  | string;
export type LegalEntityType =
  | "LLC"
  | "CORPORATION"
  | "PARTNERSHIP"
  | "LLP"
  | "SOLE_PROPRIETORSHIP"
  | "NON_PROFIT"
  | "COOPERATIVE"
  | "TRUST"
  | "FOUNDATION"
  | "GOVERNMENT_ENTITY"
  | "BRANCH_OFFICE"
  | string;

export interface CustomerResponse {
  id: string;
  customerNumber: string;
  type: CustomerType;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  dateOfBirth?: string;
  status: CustomerStatus;
  kycStatus: KYCStatus;
  nationality?: string;
  residenceCountry?: string;
  segment?: CustomerSegmentType;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  placeOfBirth?: string;
  occupation?: string;
  annualIncome?: number;
  incorporationDate?: string;
  incorporationCountry?: string;
  businessRegistrationNumber?: string;
  legalEntityType?: LegalEntityType;
  pepFlag?: boolean;
  sanctionFlag?: boolean;
  linkedIdentityUserId?: string;
  linkedIdentityUsername?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Request body mirrors server `Customer` — send only fields you need; server validates. */
export interface CreateCustomerBody {
  customerNumber: string;
  type: CustomerType;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  taxId?: string;
  dateOfBirth?: string;
  status?: CustomerStatus;
  kycStatus?: KYCStatus;
  nationality?: string;
  residenceCountry?: string;
  segment?: CustomerSegmentType;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  placeOfBirth?: string;
  motherMaidenName?: string;
  occupation?: string;
  annualIncome?: number;
  incorporationDate?: string;
  incorporationCountry?: string;
  businessRegistrationNumber?: string;
  legalEntityType?: LegalEntityType;
  pepFlag?: boolean;
  sanctionFlag?: boolean;
  blockedReason?: string;
}

/** Partial update via PUT /api/v1/customers/{id} — non-null fields are applied (server CustomerService). */
export type UpdateCustomerBody = Partial<CreateCustomerBody>;

export interface CustomerComplianceUpdate {
  pepFlag?: boolean | null;
  sanctionFlag?: boolean | null;
}

export interface CustomerProfileUpdate {
  firstName?: string;
  lastName?: string;
  businessName?: string;
  dateOfBirth?: string;
  taxId?: string;
  additionalFields?: Record<string, unknown>;
}

export interface ContactResponse {
  id: string;
  customerId: string;
  type: ContactType;
  value: string;
  primary: boolean;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface ContactDetailBody {
  type: ContactType;
  value: string;
  primary?: boolean;
}

export interface AddressResponse {
  id: string;
  customerId: string;
  type: AddressType;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  primary: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface CustomerAddressBody {
  type: AddressType;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  primary?: boolean;
  validFrom?: string;
  validTo?: string;
}

export interface CustomerRelationship {
  id: string;
  relationshipType: CustomerRelationshipType;
  active?: boolean;
  createdBy?: string;
  createdAt?: string;
  notes?: string;
  primaryCustomer?: CustomerResponse | { id?: string };
  relatedCustomer?: CustomerResponse | { id?: string };
}

export interface KYCWorkflow {
  id: string;
  customerId?: string;
  status: KYCStatus;
  initiatedBy?: string;
  initiatedAt?: string;
  completedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  comments?: string;
  rejectionReason?: string;
  reVerificationReason?: string;
  version?: number;
  updatedAt?: string;
  reviewSteps?: KYCReviewStepResponse[];
  /** @deprecated Prefer customerId; kept for older API payloads */
  customer?: { id?: string };
}

export interface KYCReviewStepResponse {
  id: string;
  stepName: string;
  decision: KYCDecision;
  comments?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface KYCDocumentSubmission {
  documentType: DocumentType;
  documentNumber: string;
  issuingCountry?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  filePath?: string;
}

export interface IdentificationDocumentResponse {
  id: string;
  customerId: string;
  type: DocumentType;
  maskedDocumentNumber?: string;
  issuingCountry?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  verified: boolean;
  documentStatus: DocumentStatus;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface IdentificationDocumentBody {
  type: DocumentType;
  documentNumber: string;
  issuingCountry: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  documentStatus?: DocumentStatus;
}

const customerPath = (id: string) => `/api/v1/customers/${encodeURIComponent(id)}`;

export const customersApi = {
  list: (params: { status?: CustomerStatus; q?: string; page?: number; size?: number }) =>
    api.get<PageResponse<CustomerResponse>>("/api/v1/customers", {
      query: withPaging(
        {
          ...(params.status ? { status: params.status } : {}),
          ...(params.q != null && params.q.trim().length > 0 ? { q: params.q.trim() } : {}),
        },
        { page: params.page ?? 0, size: params.size ?? 20, sort: "createdAt,desc" },
      ),
    }),

  get: (id: string) => api.get<CustomerResponse>(customerPath(id)),

  getByTaxId: (taxId: string) =>
    api.get<CustomerResponse>(`/api/v1/customers/tax-id/${encodeURIComponent(taxId)}`),

  create: (body: CreateCustomerBody) =>
    api.post<CustomerResponse>("/api/v1/customers", body),

  update: (id: string, body: UpdateCustomerBody) =>
    api.put<CustomerResponse>(customerPath(id), body),

  updateProfile: (id: string, body: CustomerProfileUpdate) =>
    api.put<CustomerResponse>(`${customerPath(id)}/profile`, body),

  updateStatus: (id: string, status: CustomerStatus) =>
    request<void>(`${customerPath(id)}/status`, { method: "PUT", query: { status } }),

  updateComplianceFlags: (id: string, body: CustomerComplianceUpdate) =>
    api.patch<CustomerResponse>(`${customerPath(id)}/compliance-flags`, body),

  delete: (id: string) => request<void>(customerPath(id), { method: "DELETE" }),

  /** Compliance / servicing — immutable change log (may mask PII). */
  listAuditEvents: (
    customerId: string,
    opts: { page?: number; size?: number } = {},
  ) =>
    api.get<PageResponse<CustomerAuditEvent>>(`${customerPath(customerId)}/audit-events`, {
      query: withPaging(
        {},
        { page: opts.page ?? 0, size: opts.size ?? 25, sort: "changedAt,desc" },
      ),
    }),
};

/** Mirrors server `CustomerAuditEventResponse`. */
export interface CustomerAuditEvent {
  id: string;
  action?: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  changedBy?: string;
  channel?: string;
  changedAt?: string;
  correlationId?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  valueMasked?: boolean;
}

export const customerDocumentsApi = {
  list: (customerId: string) =>
    api.get<IdentificationDocumentResponse[]>(`${customerPath(customerId)}/documents`),

  get: (customerId: string, documentId: string) =>
    api.get<IdentificationDocumentResponse>(
      `${customerPath(customerId)}/documents/${encodeURIComponent(documentId)}`,
    ),

  add: (customerId: string, body: IdentificationDocumentBody) =>
    api.post<IdentificationDocumentResponse>(`${customerPath(customerId)}/documents`, body),

  update: (customerId: string, documentId: string, body: IdentificationDocumentBody) =>
    api.put<IdentificationDocumentResponse>(
      `${customerPath(customerId)}/documents/${encodeURIComponent(documentId)}`,
      body,
    ),

  verify: (customerId: string, documentId: string) =>
    request<void>(
      `${customerPath(customerId)}/documents/${encodeURIComponent(documentId)}/verify`,
      { method: "PUT" },
    ),

  delete: (customerId: string, documentId: string) =>
    request<void>(
      `${customerPath(customerId)}/documents/${encodeURIComponent(documentId)}`,
      { method: "DELETE" },
    ),
};

export const customerContactsApi = {
  list: (customerId: string) =>
    api.get<ContactResponse[]>(`${customerPath(customerId)}/contacts`),

  listByType: (customerId: string, type: ContactType) =>
    api.get<ContactResponse[]>(`${customerPath(customerId)}/contacts/type/${type}`),

  add: (customerId: string, body: ContactDetailBody) =>
    api.post<ContactResponse>(`${customerPath(customerId)}/contacts`, body),

  update: (customerId: string, contactId: string, body: ContactDetailBody) =>
    api.put<ContactResponse>(
      `${customerPath(customerId)}/contacts/${encodeURIComponent(contactId)}`,
      body,
    ),

  setPrimary: (customerId: string, contactId: string) =>
    request<void>(
      `${customerPath(customerId)}/contacts/${encodeURIComponent(contactId)}/set-primary`,
      { method: "PUT" },
    ),

  verify: (customerId: string, contactId: string) =>
    request<void>(
      `${customerPath(customerId)}/contacts/${encodeURIComponent(contactId)}/verify`,
      { method: "PUT" },
    ),

  delete: (customerId: string, contactId: string) =>
    request<void>(
      `${customerPath(customerId)}/contacts/${encodeURIComponent(contactId)}`,
      { method: "DELETE" },
    ),
};

export const customerAddressesApi = {
  list: (customerId: string) =>
    api.get<AddressResponse[]>(`${customerPath(customerId)}/addresses`),

  get: (customerId: string, addressId: string) =>
    api.get<AddressResponse>(
      `${customerPath(customerId)}/addresses/${encodeURIComponent(addressId)}`,
    ),

  add: (customerId: string, body: CustomerAddressBody) =>
    api.post<AddressResponse>(`${customerPath(customerId)}/addresses`, body),

  update: (customerId: string, addressId: string, body: CustomerAddressBody) =>
    api.put<AddressResponse>(
      `${customerPath(customerId)}/addresses/${encodeURIComponent(addressId)}`,
      body,
    ),

  setPrimary: (customerId: string, addressId: string) =>
    request<void>(
      `${customerPath(customerId)}/addresses/${encodeURIComponent(addressId)}/set-primary`,
      { method: "PUT" },
    ),

  delete: (customerId: string, addressId: string) =>
    request<void>(
      `${customerPath(customerId)}/addresses/${encodeURIComponent(addressId)}`,
      { method: "DELETE" },
    ),
};

export const customerRelationshipsApi = {
  list: (customerId: string) =>
    api.get<CustomerRelationship[]>(`${customerPath(customerId)}/relationships`),

  relatedCustomers: (customerId: string, relationshipType?: CustomerRelationshipType) =>
    api.get<CustomerResponse[]>(`${customerPath(customerId)}/relationships/related-customers`, {
      query: { ...(relationshipType ? { relationshipType } : {}) },
    }),

  create: (
    customerId: string,
    query: { relatedCustomerId: string; relationshipType: CustomerRelationshipType },
  ) =>
    api.post<CustomerRelationship>(`${customerPath(customerId)}/relationships`, undefined, {
      query: {
        relatedCustomerId: query.relatedCustomerId,
        relationshipType: query.relationshipType,
      },
    }),

  remove: (customerId: string, relationshipId: string) =>
    request<void>(
      `${customerPath(customerId)}/relationships/${encodeURIComponent(relationshipId)}`,
      { method: "DELETE" },
    ),
};

export const customerKycApi = {
  initiate: (customerId: string) =>
    api.post<KYCWorkflow>(`${customerPath(customerId)}/kyc/initiate`, undefined),

  submitDocuments: (customerId: string, documents: KYCDocumentSubmission[]) =>
    api.post<KYCWorkflow>(`${customerPath(customerId)}/kyc/documents`, documents),

  review: (customerId: string, query: { decision: KYCDecision; comments: string }) =>
    api.post<KYCWorkflow>(`${customerPath(customerId)}/kyc/review`, undefined, {
      query: {
        decision: query.decision,
        comments: query.comments,
      },
    }),

  workflow: (customerId: string) =>
    api.get<KYCWorkflow>(`${customerPath(customerId)}/kyc/workflow`),

  history: (customerId: string) =>
    api.get<KYCWorkflow[]>(`${customerPath(customerId)}/kyc/history`),

  requestReVerification: (customerId: string, reason: string) =>
    api.post<KYCWorkflow>(
      `${customerPath(customerId)}/kyc/re-verification`,
      undefined,
      { query: { reason } },
    ),
};
