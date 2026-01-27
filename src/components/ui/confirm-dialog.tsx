"use client";

import * as React from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
}

const variantConfig: Record<
  ConfirmVariant,
  { icon: React.ReactNode; iconBg: string; iconColor: string; buttonClass: string }
> = {
  danger: {
    icon: <Trash2 className="h-6 w-6" />,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    buttonClass: "bg-destructive text-white hover:bg-destructive/90",
  },
  warning: {
    icon: <AlertTriangle className="h-6 w-6" />,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    buttonClass: "bg-amber-600 text-white hover:bg-amber-600/90",
  },
  info: {
    icon: <Info className="h-6 w-6" />,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    buttonClass: "",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "danger",
  icon,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const displayIcon = icon ?? config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* Icon */}
            <div
              className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                config.iconBg,
                config.iconColor
              )}
            >
              {displayIcon}
            </div>

            <div className="text-center sm:text-left">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="mt-2">
                  {description}
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(config.buttonClass)}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for easier usage with imperative confirmation
interface UseConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    options: UseConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    open: false,
    options: null,
    resolve: null,
  });

  const confirm = React.useCallback((options: UseConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        open: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      setState((prev) => {
        prev.resolve?.(false);
        return { ...prev, open: false };
      });
    }
  }, []);

  const handleConfirm = React.useCallback(() => {
    setState((prev) => {
      prev.resolve?.(true);
      return { ...prev, open: false };
    });
  }, []);

  const ConfirmDialogComponent = React.useMemo(() => {
    if (!state.options) return null;
    
    return (
      <ConfirmDialog
        open={state.open}
        onOpenChange={handleOpenChange}
        title={state.options.title}
        description={state.options.description}
        confirmText={state.options.confirmText}
        cancelText={state.options.cancelText}
        onConfirm={handleConfirm}
        variant={state.options.variant}
      />
    );
  }, [state.open, state.options, handleOpenChange, handleConfirm]);

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}

