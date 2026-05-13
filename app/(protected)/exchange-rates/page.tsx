import { redirect } from "next/navigation";

export default function ExchangeRatesIndexPage() {
  redirect("/exchange-rates/currencies");
}
