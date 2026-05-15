import { z } from "zod";

const uuidLike = z.string().min(1);

export const loanProductRequestSchema = z
  .object({
    productCode: z.string().min(1).max(50),
    productName: z.string().min(1).max(200),
    productType: z.string().min(1),
    description: z.string().max(1000).optional(),
    minAmount: z.coerce.number().nonnegative(),
    maxAmount: z.coerce.number().nonnegative(),
    minTenorMonths: z.coerce.number().int().min(1),
    maxTenorMonths: z.coerce.number().int().min(1),
    interestRate: z.coerce.number().min(0).max(100),
    interestCalculationMethod: z.string().min(1),
    repaymentFrequency: z.string().min(1),
    amortizationType: z.string().min(1),
    currency: z.string().min(3).max(3),
    collateralRequired: z.boolean().optional(),
    guarantorRequired: z.boolean().optional(),
    gracePeriodDays: z.coerce.number().int().min(0).optional(),
    processingFeePercentage: z.coerce.number().nonnegative().optional(),
    processingFeeFixed: z.coerce.number().nonnegative().optional(),
    lateFeePercentage: z.coerce.number().nonnegative().optional(),
    lateFeeFixed: z.coerce.number().nonnegative().optional(),
    prepaymentPenaltyPercentage: z.coerce.number().nonnegative().optional(),
  })
  .refine((d) => d.minAmount <= d.maxAmount, { message: "minAmount must be ≤ maxAmount" })
  .refine((d) => d.minTenorMonths <= d.maxTenorMonths, {
    message: "min tenor must be ≤ max tenor",
  });

export type LoanProductRequestInput = z.infer<typeof loanProductRequestSchema>;

export const loanApplicationCreateSchema = z.object({
  customerId: uuidLike,
  productId: uuidLike,
  requestedAmount: z.coerce.number().positive(),
  requestedTenorMonths: z.coerce.number().int().min(1),
  currency: z.string().min(3).max(3),
  purpose: z.string().optional(),
  monthlyIncome: z.coerce.number().nonnegative().optional(),
  existingObligations: z.coerce.number().nonnegative().optional(),
  remarks: z.string().optional(),
});

export const loanAccountCreateSchema = z.object({
  applicationId: uuidLike,
});

export const loanPaymentRecordSchema = z.object({
  paymentAmount: z.coerce.number().positive(),
  paymentDate: z.string().min(1),
  paymentMethod: z.string().min(1),
  transactionReference: z.string().optional(),
  remarks: z.string().optional(),
});

export const loanPaymentAllocationFormSchema = z.object({
  paymentAmount: z.coerce.number().positive(),
  principalPaid: z.coerce.number().nonnegative(),
  interestPaid: z.coerce.number().nonnegative(),
  feesPaid: z.coerce.number().nonnegative(),
  penaltiesPaid: z.coerce.number().nonnegative(),
  paymentDate: z.string().min(1),
  paymentType: z.string().min(1),
  paymentMethod: z.string().min(1),
  transactionReference: z.string().optional(),
});

export const loanRestructuringRequestSchema = z.object({
  restructuringType: z.string().min(1),
  newTenorMonths: z.coerce.number().int().min(1).optional(),
  newInterestRate: z.coerce.number().nonnegative().optional(),
  reason: z.string().min(1),
  requestedBy: z.string().optional(),
});

export const earlySettlementQuoteSchema = z.object({
  settlementDate: z.string().min(1),
  calculationMethod: z.enum(["FULL_OUTSTANDING", "DISCOUNTED"]),
  requestedBy: z.string().optional(),
});

export const collateralRegisterSchema = z.object({
  collateralType: z.string().min(1),
  description: z.string().min(1),
  valuationAmount: z.coerce.number().positive(),
  currency: z.string().min(3).max(3),
  valuationDate: z.string().min(1),
  location: z.string().optional(),
  insuranceExpiryDate: z.string().optional(),
  insurancePolicyNumber: z.string().optional(),
});

export const guarantorAddSchema = z.object({
  customerId: uuidLike,
  guarantorType: z.string().min(1),
  guaranteedAmount: z.coerce.number().positive(),
  guaranteePercentage: z.coerce.number().min(0).max(100).optional(),
  relationshipToCustomer: z.string().optional(),
  remarks: z.string().optional(),
});

export const collectionActivityCreateSchema = z.object({
  activityType: z.string().min(1),
  activityDate: z.string().min(1),
  notes: z.string().min(1),
  followUpDate: z.string().optional(),
  assignedTo: z.string().optional(),
});
