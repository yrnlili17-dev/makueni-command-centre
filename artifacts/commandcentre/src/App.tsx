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
import Governance from "@/pages/governance";
import Analytics from "@/pages/analytics";
import Strategist from "@/pages/strategist";
import WarRoom from "@/pages/war-room";
import ProductionCentre from "@/pages/production-centre";
import PublicCampaign from "@/pages/public-campaign";
import SmartAssist from "@/pages/smart-assist";
import DataCentre from "@/pages/data-centre";
import GisCentre from "@/pages/gis-centre";
import ExecutiveCommand from "@/pages/executive-command";
import OperationsHub from "@/pages/operations-hub";
import CommunicationsHub from "@/pages/communications-hub";
import ReportsHub from "@/pages/reports-hub";
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
        <Route path="/executive-command">{() => <Guarded module="dashboard" component={ExecutiveCommand} />}</Route>
        <Route path="/operations-hub">{() => <Guarded module="field-ops" component={OperationsHub} />}</Route>
        <Route path="/communications-hub">{() => <Guarded module="messaging" component={CommunicationsHub} />}</Route>
        <Route path="/reports-hub">{() => <Guarded module="analytics" component={ReportsHub} />}</Route>
        <Route path="/dashboard">{() => <Guarded module="dashboard" component={Dashboard} />}</Route>
        <Route path="/smart-assist">{() => <Guarded module="social-listening" component={SmartAssist} />}</Route>
        <Route path="/data-centre">{() => <Guarded module="constituents" component={DataCentre} />}</Route>
        <Route path="/gis-centre">{() => <Guarded module="analytics" component={GisCentre} />}</Route>
        <Route path="/war-room">{() => <Guarded module="election-day" component={WarRoom} />}</Route>
        <Route path="/production-centre">{() => <Guarded module="admin" component={ProductionCentre} />}</Route>
        <Route path="/strategist">{() => <Guarded module="analytics" component={Strategist} />}</Route>
        <Route path="/members">{() => <Guarded module="voters" component={Members} />}</Route>
        <Route path="/segments">{() => <Guarded module="segmentation" component={Segments} />}</Route>
        <Route path="/messaging">{() => <Guarded module="messaging" component={Messaging} />}</Route>
        <Route path="/field-ops">{() => <Guarded module="field-ops" component={FieldOps} />}</Route>
        <Route path="/volunteers">{() => <Guarded module="volunteers" component={Volunteers} />}</Route>
        <Route path="/surveys">{() => <Guarded module="intelligence" component={Surveys} />}</Route>
        <Route path="/events">{() => <Guarded module="events" component={Events} />}</Route>
        <Route path="/intelligence">{() => <Guarded module="narrative" component={Intelligence} />}</Route>
        <Route path="/social-listening">{() => <Guarded module="social-listening" component={SocialListening} />}</Route>
        <Route path="/swot">{() => <Guarded module="intelligence" component={Swot} />}</Route>
        <Route path="/campaign-plan">{() => <Guarded module="campaign-plan" component={CampaignPlan} />}</Route>
        <Route path="/kol">{() => <Guarded module="kol" component={KOL} />}</Route>
        <Route path="/fundraising">{() => <Guarded module="finance" component={Fundraising} />}</Route>
        <Route path="/election-day">{() => <Guarded module="election-day" component={ElectionDay} />}</Route>
        <Route path="/turnout">{() => <Guarded module="election-day" component={Turnout} />}</Route>
        <Route path="/speeches">{() => <Guarded module="speeches" component={Speeches} />}</Route>
        <Route path="/voters-db">{() => <Guarded module="constituents" component={VotersDb} />}</Route>
        <Route path="/credentials">{() => <Guarded module="credentials" component={Credentials} />}</Route>
        <Route path="/analytics">{() => <Guarded module="analytics" component={Analytics} />}</Route>
        <Route path="/governance">{() => <Guarded module="approvals" component={Governance} />}</Route>
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
      <Route path="/campaign" component={PublicCampaign} />
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
