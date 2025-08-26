export type Doc = {
  id: string;
  type: string;      // Personal | Agreement | Statement | ...
  linked: string;
  name: string;      // filename with extension
  exp: string;       // "YYYY-MM-DD" | "—"
  upload: string;    // "YYYY-MM-DD"
  size: string;
  user: string;      // upload user

  // details page fields (optional but shown in UI)
  remarks?: string;
  createdBy?: string;
  createdAt?: string;  // "YYYY-MM-DD HH:mm:ss"
  updatedBy?: string;
  updatedAt?: string;

  // if you put sample files in /public, set a URL so we can preview/download
  // e.g. /public/mocks/files/identity-verification.pdf  ->  url: "/mocks/files/identity-verification.pdf"
  url?: string;
};

export const MOCK_DOCS: Doc[] = [
  {
    id: "kyc-identity-verification",
    type: "Personal",
    linked: "KYC Process",
    name: "Identity Verification.pdf",
    exp: "2024-12-31",
    upload: "2023-01-15",
    size: "1.2 MB",
    user: "Sarah Johnson",
    remarks: "Identity verification document for KYC compliance",
    createdBy: "Sarah Johnson",
    createdAt: "2023-01-15 10:30:00",
    updatedBy: "Michael Chen",
    updatedAt: "2023-02-20 14:45:00",
    url: "/mocks/files/identity-verification.pdf",
  },
  {
    id: "investment-agreement",
    type: "Agreement",
    linked: "Investment Mandate",
    name: "Investment Agreement.docx",
    exp: "—",
    upload: "2023-02-20",
    size: "850 KB",
    user: "Michael Chen",
    remarks: "Signed mandate",
    createdBy: "Michael Chen",
    createdAt: "2023-02-20 09:42:00",
    updatedBy: "Michael Chen",
    updatedAt: "2023-02-20 09:42:00",
    url: "/mocks/files/investment-agreement.docx",
  },
  {
    id: "statement-q1",
    type: "Statement",
    linked: "Monthly Report",
    name: "Portfolio Statement Q1.xlsx",
    exp: "—",
    upload: "2023-01-10",
    size: "2.1 MB",
    user: "David Wilson",
    createdBy: "David Wilson",
    createdAt: "2023-01-10 13:11:00",
    updatedBy: "David Wilson",
    updatedAt: "2023-01-10 13:11:00",
    url: "/mocks/files/portfolio-statement-q1.xlsx",
  },
  {
    id: "tax-lots-csv",
    type: "Export",
    linked: "Tax Lot CSV",
    name: "tax-lots.csv",
    exp: "—",
    upload: "2023-01-12",
    size: "320 KB",
    user: "Ops Bot",
    createdBy: "Ops Bot",
    createdAt: "2023-01-12 08:00:00",
    updatedBy: "Ops Bot",
    updatedAt: "2023-01-12 08:00:00",
    url: "/mocks/files/tax-lots.csv",
  },
  {
    id: "passport-photo",
    type: "Personal",
    linked: "Photo ID",
    name: "passport.jpg",
    exp: "—",
    upload: "2023-01-08",
    size: "480 KB",
    user: "Sarah Johnson",
    createdBy: "Sarah Johnson",
    createdAt: "2023-01-08 16:20:00",
    updatedBy: "Sarah Johnson",
    updatedAt: "2023-01-08 16:20:00",
    url: "/mocks/files/passport.jpg",
  },
  {
    id: "rm-notes",
    type: "Notes",
    linked: "RM Notes",
    name: "welcome.txt",
    exp: "—",
    upload: "2023-01-05",
    size: "4 KB",
    user: "RM",
    createdBy: "RM",
    createdAt: "2023-01-05 10:00:00",
    updatedBy: "RM",
    updatedAt: "2023-01-05 10:00:00",
    url: "/mocks/files/welcome.txt",
  },
];

export function getDocById(idOrName: string) {
  const id = decodeURIComponent(idOrName);
  return (
    MOCK_DOCS.find((d) => d.id === id) || MOCK_DOCS.find((d) => d.name === id)
  );
}
