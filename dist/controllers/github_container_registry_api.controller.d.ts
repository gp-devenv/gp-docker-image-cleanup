import { GPManifest } from '../models/manifest.model';
export declare class GPGithubContainerRegistryAPIController {
    private token;
    private packageName;
    private packageOwner;
    constructor(token: string, packageOwner: string, packageName: string);
    static create(token: string, targetPackage: {
        repository: string;
    } | {
        package: string;
    }, runAsUser: string): Promise<GPGithubContainerRegistryAPIController>;
    getManifestsForTag(tag: string): Promise<GPManifest[]>;
}
