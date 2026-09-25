import type { TablerIcon } from "@tabler/icons-react";
import { IconInbox, IconMessage2, IconSettings, IconRocket } from "@tabler/icons-react";

export type MenuItem = {
  id: string;
  label: string;
  href?: string;
  icon?: TablerIcon;
  children?: MenuItem[];
};

export type MenuSection = {
  id: string;
  label?: string;
  items: MenuItem[];
};

export function menuSections(role: "ADMIN" | "AGENT"): MenuSection[] {
  const sections: MenuSection[] = [
    {
      id: "support",
      items: [
        { id: "inbox", label: "Inbox", href: "/inbox", icon: IconInbox },
        { id: "saved-replies", label: "Saved replies", href: "/saved-replies", icon: IconMessage2 },
      ],
    },
  ];
  if (role === "ADMIN") {
    sections.push({
      id: "settings",
      label: "Settings",
      items: [
        { id: "products", label: "Products", href: "/settings/products", icon: IconSettings },
        { id: "team", label: "Team", href: "/settings/team", icon: IconSettings },
        { id: "onboarding", label: "Get started", href: "/onboarding", icon: IconRocket },
      ],
    });
  }
  return sections;
}

export const searchablePages = [
  { label: "Inbox", href: "/inbox" },
  { label: "Saved replies", href: "/saved-replies" },
  { label: "Products", href: "/settings/products" },
  { label: "Team", href: "/settings/team" },
];
