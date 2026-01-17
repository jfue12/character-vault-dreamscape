import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Worlds from "./pages/Worlds";
import CreateWorld from "./pages/CreateWorld";
import WorldDetail from "./pages/WorldDetail";
import RoomDetail from "./pages/RoomDetail";
import Messages from "./pages/Messages";
import Create from "./pages/Create";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/worlds" element={<Worlds />} />
            <Route path="/worlds/create" element={<CreateWorld />} />
            <Route path="/worlds/:worldId" element={<WorldDetail />} />
            <Route path="/worlds/:worldId/rooms/:roomId" element={<RoomDetail />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/create" element={<Create />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
