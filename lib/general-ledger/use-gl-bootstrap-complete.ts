"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fiscalPeriodsApi, glOperationalAccountsApi } from "@/lib/api/modules/operations";

export const GL_BOOTSTRAP_COMPLETE_QUERY_ROOT = "gl-bootstrap-complete";

function localIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface GlBootstrapStatus {
  /** True when operational wiring validates and posting is allowed for today’s date (standard bootstrap complete). */
  complete: boolean;
  operationalValid: boolean;
  postingAllowed: boolean;
}

/**
 * Resolved from existing GL read APIs (no dedicated setup-status endpoint).
 * Treats bootstrap as finished when operational validation passes and fiscal rules allow posting for today.
 */
export function useGlBootstrapComplete(enabled: boolean) {
  const postingDate = useMemo(() => localIsoDate(new Date()), []);

  return useQuery({
    queryKey: [GL_BOOTSTRAP_COMPLETE_QUERY_ROOT, postingDate],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<GlBootstrapStatus> => {
      const [opRes, fiscalRes] = await Promise.all([
        glOperationalAccountsApi.validate(),
        fiscalPeriodsApi.postingAllowed(postingDate),
      ]);

      const operationalValid = !!opRes.valid;
      const postingAllowed = !!fiscalRes.allowed;

      return {
        complete: operationalValid && postingAllowed,
        operationalValid,
        postingAllowed,
      };
    },
  });
}
