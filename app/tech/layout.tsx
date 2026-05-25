import { TechnicianMobileShell } from "@/shared/components/technician/TechnicianMobileShell";

export default function TechLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <TechnicianMobileShell>{children}</TechnicianMobileShell>;
}
