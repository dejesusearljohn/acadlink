"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/ProfLink.css";
import "../styles/compiled-classes.css";
import Navigation from "../components/Navigation";
import { AuthProvider, useAuth } from "../context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  console.log('LayoutContent loading state:', loading);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '4px solid #e0e0e0',
          borderTop: '4px solid #0066cc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ color: '#666', fontSize: '16px' }}>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      {children}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>AcadLink - Academic Consultation Portal</title>
        <meta name="description" content="Connect students with faculty through easy appointment scheduling" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}
