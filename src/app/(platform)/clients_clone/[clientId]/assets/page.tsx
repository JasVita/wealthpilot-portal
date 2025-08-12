import { redirect } from "next/navigation";

export default function Page({ params }: { params: { clientId: string } }) {
  // Default /assets goes straight to /assets/holdings
  redirect(`/clients_clone/${params.clientId}/assets/holdings`);
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
