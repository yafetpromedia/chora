import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join your school",
  description: "Join your school on Chora with an invite or school code.",
  alternates: { canonical: "/join" },
  robots: { index: true, follow: true },
};

export default function JoinLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
