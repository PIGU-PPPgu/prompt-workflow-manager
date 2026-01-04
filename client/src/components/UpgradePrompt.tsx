import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  feature: string;
  currentUsage?: number;
  limit?: number;
  className?: string;
}

export function UpgradePrompt({ feature, currentUsage, limit, className }: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  return (
    <Alert className={`border-primary/50 bg-primary/5 ${className}`}>
      <Crown className="h-4 w-4 text-primary" />
      <AlertTitle className="flex items-center gap-2">
        <span>升级以解锁更多功能</span>
        <Sparkles className="h-4 w-4 text-primary" />
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          {feature}
          {currentUsage !== undefined && limit !== undefined && (
            <span className="ml-2 text-muted-foreground">
              (已使用 {currentUsage}/{limit})
            </span>
          )}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setLocation('/subscription')}
            className="gap-2"
          >
            <Crown className="h-4 w-4" />
            查看订阅计划
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

/**
 * 显示功能限制的内联提示
 */
export function InlineUpgradePrompt({ message, className }: { message: string; className?: string }) {
  const [, setLocation] = useLocation();

  return (
    <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
      <Crown className="h-4 w-4 text-primary" />
      <span>{message}</span>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 text-primary"
        onClick={() => setLocation('/subscription')}
      >
        升级订阅
      </Button>
    </div>
  );
}
