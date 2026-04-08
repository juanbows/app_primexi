import { PrimexiShell } from "@/components/primexi/PrimexiShell";

export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <PrimexiShell>{children}</PrimexiShell>;
}
