import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalAIAssistant from "./components/GlobalAIAssistant";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PromptOptimizer from "./pages/PromptOptimizer";
import Marketplace from "./pages/Marketplace";
import BatchOperations from "./pages/BatchOperations";
import Statistics from "./pages/Statistics";
import Prompts from "@/pages/Prompts";
import PromptDetail from "@/pages/PromptDetail";
import ScenarioBrowser from "@/pages/ScenarioBrowser";
import Workflows from "./pages/Workflows";
import Agents from "./pages/Agents";
import AgentChat from "./pages/AgentChat";
import Categories from "./pages/Categories";
import ApiKeys from "./pages/ApiKeys";
import ImageGeneration from "./pages/ImageGeneration";

import FeishuSettings from "./pages/FeishuSettings";
import TemplateMarketplace from "./pages/TemplateMarketplace";
import Subscription from "./pages/Subscription";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import AdminUsers from "./pages/AdminUsers";
import SubscriptionTest from "./pages/SubscriptionTest";
import SubscriptionHistory from "./pages/SubscriptionHistory";
import AdminCoupons from "./pages/AdminCoupons";
import AdminAudit from "./pages/AdminAudit";
import AdminSettings from "./pages/AdminSettings";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Landing from "./pages/Landing";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
      <Switch>
      <Route path={"/optimizer"} component={PromptOptimizer} />
      <Route path={"/landing"} component={Landing} />
      <Route path={"/image-generation"} component={ImageGeneration} />
      <Route path={"/home"} component={Home} />
      <Route path={"/"} component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/settings" component={Settings} />
       <Route path="/prompts" component={Prompts} />
      <Route path="/prompts/:id" component={PromptDetail} />
      <Route path={"/marketplace"} component={Marketplace} />
      <Route path={"/batch"} component={BatchOperations} />
      <Route path={"/statistics"} component={Statistics} />
      <Route path={"/workflows"} component={Workflows} />
      <Route path={"/agents"} component={Agents} />
      <Route path={"/agents/:id/chat"} component={AgentChat} />
      <Route path="/categories" component={Categories} />
      <Route path="/scenarios" component={ScenarioBrowser} />
      <Route path="/api-keys" component={ApiKeys} />
      <Route path="/feishu-settings" component={FeishuSettings} />

      <Route path="/template-marketplace" component={TemplateMarketplace} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/subscription/success" component={SubscriptionSuccess} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/audit" component={AdminAudit} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/subscription-test" component={SubscriptionTest} />
      <Route path="/admin/coupons" component={AdminCoupons} />
      <Route path="/subscription/history" component={SubscriptionHistory} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <GlobalAIAssistant />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
