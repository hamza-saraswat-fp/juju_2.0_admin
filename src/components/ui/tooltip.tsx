import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

/**
 * Top-level provider. Mount once near the root of the app to avoid
 * staggered open/close timing across multiple tooltips.
 */
function TooltipProvider({
  delay = 200,
  ...props
}: TooltipPrimitive.Provider.Props & { delay?: number }) {
  return <TooltipPrimitive.Provider delay={delay} {...props} />;
}

/**
 * Convenience high-level tooltip: pass any children as the trigger and a
 * `content` node as the body. For full control, use the `Tooltip*` parts
 * exported below.
 */
function Tooltip({
  content,
  children,
  side = "top",
  sideOffset = 6,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: TooltipPrimitive.Positioner.Props["side"];
  sideOffset?: number;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger render={<span />}>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Positioner side={side} sideOffset={sideOffset}>
          <TooltipPrimitive.Popup
            className={cn(
              "z-50 max-w-[260px] rounded-lg border border-line-strong bg-card px-2.5 py-1.5",
              "text-xs leading-snug text-on-surface shadow-[var(--shadow-card-hover)]",
              "data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95",
              "data-[closed]:animate-out data-[closed]:fade-out-0 data-[closed]:zoom-out-95",
              "duration-150",
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipPortal = TooltipPrimitive.Portal;
const TooltipPositioner = TooltipPrimitive.Positioner;
const TooltipPopup = TooltipPrimitive.Popup;

export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
};
