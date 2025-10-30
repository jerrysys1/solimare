import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WalletProvider } from "@/components/WalletProvider";
import { SplineViewer } from "@/components/SplineViewer";
import Index from "./pages/Index";
import Gallery from "./pages/Gallery";
import TripOffer from "./pages/TripOffer";
import MyTrips from "./pages/MyTrips";
import Finder from "./pages/Finder";
import CoownershipManagement from "./pages/CoownershipManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen bg-background relative">
          {/* Spline Background - Persists across all pages */}
          <div className="fixed inset-0 z-0">
            <SplineViewer url="https://prod.spline.design/jkCknvQfmzAwqT7B/scene.splinecode" />
          </div>

          {/* Content Layer */}
          <div className="relative z-10 allow-pointer-pass">
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/trip-finder" replace />} />
                <Route path="/trip-finder" element={<Finder />} />
                <Route path="/mint" element={<Index />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/coownership/:vaultId" element={<CoownershipManagement />} />
                <Route path="/trip-offer" element={<TripOffer />} />
                <Route path="/my-trips" element={<MyTrips />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </div>
        </div>
      </TooltipProvider>
    </WalletProvider>
  </QueryClientProvider>
);

export default App;
