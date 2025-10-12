import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Forum from "./pages/Forum";
import Category from "./pages/Category";
import NewThread from "./pages/NewThread";
import Thread from "./pages/Thread";
import Admin from "./pages/Admin";
import Moderator from "./pages/Moderator";
import Profile from "./pages/Profile";
import Events from "./pages/Events";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/category/:categoryId" element={<Category />} />
          <Route path="/category/:categoryId/new" element={<NewThread />} />
          <Route path="/thread/:threadId" element={<Thread />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/moderator" element={<Moderator />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/events" element={<Events />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
