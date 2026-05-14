"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, AlertCircle, Loader } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ComputerUseStep {
  iteration: number;
  action: "think" | "tool_use" | "complete";
  tool?: string;
  input?: Record<string, any>;
  result?: string;
  reasoning?: string;
}

interface ComputerUseStepsProps {
  steps: ComputerUseStep[];
  isRunning?: boolean;
  compact?: boolean;
}

export function ComputerUseSteps({
  steps,
  isRunning = false,
  compact = false,
}: ComputerUseStepsProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  if (steps.length === 0) return null;

  const completedSteps = steps.filter((s) => s.action !== "complete");
  const finalStep = steps.find((s) => s.action === "complete");

  return (
    <div className="my-3 border-l-2 border-blue-500/30 pl-4 ml-4">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity",
          compact && "cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>
            🖥️ Computer Agent • {completedSteps.length} step
            {completedSteps.length !== 1 ? "s" : ""}
            {isRunning && " • Running..."}
          </span>
        </div>
        {compact && (
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Steps List - Collapsible */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 space-y-2 overflow-hidden"
          >
            {completedSteps.map((step, idx) => (
              <div key={idx} className="text-xs space-y-1">
                <div className="flex items-start gap-2 p-2 rounded bg-blue-50 dark:bg-blue-950/20">
                  {step.action === "tool_use" ? (
                    <>
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-blue-500/15 text-[10px] uppercase tracking-wider">tool</span>
                          {step.tool}
                        </div>
                        {step.input && Object.keys(step.input).length > 0 && (
                          <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-1.5 max-h-32 overflow-y-auto rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2">
                            <pre className="whitespace-pre-wrap break-words font-mono">
{JSON.stringify(step.input, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.result && (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-1.5 max-h-48 overflow-y-auto rounded bg-zinc-950 text-zinc-100 dark:bg-black p-2 border border-zinc-800 font-mono">
                            <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">output</div>
                            <pre className="whitespace-pre-wrap break-words">
{step.result.slice(0, 1500)}
{step.result.length > 1500 && "\n…(truncated)"}
                            </pre>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="h-5 w-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white text-xs font-bold">
                          {idx + 1}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-gray-700 dark:text-gray-300">
                          {step.reasoning || "Thinking..."}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {finalStep && (
              <div className="text-xs p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-green-700 dark:text-green-300">
                    <div className="font-semibold">Complete</div>
                    <div className="mt-1">{finalStep.reasoning}</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ComputerUseSteps;
