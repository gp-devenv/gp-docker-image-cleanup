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

import * as axios from 'axios';
import { GPManifest } from '../models/manifest.model';

export class GPGithubContainerRegistryAPIController {
    private token: string;
    private packageName: string;
    private packageOwner: string;

    constructor(token: string, packageOwner: string, packageName: string) {
        this.token = token;
        this.packageName = packageName;
        this.packageOwner = packageOwner;
    }

    static async create(token: string, targetPackage: { repository: string } | { package: string }, runAsUser: string): Promise<GPGithubContainerRegistryAPIController> {
        let packageOwner = '';
        let packageName = '';
        if ('repository' in targetPackage) {
            const splitRepositoty = targetPackage.repository.split('/');
            packageOwner = splitRepositoty[0];
            packageName = splitRepositoty[1];
        } else {
            const splitPackage = targetPackage.package.split('/');
            packageOwner = splitPackage[0];
            packageName = splitPackage[1];
        }
        try {
            const request = await axios.default.get('https://ghcr.io/token', { auth: { username: runAsUser, password: token }, params: { scope: `repository:${packageOwner}/${packageName}:pull` } });
            return new GPGithubContainerRegistryAPIController(request.data.token, packageOwner, packageName);
        } catch (error) {
            throw `Could not retrive token for with scope: 'repository:${packageOwner}/${packageName}:pull'`;
        }
    }

    async getManifestsForTag(tag: string): Promise<GPManifest[]> {
        try {
            const request = await axios.default.get(`https://ghcr.io/v2/${this.packageOwner}/${this.packageName}/manifests/${tag}`, {
                headers: {
                    Accept: 'application/vnd.oci.image.index.v1+json',
                    Authorization: `Bearer ${this.token}`,
                },
            });
            return request.data.manifests as GPManifest[];
        } catch (error) {
            throw `Unable to fetch manifests for ghcr.io/${this.packageOwner}/${this.packageName}:${tag}: ${error}`;
        }
    }
}
