import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // <-- Import Navigate
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import RoutePlannerPage from "./pages/RoutePlannerPage";
import ReportIncidentPage from "./pages/ReportIncidentPage";
console.log("Loaded:", ReportIncidentPage);
import SurvivorBlogPage from "./pages/SurvivorBlogPage";
import RateRoutePage from "./pages/RateRoutePage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import Emergency from './pages/emergency';
import PublicRoutePlanner from "./pages/PublicRoutePlanner";
import CrimeDataPage from './pages/CrimeDataPage'; // <-- Keep this import

const queryClient = new QueryClient();

const App = () => { // Changed to regular function body to define variables

  // --- Define isAuthenticated ---
  // This is a basic example. Replace with your actual authentication check
  // (e.g., checking context, Zustand/Redux store, or a more robust token check)
  const isAuthenticated = !!localStorage.getItem('userId'); // Example check

  return ( // <-- Return JSX from function body
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/public-route-planner" element={<PublicRoutePlanner />} />

            {/* Protected Routes */}
            {/* Use the isAuthenticated variable to conditionally render */}
            <Route
              path="/dashboard"
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
            />
            <Route
              path="/emergency"
              element={isAuthenticated ? <Emergency /> : <Navigate to="/login" />}
            />
             <Route
                path="/crime-data" // Protected Crime Data Route
                element={isAuthenticated ? <CrimeDataPage /> : <Navigate to="/login" replace />} // Use Navigate correctly
            />
            <Route
              path="/route-planner"
              element={isAuthenticated ? <RoutePlannerPage /> : <Navigate to="/login" />}
            />
            
               <Route path="/report-incident" element={<ReportIncidentPage />} />
            <Route
              path="/survivor-blog"
              element={isAuthenticated ? <SurvivorBlogPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/rate-route"
              element={isAuthenticated ? <RateRoutePage /> : <Navigate to="/login" />}
            />
            <Route
              path="/profile"
              element={isAuthenticated ? <ProfilePage /> : <Navigate to="/login" />}
            />

            {/* Catch-all Not Found Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;