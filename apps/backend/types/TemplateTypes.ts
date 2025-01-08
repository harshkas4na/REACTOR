// src/types/TemplateTypes.ts

export interface BaseTemplate {
    type: RSCType;
    version: string;
    dependencies: string[];
    content: string;
}

export interface TemplateReplacement {
    placeholder: string;
    value: string;
    optional?: boolean;
}

export interface TemplateConfig {
    baseContract: string;
    imports: string[];
    state: {
        variables: string[];
        constants: string[];
    };
    functions: {
        main: string[];
        helper: string[];
        protocol: string[];
    };
    events: string[];
}