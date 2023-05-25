import { GPGithubPackageVersion } from '../models/github_package_version.model';
type GPMessageType = {
    error: string;
} | {
    warning: string;
} | {
    info: string;
} | {
    debug: string;
};
export declare class GPGithubApiController {
    private token;
    private packageOwner;
    private packageName;
    private isOwnedByOrganization;
    constructor(token: string, targetPackage: {
        repository: string;
    } | {
        package: string;
    }, isOwnedByOrganization?: boolean);
    getAllPackageVersions(): Promise<GPGithubPackageVersion[]>;
    deletePackageVersion(packageId: number): Promise<void>;
    private getAllPackageVersionsOwnedByOrganization;
    private getAllPackageVersionsOwnedByUser;
    private deletePackageVersionOwnedByOrg;
    private deletePackageVersionOwnedByUser;
    log(message: GPMessageType): void;
}
export {};
