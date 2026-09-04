const fs = require("fs");
const path = "apps/api/src/platform/platform.controller.ts";
let s = fs.readFileSync(path, "utf8");

const ownerPrefixes = [
  "curriculum-packages",
  "subjects",
  "provisioning-logs",
  "content/",
  "catalog/",
  "academic-structures",
  "library/",
  "message-templates",
  "assessment-templates",
];

function isOwnerRoute(route) {
  return ownerPrefixes.some(
    (p) =>
      route === p.replace(/\/$/, "") ||
      route.startsWith(p) ||
      route.includes("assessment-templates") ||
      route.includes("curriculum") ||
      route.includes("library/") ||
      route.includes("message-templates") ||
      route.includes("academic-structures") ||
      route.startsWith("subjects") ||
      route.includes("provision") ||
      route.startsWith("content/") ||
      route.startsWith("catalog/"),
  );
}

const re =
  /@(Get|Post|Patch|Delete)\('([^']+)'\)\r?\n  @UseGuards\(JwtAuthGuard, PlatformGuard\)/g;

let count = 0;
s = s.replace(re, (full, method, route) => {
  if (!isOwnerRoute(route)) return full;
  count += 1;
  return `@${method}('${route}')\n  @UseGuards(JwtAuthGuard, PlatformGuard, PlatformPermissionsGuard)\n  @RequirePlatformOwner()`;
});

fs.writeFileSync(path, s);
console.log(`patched ${count} owner-only routes`);
