import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";

import "react-day-picker/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EduCore School LMS", template: "%s | EduCore" },
  description: "A modern school management platform for administrators, teachers, students, and parents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
