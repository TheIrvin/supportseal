import type { TablerIcon } from "@tabler/icons-react";
import { IconInbox, IconSettings, IconMessage2, IconFileText } from "@tabler/icons-react";

export type MenuItem = {
  id: string;
  label: string;
  href?: string;
  icon?: TablerIcon;
  badge?: string;
  children?: MenuItem[];
};

export type MenuSection = {
  id: string;
  label?: string;
  items: MenuItem[];
};

export const menuSections: MenuSection[] = [
  {
    id: "support",
    label: "Support",
    items: [
      { id: "inbox", label: "Inbox", href: "/inbox", icon: IconInbox },
      { id: "saved-replies", label: "Saved replies", href: "/saved-replies", icon: IconMessage2 },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      { id: "onboarding", label: "Get started", href: "/onboarding", icon: IconFileText },
      { id: "settings", label: "Settings", href: "/settings", icon: IconSettings },
    ],
  },
];

export const searchablePages = menuSections.flatMap((section) =>
  section.items.flatMap((item) => {
    const self = item.href ? [{ label: item.label, href: item.href }] : [];
    const children = (item.children ?? [])
      .filter((child) => child.href)
      .map((child) => ({ label: `${item.label} / ${child.label}`, href: child.href! }));
    return [...self, ...children];
  }),
);
