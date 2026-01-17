import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Hub from "./pages/Hub";
import CreateWorld from "./pages/CreateWorld";
import WorldDetail from "./pages/WorldDetail";
import RoomChat from "./pages/RoomChat";
import DMChat from "./pages/DMChat";
import Plots from "./pages/Plots";
import Create from "./pages/Create";
import Feed from "./pages/Feed";
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
            <Route path="/user/:userId" element={<UserProfile />} />
            <Route path="/hub" element={<Hub />} />
            <Route path="/worlds" element={<Hub />} />
            <Route path="/messages" element={<Hub />} />
            <Route path="/create-world" element={<CreateWorld />} />
            <Route path="/worlds/:worldId" element={<WorldDetail />} />
            <Route path="/worlds/:worldId/rooms/:roomId" element={<RoomChat />} />
            <Route path="/dm/:friendshipId" element={<DMChat />} />
            <Route path="/plots" element={<Plots />} />
            <Route path="/create" element={<Create />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
