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
    runAsUser: core.getInput('runAsUser', { required: true }),
    token: core.getInput('token', { required: false }),
    package: core.getInput('package', { required: false }),
    isOwnedByOrganization: core.getBooleanInput('isOwnedByOrganization', { required: false }),
    retentionDays: parseInt(core.getInput('retentionDays', { required: false })),
    testOnly: core.getBooleanInput('testOnly', { required: false }),
};

const referenceEpoc = Date.now();

async function run() {
    core.debug(`input.runAsUser: ${input.runAsUser}`);
    core.debug(`input.token: ${Array(input.token.length).join('*')}`);
    core.debug(`input.isOwnedByOrganization: ${input.isOwnedByOrganization}`);
    core.debug(`input.retentionDays: ${input.retentionDays}`);
    core.debug(`input.testOnly: ${input.testOnly}`);
    core.debug(`github.context.repo: ${github.context.repo.owner}/${github.context.repo.repo}`);

    const githubApiController = new GPGithubApiController(input.token, input.package.length > 0 ? { package: input.package } : { repository: `${github.context.repo.owner}/${github.context.repo.repo}` }, input.isOwnedByOrganization);
    const githubContainerRegistryAPIController = await GPGithubContainerRegistryAPIController.create(
        input.token,
        input.package.length > 0 ? { package: input.package } : { repository: `${github.context.repo.owner}/${github.context.repo.repo}` },
        input.isOwnedByOrganization,
        input.runAsUser
    );

    try {
        const packageVersions = await githubApiController.getAllPackageVersions();
        const total = packageVersions.length;

        let untaggedPackageVersionsToKeep: GPGithubPackageVersion[] = [];
        for (const packageVersion of packageVersions.filter((packageVersion) => packageVersion.tags.length > 0)) {
            const manifests = await githubContainerRegistryAPIController.getManifestsForTag(packageVersion.tags[0]);
            for (const manifest of manifests) {
                const untaggedPackageVersionToKeep = packageVersions.find((aPackageVersion) => aPackageVersion.name === manifest.digest);
                if (untaggedPackageVersionToKeep) untaggedPackageVersionsToKeep = [...untaggedPackageVersionsToKeep.filter((aUntaggedPpackageVersion) => aUntaggedPpackageVersion.name !== untaggedPackageVersionToKeep.name), untaggedPackageVersionToKeep];
            }
        }
        let totalDeleted = 0;
        for (const packageVersion of packageVersions) {
            if (packageVersion.tags.length > 0) core.info(`Package id ${packageVersion.id} created at ${packageVersion.creationDate.toISOString()} (${packageVersion.name}) with tags: ${packageVersion.tags}`);
            else {
                if (untaggedPackageVersionsToKeep.findIndex((untaggedPackageVersion) => untaggedPackageVersion.name === packageVersion.name) < 0) {
                    if (referenceEpoc - packageVersion.creationDate.getTime() > input.retentionDays * 24 * 3600 * 1000) {
                        core.info(`Package id ${packageVersion.id} created at ${packageVersion.creationDate.toISOString()} (${packageVersion.name}) ---> will be deleted !`);
                        if (!input.testOnly) await githubApiController.deletePackageVersion(packageVersion.id);
                        totalDeleted++;
                    } else {
                        core.info(`Package id ${packageVersion.id} created at ${packageVersion.creationDate.toISOString()} (${packageVersion.name})`);
                    }
                } else {
                    core.info(`Package id ${packageVersion.id} created at ${packageVersion.creationDate.toISOString()} (${packageVersion.name})`);
                }
            }
        }

        core.info(`\nTotal deleted entries: ${totalDeleted} / ${total}`);
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        core.setFailed(`${(error as any)?.message ?? error}`);
    }
}

run().then();
