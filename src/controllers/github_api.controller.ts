//
// gp-docker-image-cleanup
// Copyright (c) 2023, Greg PFISTER. MIT License.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//

import * as github from '@actions/github';

import { GPGithubPackageVersion } from '../models/github_package_version.model';

type GPMessageType = { error: string } | { warning: string } | { info: string } | { debug: string };

export class GPGithubApiController {
    private token: string;
    private packageOwner: string;
    private packageName: string;
    private isOwnedByOrganization: boolean;

    constructor(token: string, targetPackage: { repository: string } | { package: string }, isOwnedByOrganization = false) {
        this.token = token;
        if ('repository' in targetPackage) {
            const splitRepositoty = targetPackage.repository.split('/');
            this.packageOwner = splitRepositoty[0];
            this.packageName = splitRepositoty[1];
        } else {
            const splitPackage = targetPackage.package.split('/');
            this.packageOwner = splitPackage[0];
            this.packageName = splitPackage[1];
        }
        this.isOwnedByOrganization = isOwnedByOrganization;

        this.log({ debug: `Package owner: ${this.packageOwner}${this.isOwnedByOrganization ? ' (organization)' : ''}` });
        this.log({ debug: `Package name: ${this.packageName}` });
    }

    async getAllPackageVersions(): Promise<GPGithubPackageVersion[]> {
        try {
            if (this.isOwnedByOrganization) {
                return await this.getAllPackageVersionsOwnedByOrganization();
            } else {
                return await this.getAllPackageVersionsOwnedByUser();
            }
        } catch (error) {
            throw `Unable to get all package versions for ${this.packageOwner}/${this.packageName}: ${error}`;
        }
    }

    async deletePackageVersion(packageId: number) {
        try {
            if (this.isOwnedByOrganization) {
                await this.deletePackageVersionOwnedByOrg(packageId);
            } else {
                await this.deletePackageVersionOwnedByUser(packageId);
            }
        } catch (error) {
            throw `Unable to delete package version ${this.packageOwner}/${this.packageName}/${packageId}: ${error}`;
        }
    }

    private async getAllPackageVersionsOwnedByOrganization(): Promise<GPGithubPackageVersion[]> {
        const gh = github.getOctokit(this.token);

        const request = await gh.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
            package_type: 'container',
            package_name: this.packageName,
            org: this.packageOwner,
            per_page: 100,
        });
        let packageVersions = request.data;
        let page = 1;
        while (request.data.length === 100) {
            page++;
            const request = await gh.rest.packages.getAllPackageVersionsForPackageOwnedByOrg({
                package_type: 'container',
                package_name: this.packageName,
                org: this.packageOwner,
                page: page,
                per_page: 100,
            });
            packageVersions = [...packageVersions, ...request.data];
        }

        return packageVersions.map<GPGithubPackageVersion>((packageVersion) => {
            return { name: packageVersion.name, id: packageVersion.id, tags: packageVersion.metadata?.container?.tags || [], creationDate: new Date(packageVersion.created_at) };
        });
    }

    private async getAllPackageVersionsOwnedByUser(): Promise<GPGithubPackageVersion[]> {
        const gh = github.getOctokit(this.token);

        const request = await gh.rest.packages.getAllPackageVersionsForPackageOwnedByUser({
            package_type: 'container',
            package_name: this.packageName,
            username: this.packageOwner,
            per_page: 100,
        });
        let packageVersions = request.data;
        let page = 1;
        while (request.data.length === 100) {
            page++;
            const request = await gh.rest.packages.getAllPackageVersionsForPackageOwnedByUser({
                package_type: 'container',
                package_name: this.packageName,
                username: this.packageOwner,
                page: page,
                per_page: 100,
            });
            packageVersions = [...packageVersions, ...request.data];
        }

        return packageVersions.map<GPGithubPackageVersion>((packageVersion) => {
            return { name: packageVersion.name, id: packageVersion.id, tags: packageVersion.metadata?.container?.tags || [], creationDate: new Date(packageVersion.created_at) };
        });
    }

    private async deletePackageVersionOwnedByOrg(packageId: number) {
        const gh = github.getOctokit(this.token);

        await gh.rest.packages.deletePackageVersionForOrg({
            package_type: 'container',
            package_name: this.packageName,
            org: this.packageOwner,
            package_version_id: packageId,
        });
    }

    private async deletePackageVersionOwnedByUser(packageId: number) {
        const gh = github.getOctokit(this.token);

        await gh.rest.packages.deletePackageVersionForUser({
            package_type: 'container',
            package_name: this.packageName,
            username: this.packageOwner,
            package_version_id: packageId,
        });
    }

    log(message: GPMessageType) {
        const gh = github.getOctokit(this.token);
        if ('info' in message) {
            gh.log.info(message.info);
        }
        if ('warning' in message) {
            gh.log.warn(message.warning);
        }
        if ('error' in message) {
            gh.log.error(message.error);
        }
        if ('debug' in message) {
            gh.log.debug(message.debug);
        }
    }
}
