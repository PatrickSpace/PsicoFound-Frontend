const palette = {
  ink: "#F4FBF8",
  inkMuted: "#C8D8D4",
  inkSoft: "#8FA6A1",
  night: "#030707",
  nightSoft: "#071112",
  forest: "#0D1C1E",
  forestSoft: "#122C2F",
  pine: "#1F4146",
  pineSoft: "#2D4A4D",
  sage: "#5F807B",
  sageSoft: "#6F8F89",
  mint: "#9EC6BD",
  mist: "#D7E7E2",
  mistDeep: "#BFD8D0",
  cloud: "#EAF4F0",
  success: "#6E927B",
  warning: "#B49A66",
  error: "#C36F7F",
  info: "#4F7773",
  warmIvory: "#F8F4EC",
  warmIvorySoft: "#FBF8F1",
  warmCard: "#FFFDF8",
  warmSage: "#6E9B8D",
  warmSageSoft: "#DDE9E2",
  warmSageBorder: "#C9D8D0",
  warmCharcoal: "#21342F",
  warmTextSecondary: "#6F7E77",
  warmCoral: "#D98C78",
  warmDisabled: "#A6AFA9",
};

export const designTokens = {
  palette,
  colors: {
    background: {
      primaryDark: palette.night,
      secondaryDark: palette.forest,
      primaryLight: palette.warmIvory,
      secondaryLight: palette.warmIvorySoft,
      overlayDark: palette.forestSoft,
      overlayLight: palette.warmSageSoft,
    },
    surfaces: {
      glassDark: palette.pineSoft,
      primaryDark: palette.forestSoft,
      secondaryDark: palette.pine,
      elevatedDark: palette.pineSoft,
      hoverDark: palette.sage,
      activeDark: palette.mint,
      disabledDark: palette.inkSoft,
      glassLight: palette.warmCard,
      primaryLight: palette.warmCard,
      secondaryLight: palette.warmIvorySoft,
      elevatedLight: palette.warmCard,
      hoverLight: palette.warmSageSoft,
      activeLight: palette.warmSage,
      disabledLight: palette.warmDisabled,
    },
    borders: {
      subtleDark: "#D2F4F1",
      defaultDark: "#ACE8EB",
      focusDark: palette.mint,
      subtleLight: palette.warmSageBorder,
      defaultLight: palette.warmSage,
      focusLight: palette.warmSage,
    },
    text: {
      primaryDark: palette.ink,
      secondaryDark: palette.inkMuted,
      disabledDark: palette.inkSoft,
      placeholderDark: palette.inkSoft,
      inverseDark: palette.night,
      primaryLight: palette.warmCharcoal,
      secondaryLight: palette.warmTextSecondary,
      disabledLight: palette.warmDisabled,
      placeholderLight: "#87958F",
      inverseLight: palette.ink,
    },
    brand: {
      primary: palette.pine,
      secondary: palette.sage,
      accent: palette.mint,
    },
    brandLight: {
      primary: palette.warmCharcoal,
      secondary: palette.warmSage,
      accent: palette.warmCoral,
    },
    semantic: {
      success: palette.success,
      warning: palette.warning,
      error: palette.error,
      info: palette.info,
    },
  },
  shadows: {
    xs: "0 1px 2px rgba(0, 18, 20, 0.10)",
    sm: "0 10px 30px rgba(0, 18, 20, 0.18)",
    md: "0 18px 48px rgba(0, 18, 20, 0.24)",
    lg: "0 28px 76px rgba(0, 18, 20, 0.32)",
  },
  radius: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    pill: "999px",
  },
  blur: {
    sm: "8px",
    md: "14px",
    lg: "22px",
  },
  opacity: {
    low: "0.08",
    medium: "0.18",
    high: "0.34",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
  },
};

