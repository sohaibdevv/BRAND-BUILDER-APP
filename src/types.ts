export interface AdMediumConfig {
  imagePrompt: string;
  copyText: string;
}

export interface BrandPlan {
  brandName: string;
  slogan: string;
  productStyleGuide: string;
  mediums: {
    billboard: AdMediumConfig;
    newspaper: AdMediumConfig;
    social: AdMediumConfig;
  };
}

export interface MediumExecution {
  loading: boolean;
  error?: string;
  imageUrl?: string;
  customPrompt?: string;
}

export interface BrandSuggestionPreset {
  title: string;
  description: string;
  brandName: string;
  colors: string[];
  styleCue: string;
}
