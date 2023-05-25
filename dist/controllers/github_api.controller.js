"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GPGithubApiController = void 0;
const github = __importStar(require("@actions/github"));
class GPGithubApiController {
    token;
    packageOwner;
    packageName;
    isOwnedByOrganization;
    constructor(token, targetPackage, isOwnedByOrganization = false) {
        this.token = token;
        if ('repository' in targetPackage) {
            const splitRepositoty = targetPackage.repository.split('/');
            this.packageOwner = splitRepositoty[0];
            this.packageName = splitRepositoty[1];
        }
        else {
            const splitPackage = targetPackage.package.split('/');
            this.packageOwner = splitPackage[0];
            this.packageName = splitPackage[1];
        }
        this.isOwnedByOrganization = isOwnedByOrganization;
        this.log({ debug: `Package owner: ${this.packageOwner}${this.isOwnedByOrganization ? ' (organization)' : ''}` });
        this.log({ debug: `Package name: ${this.packageName}` });
    }
    async getAllPackageVersions() {
        try {
            if (this.isOwnedByOrganization) {
                return await this.getAllPackageVersionsOwnedByOrganization();
            }
            else {
                return await this.getAllPackageVersionsOwnedByUser();
            }
        }
        catch (error) {
            throw `Unable to get all package versions for ${this.packageOwner}/${this.packageName}: ${error}`;
        }
    }
    async deletePackageVersion(packageId) {
        try {
            if (this.isOwnedByOrganization) {
                await this.deletePackageVersionOwnedByOrg(packageId);
            }
            else {
                await this.deletePackageVersionOwnedByUser(packageId);
            }
        }
        catch (error) {
            throw `Unable to delete package version ${this.packageOwner}/${this.packageName}/${packageId}: ${error}`;
        }
    }
    async getAllPackageVersionsOwnedByOrganization() {
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
        return packageVersions.map((packageVersion) => {
            return { name: packageVersion.name, id: packageVersion.id, tags: packageVersion.metadata?.container?.tags || [], creationDate: new Date(packageVersion.created_at) };
        });
    }
    async getAllPackageVersionsOwnedByUser() {
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
        return packageVersions.map((packageVersion) => {
            return { name: packageVersion.name, id: packageVersion.id, tags: packageVersion.metadata?.container?.tags || [], creationDate: new Date(packageVersion.created_at) };
        });
    }
    async deletePackageVersionOwnedByOrg(packageId) {
        const gh = github.getOctokit(this.token);
        await gh.rest.packages.deletePackageVersionForOrg({
            package_type: 'container',
            package_name: this.packageName,
            org: this.packageOwner,
            package_version_id: packageId,
        });
    }
    async deletePackageVersionOwnedByUser(packageId) {
        const gh = github.getOctokit(this.token);
        await gh.rest.packages.deletePackageVersionForUser({
            package_type: 'container',
            package_name: this.packageName,
            username: this.packageOwner,
            package_version_id: packageId,
        });
    }
    log(message) {
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
exports.GPGithubApiController = GPGithubApiController;
//# sourceMappingURL=github_api.controller.js.map