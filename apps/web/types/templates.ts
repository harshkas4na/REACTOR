export interface TemplateCard {
    title: string;
    description: string;
    features: {
      title: string;
      items: string[];
    };
    additionalInfo?: string;
    links: {
      primary: {
        href: string;
        text: string;
      };
      secondary: {
        href: string;
        text: string;
      };
    };
    image: {
      src: string;
      alt: string;
    };
  }