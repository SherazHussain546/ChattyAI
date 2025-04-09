import React from 'react';
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Create a custom protected route component inside App.tsx
function ProtectedRoute({ component: Component, path }: { component: () => JSX.Element; path: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}

// Import Redirect from wouter for redirection
import { Redirect } from "wouter";

// Changed to be inside the AuthProvider to ensure context is available
function AppRoutes() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Firebase storage on app load to avoid storage access errors
  React.useEffect(() => {
    // Import here to avoid circular dependencies
    import('./lib/firebase').then(({ initializeFirebaseStorage }) => {
      initializeFirebaseStorage();
    }).catch(error => {
      console.error('Failed to initialize Firebase Storage:', error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;