"use client";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";

export function FormDevtools() {
  if (process.env.NODE_ENV === "production") return null;

  return <TanStackDevtools plugins={[formDevtoolsPlugin()]} />;
}
