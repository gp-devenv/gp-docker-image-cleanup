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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const github_api_controller_1 = require("./controllers/github_api.controller");
const github_container_registry_api_controller_1 = require("./controllers/github_container_registry_api.controller");
const input = {
    package: core.getInput('package', { required: false }),
    runAsUser: core.getInput('runAsUser', { required: true }),
    isOwnedByOrganization: core.getBooleanInput('isOwnedByOrganization', { required: true }),
};
async function run() {
    if (process.env.GITHUB_TOKEN) {
        const githubApiController = new github_api_controller_1.GPGithubApiController(process.env.GITHUB_TOKEN, input.package.length > 0 ? { package: input.package } : { repository: github.context.repo.repo }, input.isOwnedByOrganization);
        const githubContainerRegistryAPIController = await github_container_registry_api_controller_1.GPGithubContainerRegistryAPIController.create(process.env.GITHUB_TOKEN, input.package.length > 0 ? { package: input.package } : { repository: github.context.repo.repo }, input.runAsUser);
        try {
            const packageVersions = await githubApiController.getAllPackageVersions();
            const total = packageVersions.length;
            let untaggedPackageVersionsToKeep = [];
            for (const packageVersion of packageVersions.filter((packageVersion) => packageVersion.tags.length > 0)) {
                const manifests = await githubContainerRegistryAPIController.getManifestsForTag(packageVersion.tags[0]);
                for (const manifest of manifests) {
                    const untaggedPackageVersionToKeep = packageVersions.find((aPackageVersion) => aPackageVersion.name === manifest.digest);
                    if (untaggedPackageVersionToKeep)
                        untaggedPackageVersionsToKeep = [...untaggedPackageVersionsToKeep.filter((aUntaggedPpackageVersion) => aUntaggedPpackageVersion.name !== untaggedPackageVersionToKeep.name), untaggedPackageVersionToKeep];
                }
            }
            let totalDeleted = 0;
            for (const packageVersion of packageVersions) {
                if (packageVersion.tags.length > 0)
                    githubApiController.log({ info: `Package id ${packageVersion.id} created at ${packageVersion.creationDate} (${packageVersion.name}) with tags: ${packageVersion.tags}` });
                else {
                    if (untaggedPackageVersionsToKeep.findIndex((untaggedPackageVersion) => untaggedPackageVersion.name === packageVersion.name) < 0) {
                        await githubApiController.deletePackageVersion(packageVersion.id);
                        githubApiController.log({ debug: `Package id ${packageVersion.id} created at ${packageVersion.creationDate} (${packageVersion.name}) ---> DELETED !` });
                        totalDeleted++;
                    }
                    else {
                        githubApiController.log({ info: `Package id ${packageVersion.id} created at ${packageVersion.creationDate} (${packageVersion.name})` });
                    }
                }
            }
            githubApiController.log({ info: `\nTotal deleted entries: ${totalDeleted} / ${total}` });
        }
        catch (error) {
            githubApiController.log({ error: `${error}` });
        }
    }
    else {
        console.error('Environment does not provide GITHUB_TOKEN');
    }
}
run().then();
//# sourceMappingURL=main.js.map