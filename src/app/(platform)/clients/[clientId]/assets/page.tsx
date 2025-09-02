import { redirect } from "next/navigation";
import { use } from "react";

/**
 * /clients/[clientId]/assets  →  /clients/[clientId]/assets/holdings
 */
export default function Page(props: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(props.params);
  redirect(`/clients/${clientId}/assets/holdings`);
}