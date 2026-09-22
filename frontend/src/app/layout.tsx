import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TravelAgent AI — Multi-Agent Travel Planner",
  description:
    "Plan your perfect trip with AI-powered multi-agent travel planning. Get flights, hotels, weather forecasts, and optimized itineraries — all coordinated by intelligent agents.",
  keywords: [
    "travel planner",
    "AI travel",
    "multi-agent",
    "itinerary builder",
    "flight search",
    "hotel booking",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
