import { redirect } from "next/navigation";
import { use } from "react";

/**
 * /clients_clone/[clientId]/assets  →  /clients_clone/[clientId]/assets/holdings
 */
export default function Page(props: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(props.params);
  redirect(`/clients_clone/${clientId}/assets/holdings`);
}

// "use client";

// import { useEffect } from "react";
// import { useClientStore } from "@/stores/clients-store";
// import ClientAssets from "../../assets/_client-assets";

// export default function ClientAssetsById({ params }: { params: { clientId: string } }) {
//   const { setCurrClient } = useClientStore();

//   useEffect(() => {
//     if (params.clientId) setCurrClient(params.clientId);
//   }, [params.clientId, setCurrClient]);

//   return <ClientAssets />;
// }
// Profile Custodians Assets Compliance Documents Client Settings

// Holdings Cash Distribution Analysis Profit & Loss Statement Report