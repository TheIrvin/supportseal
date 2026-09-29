import { placeholder } from "@/config/legal";
import {
  AGENT_SESSION_EXPIRES_IN_SECONDS,
  secondsToDays,
  VISITOR_COOKIE_MAX_AGE_SECONDS,
} from "@/config/session-lifetimes";
import { siteConfig } from "@/config/site";

/**
 * Facts shared by every legal document. Anything not recorded in the
 * repository is a placeholder, never plausible-looking filler (issue #14).
 */
export const NAME = siteConfig.name;
export const SITE = siteConfig.url;

export const ENTITY = placeholder("legal name, entity type and registration number of the operator");
export const ADDRESS = placeholder("registered postal address");
export const CONTACT_EMAIL = placeholder("privacy and legal contact email address");
export const EFFECTIVE_DATE = placeholder("effective date, set when the policies go live");

export const SESSION_DAYS = secondsToDays(AGENT_SESSION_EXPIRES_IN_SECONDS);
export const VISITOR_COOKIE_DAYS = secondsToDays(VISITOR_COOKIE_MAX_AGE_SECONDS);
