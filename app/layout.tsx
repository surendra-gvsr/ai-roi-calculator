import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI vs Employee ROI Calculator",
  description:
    "Model the day-by-day cost of building AI vs keeping (or hiring) an employee, plus a phased rollout playbook.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
