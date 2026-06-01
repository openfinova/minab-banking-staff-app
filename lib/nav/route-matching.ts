import { navSections, type NavItem, type NavSection } from "@/lib/nav/navigation";

function getSectionRoot(section: NavSection): string {
  const overview = section.items.find((item) => {
    const parts = item.href.split("/").filter(Boolean);
    return parts.length === 1;
  });
  if (overview) return overview.href;

  const firstSegment = section.items[0]?.href.split("/").filter(Boolean)[0];
  return firstSegment ? `/${firstSegment}` : `/${section.id}`;
}

function getStaticSegments(section: NavSection): Set<string> {
  const root = getSectionRoot(section);
  const segments = new Set<string>();

  for (const item of section.items) {
    if (item.href === root) continue;
    const rest = item.href.slice(root.length + 1);
    const first = rest.split("/")[0];
    if (first) segments.add(first);
  }

  return segments;
}

function isDynamicDetailPath(pathname: string, section: NavSection): boolean {
  const root = getSectionRoot(section);
  if (!pathname.startsWith(`${root}/`)) return false;

  const rest = pathname.slice(root.length + 1);
  if (!rest) return false;

  const firstSegment = rest.split("/")[0];
  return !getStaticSegments(section).has(firstSegment);
}

function getDetailNavItem(section: NavSection): NavItem | undefined {
  const root = getSectionRoot(section);

  return (
    section.items.find((item) => item.href.endsWith("/directory")) ??
    section.items.find((item) => item.label === "Directory") ??
    section.items.find((item) => item.label === "Accounts") ??
    section.items.find((item) => item.href !== root)
  );
}

export function matchNavItem(
  pathname: string,
  item: NavItem,
  section: NavSection,
): boolean {
  if (pathname === item.href) return true;
  if (!pathname.startsWith(`${item.href}/`)) return false;

  return !section.items.some(
    (other) =>
      other.href !== item.href &&
      other.href.startsWith(`${item.href}/`) &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
}

export function resolveActiveNav(pathname: string | null): {
  section: NavSection;
  item: NavItem;
} | null {
  if (!pathname) return null;

  for (const section of navSections) {
    const staticMatches = section.items
      .filter((item) => matchNavItem(pathname, item, section))
      .sort((a, b) => b.href.length - a.href.length);

    if (staticMatches.length > 0) {
      return { section, item: staticMatches[0] };
    }

    if (isDynamicDetailPath(pathname, section)) {
      const detailItem = getDetailNavItem(section);
      if (detailItem) return { section, item: detailItem };
    }
  }

  return null;
}

export function resolveOpenSectionIds(pathname: string | null): string[] {
  const active = resolveActiveNav(pathname);
  return active ? [active.section.id] : navSections[0] ? [navSections[0].id] : [];
}

export function isNavItemActive(
  pathname: string | null,
  item: NavItem,
  section: NavSection,
): boolean {
  if (!pathname) return false;
  const active = resolveActiveNav(pathname);
  return active?.section.id === section.id && active.item.href === item.href;
}