export const tokenGroups = {
  background: {
    "background-primary": {
      dark: designTokens.colors.background.primaryDark,
      light: designTokens.colors.background.primaryLight,
    },
    "background-secondary": {
      dark: designTokens.colors.background.secondaryDark,
      light: designTokens.colors.background.secondaryLight,
    },
    "background-gradient": {
      dark: designTokens.colors.brand.primary,
      light: designTokens.colors.brand.secondary,
    },
    "background-overlay": {
      dark: designTokens.colors.background.overlayDark,
      light: designTokens.colors.background.overlayLight,
    },
  },
  surfaces: {
    "surface-glass": {
      dark: designTokens.colors.surfaces.glassDark,
      light: designTokens.colors.surfaces.glassLight,
    },
    "surface-primary": {
      dark: designTokens.colors.surfaces.primaryDark,
      light: designTokens.colors.surfaces.primaryLight,
    },
    "surface-secondary": {
      dark: designTokens.colors.surfaces.secondaryDark,
      light: designTokens.colors.surfaces.secondaryLight,
    },
    "surface-elevated": {
      dark: designTokens.colors.surfaces.elevatedDark,
      light: designTokens.colors.surfaces.elevatedLight,
    },
    "surface-hover": {
      dark: designTokens.colors.surfaces.hoverDark,
      light: designTokens.colors.surfaces.hoverLight,
    },
    "surface-active": {
      dark: designTokens.colors.surfaces.activeDark,
      light: designTokens.colors.surfaces.activeLight,
    },
    "surface-disabled": {
      dark: designTokens.colors.surfaces.disabledDark,
      light: designTokens.colors.surfaces.disabledLight,
    },
  },
  borders: {
    "border-subtle": {
      dark: designTokens.colors.borders.subtleDark,
      light: designTokens.colors.borders.subtleLight,
    },
    "border-default": {
      dark: designTokens.colors.borders.defaultDark,
      light: designTokens.colors.borders.defaultLight,
    },
    "border-focus": {
      dark: designTokens.colors.borders.focusDark,
      light: designTokens.colors.borders.focusLight,
    },
    "border-success": designTokens.colors.semantic.success,
    "border-warning": designTokens.colors.semantic.warning,
    "border-error": designTokens.colors.semantic.error,
  },
  typography: {
    "text-primary": {
      dark: designTokens.colors.text.primaryDark,
      light: designTokens.colors.text.primaryLight,
    },
    "text-secondary": {
      dark: designTokens.colors.text.secondaryDark,
      light: designTokens.colors.text.secondaryLight,
    },
    "text-disabled": {
      dark: designTokens.colors.text.disabledDark,
      light: designTokens.colors.text.disabledLight,
    },
    "text-placeholder": {
      dark: designTokens.colors.text.placeholderDark,
      light: designTokens.colors.text.placeholderLight,
    },
    "text-inverse": {
      dark: designTokens.colors.text.inverseDark,
      light: designTokens.colors.text.inverseLight,
    },
  },
  brand: {
    "brand-primary": designTokens.colors.brand.primary,
    "brand-secondary": designTokens.colors.brand.secondary,
    "brand-accent": designTokens.colors.brand.accent,
  },
  semantic: {
    success: designTokens.colors.semantic.success,
    warning: designTokens.colors.semantic.warning,
    error: designTokens.colors.semantic.error,
    info: designTokens.colors.semantic.info,
  },
  shadows: {
    "shadow-xs": designTokens.shadows.xs,
    "shadow-sm": designTokens.shadows.sm,
    "shadow-md": designTokens.shadows.md,
    "shadow-lg": designTokens.shadows.lg,
  },
  radius: {
    "radius-sm": designTokens.radius.sm,
    "radius-md": designTokens.radius.md,
    "radius-lg": designTokens.radius.lg,
    "radius-xl": designTokens.radius.xl,
    "radius-pill": designTokens.radius.pill,
  },
  blur: {
    "blur-sm": designTokens.blur.sm,
    "blur-md": designTokens.blur.md,
    "blur-lg": designTokens.blur.lg,
  },
  opacity: {
    "opacity-low": designTokens.opacity.low,
    "opacity-medium": designTokens.opacity.medium,
    "opacity-high": designTokens.opacity.high,
  },
  spacing: {
    "spacing-xs": designTokens.spacing.xs,
    "spacing-sm": designTokens.spacing.sm,
    "spacing-md": designTokens.spacing.md,
    "spacing-lg": designTokens.spacing.lg,
    "spacing-xl": designTokens.spacing.xl,
  },
};

export const designTokenCssVars = {
  "--pf-shadow-xs": designTokens.shadows.xs,
  "--pf-shadow-sm": designTokens.shadows.sm,
  "--pf-shadow-md": designTokens.shadows.md,
  "--pf-shadow-lg": designTokens.shadows.lg,
  "--pf-radius-sm": designTokens.radius.sm,
  "--pf-radius-md": designTokens.radius.md,
  "--pf-radius-lg": designTokens.radius.lg,
  "--pf-radius-xl": designTokens.radius.xl,
  "--pf-radius-pill": designTokens.radius.pill,
  "--pf-blur-sm": designTokens.blur.sm,
  "--pf-blur-md": designTokens.blur.md,
  "--pf-blur-lg": designTokens.blur.lg,
  "--pf-opacity-low": designTokens.opacity.low,
  "--pf-opacity-medium": designTokens.opacity.medium,
  "--pf-opacity-high": designTokens.opacity.high,
  "--pf-spacing-xs": designTokens.spacing.xs,
  "--pf-spacing-sm": designTokens.spacing.sm,
  "--pf-spacing-md": designTokens.spacing.md,
  "--pf-spacing-lg": designTokens.spacing.lg,
  "--pf-spacing-xl": designTokens.spacing.xl,
  "--pf-social-google": "168, 0, 14",
  "--pf-social-facebook": "0, 50, 199",
  "--pf-social-apple": "0, 0, 1",
};

export const therapistGradients = [
  `linear-gradient(to bottom right, ${palette.pine}, ${palette.sage})`,
  `linear-gradient(to bottom right, ${palette.sage}, ${palette.mint})`,
  `linear-gradient(to bottom right, ${palette.forestSoft}, ${palette.sageSoft})`,
  `linear-gradient(to bottom right, ${palette.pineSoft}, ${palette.mint})`,
  `linear-gradient(to bottom right, ${palette.info}, ${palette.sage})`,
  `linear-gradient(to bottom right, ${palette.success}, ${palette.pine})`,
  `linear-gradient(to bottom right, ${palette.warning}, ${palette.sage})`,
  `linear-gradient(to bottom right, ${palette.error}, ${palette.pineSoft})`,
  `linear-gradient(to bottom right, ${palette.sageSoft}, ${palette.mistDeep})`,
  `linear-gradient(to bottom right, ${palette.forest}, ${palette.success})`,
];

export const defaultTherapistGradient = therapistGradients[0];
export const defaultTherapistGradientStops = {
  start: palette.pine,
  end: palette.sage,
};
