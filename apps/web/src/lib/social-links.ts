import type { SocialBrand } from "@/components/landing/social-brand-icon";

export type SocialLinkField =
  | "socialInstagramUrl"
  | "socialFacebookUrl"
  | "socialLinkedinUrl"
  | "socialYoutubeUrl"
  | "socialTiktokUrl"
  | "socialGithubUrl";

export type SocialLinksConfig = Partial<Record<SocialLinkField, string | null>>;

export type PublicSocialLink = {
  brand: SocialBrand;
  label: string;
  href: string;
};

export const SOCIAL_LINK_DEFS: {
  brand: SocialBrand;
  label: string;
  field: SocialLinkField;
  placeholder: string;
}[] = [
  {
    brand: "instagram",
    label: "Instagram",
    field: "socialInstagramUrl",
    placeholder: "https://www.instagram.com/yourpage",
  },
  {
    brand: "facebook",
    label: "Facebook",
    field: "socialFacebookUrl",
    placeholder: "https://www.facebook.com/yourpage",
  },
  {
    brand: "linkedin",
    label: "LinkedIn",
    field: "socialLinkedinUrl",
    placeholder: "https://www.linkedin.com/company/yourpage",
  },
  {
    brand: "youtube",
    label: "YouTube",
    field: "socialYoutubeUrl",
    placeholder: "https://www.youtube.com/@yourchannel",
  },
  {
    brand: "tiktok",
    label: "TikTok",
    field: "socialTiktokUrl",
    placeholder: "https://www.tiktok.com/@yourpage",
  },
  {
    brand: "github",
    label: "GitHub",
    field: "socialGithubUrl",
    placeholder: "https://github.com/yourorg/yourrepo",
  },
];

export function buildPublicSocialLinks(
  config: SocialLinksConfig,
): PublicSocialLink[] {
  return SOCIAL_LINK_DEFS.flatMap((def) => {
    const href = config[def.field]?.trim();
    if (!href) return [];
    return [{ brand: def.brand, label: def.label, href }];
  });
}

export function emptySocialLinkDraft(): Record<SocialLinkField, string> {
  return {
    socialInstagramUrl: "",
    socialFacebookUrl: "",
    socialLinkedinUrl: "",
    socialYoutubeUrl: "",
    socialTiktokUrl: "",
    socialGithubUrl: "",
  };
}
