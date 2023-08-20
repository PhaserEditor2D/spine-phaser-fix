/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated July 28, 2023. Replaces all prior versions.
 *
 * Copyright (c) 2013-2023, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software or
 * otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THE SPINE RUNTIMES ARE PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES,
 * BUSINESS INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THE
 * SPINE RUNTIMES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/
import Phaser from "phaser";
import { SPINE_ATLAS_CACHE_KEY, SPINE_CONTAINER_TYPE, SPINE_GAME_OBJECT_TYPE, SPINE_SKELETON_DATA_FILE_TYPE, SPINE_ATLAS_FILE_TYPE, SPINE_SKELETON_FILE_CACHE_KEY as SPINE_SKELETON_DATA_CACHE_KEY } from "./keys";
import { AtlasAttachmentLoader, GLTexture, SceneRenderer, Skeleton, SkeletonBinary, SkeletonJson, TextureAtlas } from "@esotericsoftware/spine-webgl";
import { SpineGameObject } from "./SpineGameObject";
import { CanvasTexture, SkeletonRenderer } from "@esotericsoftware/spine-canvas";
/**
 * {@link ScenePlugin} implementation adding Spine Runtime capabilities to a scene.
 *
 * The scene's {@link LoaderPlugin} (`Scene.load`) gets these additional functions:
 * * `spineBinary(key: string, url: string, xhrSettings?: XHRSettingsObject)`: loads a skeleton binary `.skel` file from the `url`.
 * * `spineJson(key: string, url: string, xhrSettings?: XHRSettingsObject)`: loads a skeleton binary `.skel` file from the `url`.
 * * `spineAtlas(key: string, url: string, premultipliedAlpha: boolean = true, xhrSettings?: XHRSettingsObject)`: loads a texture atlas `.atlas` file from the `url` as well as its correponding texture atlas page images.
 *
 * The scene's {@link GameObjectFactory} (`Scene.add`) gets these additional functions:
 * * `spine(x: number, y: number, dataKey: string, atlasKey: string, boundsProvider: SpineGameObjectBoundsProvider = SetupPoseBoundsProvider())`:
 *    creates a new {@link SpineGameObject} from the data and atlas at position `(x, y)`, using the {@link BoundsProvider} to calculate its bounding box. The object is automatically added to the scene.
 *
 * The scene's {@link GameObjectCreator} (`Scene.make`) gets these additional functions:
 * * `spine(config: SpineGameObjectConfig)`: creates a new {@link SpineGameObject} from the given configuration object.
 *
 * The plugin has additional public methods to work with Spine Runtime core API objects:
 * * `getAtlas(atlasKey: string)`: returns the {@link TextureAtlas} instance for the given atlas key.
 * * `getSkeletonData(skeletonDataKey: string)`: returns the {@link SkeletonData} instance for the given skeleton data key.
 * * `createSkeleton(skeletonDataKey: string, atlasKey: string, premultipliedAlpha: boolean = true)`: creates a new {@link Skeleton} instance from the given skeleton data and atlas key.
 * * `isPremultipliedAlpha(atlasKey: string)`: returns `true` if the atlas with the given key has premultiplied alpha.
 */
