"use client";

import { createAuthClient } from "better-auth/react";

import { appConfig } from "@/lib/config";

export const authClient = createAuthClient({
  baseURL: appConfig.url,
});
