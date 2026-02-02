import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";

// Pages
import Home from "./pages/Home";
import MorningDeck from "./pages/MorningDeck";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Login from "./pages/Login";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, setLocation, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/morning">
        <RequireAuth>
          <MorningDeck />
        </RequireAuth>
      </Route>
      <Route path="/clients">
        <RequireAuth>
          <Clients />
        </RequireAuth>
      </Route>
      <Route path="/clients/:id">
        {(params) => (
          <RequireAuth>
            <ClientDetail id={params.id} />
          </RequireAuth>
        )}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const showLayout = location !== "/login";

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          {showLayout ? (
            <DashboardLayout>
              <Router />
            </DashboardLayout>
          ) : (
            <Router />
          )}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
