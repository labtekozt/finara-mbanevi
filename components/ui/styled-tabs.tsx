import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { cn } from "@/lib/utils";

interface StyledTabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

interface StyledTabsListProps {
  children: React.ReactNode;
  className?: string;
}

interface StyledTabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

interface StyledTabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const StyledTabs = React.forwardRef<HTMLDivElement, StyledTabsProps>(
  (
    { className, defaultValue, value, onValueChange, children, ...props },
    ref,
  ) => (
    <Tabs
      ref={ref}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={cn("space-y-6", className)}
      {...props}
    >
      {children}
    </Tabs>
  ),
);
StyledTabs.displayName = "StyledTabs";

const StyledTabsList = React.forwardRef<HTMLDivElement, StyledTabsListProps>(
  ({ className, children, ...props }, ref) => (
    <TabsList
      ref={ref}
      className={cn(
        "bg-blue-50 p-2 rounded-lg border border-blue-200 shadow-sm h-auto gap-2 w-full flex justify-start overflow-x-auto",
        className,
      )}
      {...props}
    >
      {children}
    </TabsList>
  ),
);
StyledTabsList.displayName = "StyledTabsList";

const StyledTabsTrigger = React.forwardRef<
  HTMLButtonElement,
  StyledTabsTriggerProps
>(({ className, children, value, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    value={value}
    className={cn(
      "data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md",
      "px-6! py-3! rounded-md transition-all duration-200",
      "text-gray-700 hover:text-blue-600 font-medium",
      className,
    )}
    {...props}
  >
    {children}
  </TabsTrigger>
));
StyledTabsTrigger.displayName = "StyledTabsTrigger";

const StyledTabsContent = React.forwardRef<
  HTMLDivElement,
  StyledTabsContentProps
>(({ className, children, value, ...props }, ref) => (
  <TabsContent ref={ref} value={value} className={className} {...props}>
    {children}
  </TabsContent>
));
StyledTabsContent.displayName = "StyledTabsContent";

export { StyledTabs, StyledTabsList, StyledTabsTrigger, StyledTabsContent };
