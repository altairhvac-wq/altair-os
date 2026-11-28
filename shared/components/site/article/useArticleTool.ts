"use client";

import { useEffect, useRef, useState } from "react";
import { trackEngagement } from "@/shared/lib/analytics/client";
import { useToast } from "@/shared/components/resources/tools/ToolControls";

/**
 * State for the small tools built only for an article (the service call fee
 * check, the invoice checklist, the days-to-invoice check): the fields as the
 * text the visitor typed, and the first-party "tool used" signal.
 *
 * `calculator_used` is sent once per page view, with the tool's id written
 * here and the article's path, and only after the visitor typed or pressed
 * something. No value ever leaves the browser.
 */
export function useArticleTool<V>(id: string, initial: V) {
  const [values, setValues] = useState<V>(initial);
  const toast = useToast();
  const interacted = useRef(false);
  const markInteracted = () => {
    interacted.current = true;
  };
  useEffect(() => {
    if (interacted.current) trackEngagement("calculator_used", id);
  }, [values, id]);

  return { values, setValues, toast, markInteracted, interacted };
}
