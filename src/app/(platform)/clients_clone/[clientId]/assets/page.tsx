import { redirect } from "next/navigation";
import { use } from "react";

/**
 * /clients_clone/[clientId]/assets  →  /clients_clone/[clientId]/assets/holdings
 */
export default function Page(props: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(props.params);
  redirect(`/clients_clone/${clientId}/assets/holdings`);
}