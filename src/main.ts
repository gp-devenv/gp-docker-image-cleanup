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

import * as core from '@actions/core';
import * as github from '@actions/github';
import { GPGithubApiController } from './controllers/github_api.controller';
import { GPGithubPackageVersion } from './models/github_package_version.model';
import { GPGithubContainerRegistryAPIController } from './controllers/github_container_registry_api.controller';

const input = {
    package: core.getInput('package', { required: false }),
    runAsUser: core.getInput('runAsUser', { required: true }),
    isOwnedByOrganization: core.getBooleanInput('isOwnedByOrganization', { required: true }),
};

async function run() {
    if (process.env.GITHUB_TOKEN) {
        const githubApiController = new GPGithubApiController(process.env.GITHUB_TOKEN, input.package.length > 0 ? { package: input.package } : { repository: github.context.repo.repo }, input.isOwnedByOrganization);
        const githubContainerRegistryAPIController = await GPGithubContainerRegistryAPIController.create(process.env.GITHUB_TOKEN, input.package.length > 0 ? { package: input.package } : { repository: github.context.repo.repo }, input.runAsUser);

        try {
            const packageVersions = await githubApiController.getAllPackageVersions();
            const total = packageVersions.length;

            let untaggedPackageVersionsToKeep: GPGithubPackageVersion[] = [];
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
                if (packageVersion.tags.length > 0) githubApiController.log({ info: `Package id ${packageVersion.id} created at ${packageVersion.creationDate} (${packageVersion.name}) with tags: ${packageVersion.tags}` });
                else {
                    if (untaggedPackageVersionsToKeep.findIndex((untaggedPackageVersion) => untaggedPackageVersion.name === packageVersion.name) < 0) {
                        await githubApiController.deletePackageVersion(packageVersion.id);
                        githubApiController.log({ debug: `Package id ${packageVersion.id} created at ${packageVersion.creationDate} (${packageVersion.name}) ---> DELETED !` });
                        totalDeleted++;
                    } else {
                        githubApiController.log({ info: `Package id ${packageVersion.id} created at ${packageVersion.creationDate} (${packageVersion.name})` });
                    }
                }
            }

            githubApiController.log({ info: `\nTotal deleted entries: ${totalDeleted} / ${total}` });
        } catch (error) {
            githubApiController.log({ error: `${error}` });
        }
    } else {
        console.error('Environment does not provide GITHUB_TOKEN');
    }
}

run().then();
