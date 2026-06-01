import { redirect } from "next/navigation";

export default function LegacyExchangeRatesRedirectPage() {
  redirect("/exchange-rates/currencies");
}
