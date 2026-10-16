import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";
import Nav from "./components/Nav";
import MapsProvider from "./components/MapsProvider";

export const metadata = {
  title: "LikeMinds",
  description: "Share a thought, find people who feel the same, and meet up when you're ready.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,500..800&display=swap"
        />
      </head>
      <body>
        <MapsProvider>
        <AuthProvider>
          <Nav />
          <main>{children}</main>
          <footer className="footer">
            LikeMinds prototype. Your thoughts stay anonymous unless you choose otherwise. In the US, call or text 988 any time if you're in crisis.
          </footer>
        </AuthProvider>
        </MapsProvider>
      </body>
    </html>
  );
}
