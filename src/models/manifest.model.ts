export type GPManifest = {
    mediaType: string;
    size: number;
    digest: string;
    platform: {
        architecture: string;
        os: string;
        'os.version'?: string;
        'os.features'?: string[];
        variant?: string;
        features?: string[];
    };
};
