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
exports.GPGithubContainerRegistryAPIController = void 0;
const axios = __importStar(require("axios"));
class GPGithubContainerRegistryAPIController {
    token;
    packageName;
    packageOwner;
    constructor(token, packageOwner, packageName) {
        this.token = token;
        this.packageName = packageName;
        this.packageOwner = packageOwner;
    }
    static async create(token, targetPackage, runAsUser) {
        let packageOwner = '';
        let packageName = '';
        if ('repository' in targetPackage) {
            const splitRepositoty = targetPackage.repository.split('/');
            packageOwner = splitRepositoty[0];
            packageName = splitRepositoty[1];
        }
        else {
            const splitPackage = targetPackage.package.split('/');
            packageOwner = splitPackage[0];
            packageName = splitPackage[1];
        }
        try {
            const request = await axios.default.get('https://ghcr.io/token', { auth: { username: runAsUser, password: token }, params: { scope: `repository:${packageOwner}/${packageName}:pull` } });
            return new GPGithubContainerRegistryAPIController(request.data.token, packageOwner, packageName);
        }
        catch (error) {
            throw `Could not retrive token for with scope: 'repository:${packageOwner}/${packageName}:pull'`;
        }
    }
    async getManifestsForTag(tag) {
        try {
            const request = await axios.default.get(`https://ghcr.io/v2/${this.packageOwner}/${this.packageName}/manifests/${tag}`, {
                headers: {
                    Accept: 'application/vnd.oci.image.index.v1+json',
                    Authorization: `Bearer ${this.token}`,
                },
            });
            return request.data.manifests;
        }
        catch (error) {
            throw `Unable to fetch manifests for ghcr.io/${this.packageOwner}/${this.packageName}:${tag}: ${error}`;
        }
    }
}
exports.GPGithubContainerRegistryAPIController = GPGithubContainerRegistryAPIController;
//# sourceMappingURL=github_container_registry_api.controller.js.map