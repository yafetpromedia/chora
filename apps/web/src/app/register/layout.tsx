import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Start free trial",
  description:
    "Create your school on Chora in minutes. 14-day free trial for Ethiopian schools — attendance, results, fees, and parent access.",
  alternates: { canonical: "/register" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Start a free Chora trial",
    description:
      "Register your school and invite teachers and families — live in days, not months.",
  },
};

export default function RegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
