import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Members from "@/pages/members";
import Segments from "@/pages/segments";
import Messaging from "@/pages/messaging";
import FieldOps from "@/pages/field-ops";
import Volunteers from "@/pages/volunteers";
import Surveys from "@/pages/surveys";
import Events from "@/pages/events";
import Intelligence from "@/pages/intelligence";
import SocialListening from "@/pages/social-listening";
import Swot from "@/pages/swot";
import CampaignPlan from "@/pages/campaign-plan";
import KOL from "@/pages/kol";
import Fundraising from "@/pages/fundraising";
import ElectionDay from "@/pages/election-day";
import Turnout from "@/pages/turnout";
import Speeches from "@/pages/speeches";
import VotersDb from "@/pages/voters-db";
import Credentials from "@/pages/credentials";
import Admin from "@/pages/admin";
import Analytics from "@/pages/analytics";
import Strategist from "@/pages/strategist";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function FullscreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <ShieldAlert className="w-8 h-8 text-primary" />
      <p className="font-mono text-sm tracking-widest">[ ACCESS_DENIED ]</p>
      <p className="font-mono text-[10px] text-muted-foreground">You do not have permission to view this module.</p>
    </div>
  );
}

function Guarded({ module, component: Component }: { module: string; component: React.ComponentType }) {
  const { can } = useAuth();
  if (!can(module)) return <AccessDenied />;
  return <Component />;
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [loading, user, setLocation]);

  if (loading) return <FullscreenLoader />;
  if (!user) return null;

  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/strategist" component={Strategist} />
        <Route path="/members" component={Members} />
        <Route path="/segments" component={Segments} />
        <Route path="/messaging" component={Messaging} />
        <Route path="/field-ops" component={FieldOps} />
        <Route path="/volunteers" component={Volunteers} />
        <Route path="/surveys" component={Surveys} />
        <Route path="/events" component={Events} />
        <Route path="/intelligence" component={Intelligence} />
        <Route path="/social-listening" component={SocialListening} />
        <Route path="/swot" component={Swot} />
        <Route path="/campaign-plan" component={CampaignPlan} />
        <Route path="/kol" component={KOL} />
        <Route path="/fundraising" component={Fundraising} />
        <Route path="/election-day" component={ElectionDay} />
        <Route path="/turnout" component={Turnout} />
        <Route path="/speeches" component={Speeches} />
        <Route path="/voters-db" component={VotersDb} />
        <Route path="/credentials" component={Credentials} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/admin">{() => <Guarded module="admin" component={Admin} />}</Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/:rest*" component={ProtectedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