export class SpinePlugin extends Phaser.Plugins.ScenePlugin {
    constructor(scene, pluginManager, pluginKey) {
        super(scene, pluginManager, pluginKey);
        this.game = pluginManager.game;
        this.isWebGL = this.game.config.renderType === 2;
        this.gl = this.isWebGL ? this.game.renderer.gl : null;
        this.webGLRenderer = null;
        this.canvasRenderer = null;
        this.skeletonDataCache = this.game.cache.addCustom(SPINE_SKELETON_DATA_CACHE_KEY);
        this.atlasCache = this.game.cache.addCustom(SPINE_ATLAS_CACHE_KEY);
        let skeletonJsonFileCallback = function (key, url, xhrSettings) {
            let file = new SpineSkeletonDataFile(this, key, url, SpineSkeletonDataFileType.json, xhrSettings);
            this.addFile(file.files);
            return this;
        };
        pluginManager.registerFileType("spineJson", skeletonJsonFileCallback, scene);
        let skeletonBinaryFileCallback = function (key, url, xhrSettings) {
            let file = new SpineSkeletonDataFile(this, key, url, SpineSkeletonDataFileType.binary, xhrSettings);
            this.addFile(file.files);
            return this;
        };
        pluginManager.registerFileType("spineBinary", skeletonBinaryFileCallback, scene);
        let atlasFileCallback = function (key, url, premultipliedAlpha, xhrSettings) {
            let file = new SpineAtlasFile(this, key, url, premultipliedAlpha, xhrSettings);
            this.addFile(file.files);
            return this;
        };
        pluginManager.registerFileType("spineAtlas", atlasFileCallback, scene);
        let self = this;
        let addSpineGameObject = function (x, y, dataKey, atlasKey, boundsProvider) {
            let gameObject = new SpineGameObject(scene, self, x, y, dataKey, atlasKey, boundsProvider);
            this.displayList.add(gameObject);
            this.updateList.add(gameObject);
            return gameObject;
        };
        let makeSpineGameObject = function (config, addToScene = false) {
            let x = config.x ? config.x : 0;
            let y = config.y ? config.y : 0;
            let boundsProvider = config.boundsProvider ? config.boundsProvider : undefined;
            let gameObject = new SpineGameObject(this.scene, self, x, y, config.dataKey, config.atlasKey, boundsProvider);
            if (addToScene !== undefined) {
                config.add = addToScene;
            }
            return Phaser.GameObjects.BuildGameObject(this.scene, gameObject, config);
        };
        pluginManager.registerGameObject(SPINE_GAME_OBJECT_TYPE, addSpineGameObject, makeSpineGameObject);
    }
    boot() {
        Skeleton.yDown = true;
        if (this.isWebGL) {
            if (!this.webGLRenderer) {
                this.webGLRenderer = new SceneRenderer(this.game.renderer.canvas, this.gl, true);
            }
            this.onResize();
            this.game.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
        }
        else {
            if (!this.canvasRenderer) {
                this.canvasRenderer = new SkeletonRenderer(this.scene.sys.context);
            }
        }
        var eventEmitter = this.systems.events;
        eventEmitter.once('shutdown', this.shutdown, this);
        eventEmitter.once('destroy', this.destroy, this);
        this.game.events.once('destroy', this.gameDestroy, this);
    }
    onResize() {
        var phaserRenderer = this.game.renderer;
        var sceneRenderer = this.webGLRenderer;
        if (phaserRenderer && sceneRenderer) {
            var viewportWidth = phaserRenderer.width;
            var viewportHeight = phaserRenderer.height;
            sceneRenderer.camera.position.x = viewportWidth / 2;
            sceneRenderer.camera.position.y = viewportHeight / 2;
            sceneRenderer.camera.up.y = -1;
            sceneRenderer.camera.direction.z = 1;
            sceneRenderer.camera.setViewport(viewportWidth, viewportHeight);
        }
    }
    shutdown() {
        this.systems.events.off("shutdown", this.shutdown, this);
        if (this.isWebGL) {
            this.game.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
        }
    }
    destroy() {
        this.shutdown();
    }
    gameDestroy() {
        this.pluginManager.removeGameObject(SPINE_GAME_OBJECT_TYPE, true, true);
        this.pluginManager.removeGameObject(SPINE_CONTAINER_TYPE, true, true);
        if (this.webGLRenderer)
            this.webGLRenderer.dispose();
    }
    /** Returns the TextureAtlas instance for the given key */
    getAtlas(atlasKey) {
        let atlas;
        if (this.atlasCache.exists(atlasKey)) {
            atlas = this.atlasCache.get(atlasKey);
        }
        else {
            let atlasFile = this.game.cache.text.get(atlasKey);
            atlas = new TextureAtlas(atlasFile.data);
            if (this.isWebGL) {
                let gl = this.gl;
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                for (let atlasPage of atlas.pages) {
                    atlasPage.setTexture(new GLTexture(gl, this.game.textures.get(atlasKey + "!" + atlasPage.name).getSourceImage(), false));
                }
            }
            else {
                for (let atlasPage of atlas.pages) {
                    atlasPage.setTexture(new CanvasTexture(this.game.textures.get(atlasKey + "!" + atlasPage.name).getSourceImage()));
                }
            }
            this.atlasCache.add(atlasKey, atlas);
        }
        return atlas;
    }
    /** Returns whether the TextureAtlas uses premultiplied alpha */
    isAtlasPremultiplied(atlasKey) {
        let atlasFile = this.game.cache.text.get(atlasKey);
        if (!atlasFile)
            return false;
        return atlasFile.premultipliedAlpha;
    }
    /** Returns the SkeletonData instance for the given data and atlas key */
    getSkeletonData(dataKey, atlasKey) {
        const atlas = this.getAtlas(atlasKey);
        const combinedKey = dataKey + atlasKey;
        let skeletonData;
        if (this.skeletonDataCache.exists(combinedKey)) {
            skeletonData = this.skeletonDataCache.get(combinedKey);
        }
        else {
            if (this.game.cache.json.exists(dataKey)) {
                let jsonFile = this.game.cache.json.get(dataKey);
                let json = new SkeletonJson(new AtlasAttachmentLoader(atlas));
                skeletonData = json.readSkeletonData(jsonFile);
            }
            else {
                let binaryFile = this.game.cache.binary.get(dataKey);
                let binary = new SkeletonBinary(new AtlasAttachmentLoader(atlas));
                skeletonData = binary.readSkeletonData(new Uint8Array(binaryFile));
            }
            this.skeletonDataCache.add(combinedKey, skeletonData);
        }
        return skeletonData;
    }
    /** Creates a new Skeleton instance from the data and atlas. */
    createSkeleton(dataKey, atlasKey) {
        return new Skeleton(this.getSkeletonData(dataKey, atlasKey));
    }
}
var SpineSkeletonDataFileType;
(function (SpineSkeletonDataFileType) {
    SpineSkeletonDataFileType[SpineSkeletonDataFileType["json"] = 0] = "json";
    SpineSkeletonDataFileType[SpineSkeletonDataFileType["binary"] = 1] = "binary";
})(SpineSkeletonDataFileType || (SpineSkeletonDataFileType = {}));
class SpineSkeletonDataFile extends Phaser.Loader.MultiFile {
    constructor(loader, key, url, fileType, xhrSettings) {
        if (typeof key !== "string") {
            const config = key;
            key = config.key;
            url = config.url;
            fileType = config.type === "spineJson" ? SpineSkeletonDataFileType.json : SpineSkeletonDataFileType.binary;
            xhrSettings = config.xhrSettings;
        }
        let file = null;
        let isJson = fileType == SpineSkeletonDataFileType.json;
        if (isJson) {
            file = new Phaser.Loader.FileTypes.JSONFile(loader, {
                key: key,
                url: url,
                extension: "json",
                xhrSettings: xhrSettings,
            });
        }
        else {
            file = new Phaser.Loader.FileTypes.BinaryFile(loader, {
                key: key,
                url: url,
                extension: "skel",
                xhrSettings: xhrSettings,
            });
        }
        super(loader, SPINE_SKELETON_DATA_FILE_TYPE, key, [file]);
        this.fileType = fileType;
    }
    onFileComplete(file) {
        this.pending--;
    }
    addToCache() {
        if (this.isReadyToProcess())
            this.files[0].addToCache();
    }
}
class SpineAtlasFile extends Phaser.Loader.MultiFile {
    constructor(loader, key, url, premultipliedAlpha = true, xhrSettings) {
        var _a;
        if (typeof key !== "string") {
            const config = key;
            key = config.key;
            url = config.url;
            premultipliedAlpha = (_a = config.premultipliedAlpha) !== null && _a !== void 0 ? _a : true;
            xhrSettings = config.xhrSettings;
        }
        super(loader, SPINE_ATLAS_FILE_TYPE, key, [
            new Phaser.Loader.FileTypes.TextFile(loader, {
                key: key,
                url: url,
                xhrSettings: xhrSettings,
                extension: "atlas"
            })
        ]);
        this.premultipliedAlpha = premultipliedAlpha;
        this.premultipliedAlpha = premultipliedAlpha;
    }
    onFileComplete(file) {
        if (this.files.indexOf(file) != -1) {
            this.pending--;
            if (file.type == "text") {
                var lines = file.data.split(/\r\n|\r|\n/);
                let textures = [];
                textures.push(lines[0]);
                for (var t = 1; t < lines.length; t++) {
                    var line = lines[t];
                    if (line.trim() === '' && t < lines.length - 1) {
                        line = lines[t + 1];
                        textures.push(line);
                    }
                }
                let basePath = file.src.match(/^.*\//);
                for (var i = 0; i < textures.length; i++) {
                    var url = basePath + textures[i];
                    var key = file.key + "!" + textures[i];
                    var image = new Phaser.Loader.FileTypes.ImageFile(this.loader, key, url);
                    if (!this.loader.keyExists(image)) {
                        this.addToMultiFile(image);
                        this.loader.addFile(image);
                    }
                }
            }
        }
    }
    addToCache() {
        if (this.isReadyToProcess()) {
            let textureManager = this.loader.textureManager;
            for (let file of this.files) {
                if (file.type == "image") {
                    if (!textureManager.exists(file.key)) {
                        textureManager.addImage(file.key, file.data);
                    }
                }
                else {
                    file.data = {
                        data: file.data,
                        premultipliedAlpha: this.premultipliedAlpha || file.data.indexOf("pma: true") >= 0
                    };
                    file.addToCache();
                }
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3BpbmVQbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvU3BpbmVQbHVnaW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsrRUEyQitFO0FBRS9FLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUscUJBQXFCLEVBQUUsb0JBQW9CLEVBQUUsc0JBQXNCLEVBQUUsNkJBQTZCLEVBQUUscUJBQXFCLEVBQUUsNkJBQTZCLElBQUksNkJBQTZCLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDbk4sT0FBTyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBZ0IsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ25LLE9BQU8sRUFBRSxlQUFlLEVBQWlDLE1BQU0sbUJBQW1CLENBQUM7QUFDbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBbUJqRjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7QUFDSCxNQUFNLE9BQU8sV0FBWSxTQUFRLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztJQVMxRCxZQUFhLEtBQW1CLEVBQUUsYUFBMkMsRUFBRSxTQUFpQjtRQUMvRixLQUFLLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUM7UUFDL0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLEtBQUssQ0FBQyxDQUFDO1FBQ2pELElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFnRCxDQUFDLEVBQUUsQ0FBQyxDQUFDLENB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