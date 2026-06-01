import { redirect } from "next/navigation";

/** Lookup is merged into the customer directory. */
export default function CustomerLookupMergedRedirectPage() {
  redirect("/customers/directory");
}
