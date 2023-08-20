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
import { SPINE_GAME_OBJECT_TYPE } from "./keys";
import { ComputedSizeMixin, DepthMixin, FlipMixin, ScrollFactorMixin, TransformMixin, VisibleMixin, AlphaMixin, OriginMixin } from "./mixins";
import { AnimationState, AnimationStateData, MathUtils, Skeleton, Skin } from "@esotericsoftware/spine-core";
class BaseSpineGameObject extends Phaser.GameObjects.GameObject {
    constructor(scene, type) {
        super(scene, type);
    }
}
/** A bounds provider that calculates the bounding box from the setup pose. */
export class SetupPoseBoundsProvider {
    calculateBounds(gameObject) {
        if (!gameObject.skeleton)
            return { x: 0, y: 0, width: 0, height: 0 };
        // Make a copy of animation state and skeleton as this might be called while
        // the skeleton in the GameObject has already been heavily modified. We can not
        // reconstruct that state.
        const skeleton = new Skeleton(gameObject.skeleton.data);
        skeleton.setToSetupPose();
        skeleton.updateWorldTransform();
        const bounds = skeleton.getBoundsRect();
        return bounds.width == Number.NEGATIVE_INFINITY ? { x: 0, y: 0, width: 0, height: 0 } : bounds;
    }
}
/** A bounds provider that calculates the bounding box by taking the maximumg bounding box for a combination of skins and specific animation. */
export class SkinsAndAnimationBoundsProvider {
    /**
     * @param animation The animation to use for calculating the bounds. If null, the setup pose is used.
     * @param skins The skins to use for calculating the bounds. If empty, the default skin is used.
     * @param timeStep The time step to use for calculating the bounds. A smaller time step means more precision, but slower calculation.
     */
    constructor(animation, skins = [], timeStep = 0.05) {
        this.animation = animation;
        this.skins = skins;
        this.timeStep = timeStep;
    }
    calculateBounds(gameObject) {
        if (!gameObject.skeleton || !gameObject.animationState)
            return { x: 0, y: 0, width: 0, height: 0 };
        // Make a copy of animation state and skeleton as this might be called while
        // the skeleton in the GameObject has already been heavily modified. We can not
        // reconstruct that state.
        const animationState = new AnimationState(gameObject.animationState.data);
        const skeleton = new Skeleton(gameObject.skeleton.data);
        const data = skeleton.data;
        if (this.skins.length > 0) {
            let customSkin = new Skin("custom-skin");
            for (const skinName of this.skins) {
                const skin = data.findSkin(skinName);
                if (skin == null)
                    continue;
                customSkin.addSkin(skin);
            }
            skeleton.setSkin(customSkin);
        }
        skeleton.setToSetupPose();
        const animation = this.animation != null ? data.findAnimation(this.animation) : null;
        if (animation == null) {
            skeleton.updateWorldTransform();
            const bounds = skeleton.getBoundsRect();
            return bounds.width == Number.NEGATIVE_INFINITY ? { x: 0, y: 0, width: 0, height: 0 } : bounds;
        }
        else {
            let minX = Number.POSITIVE_INFINITY, minY = Number.POSITIVE_INFINITY, maxX = Number.NEGATIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY;
            animationState.clearTracks();
            animationState.setAnimationWith(0, animation, false);
            const steps = Math.max(animation.duration / this.timeStep, 1.0);
            for (let i = 0; i < steps; i++) {
                animationState.update(i > 0 ? this.timeStep : 0);
                animationState.apply(skeleton);
                skeleton.updateWorldTransform();
                const bounds = skeleton.getBoundsRect();
                minX = Math.min(minX, bounds.x);
                minY = Math.min(minY, bounds.y);
                maxX = Math.max(maxX, minX + bounds.width);
                maxY = Math.max(maxY, minY + bounds.height);
            }
            const bounds = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
            return bounds.width == Number.NEGATIVE_INFINITY ? { x: 0, y: 0, width: 0, height: 0 } : bounds;
        }
    }
}
/**
 * A SpineGameObject is a Phaser {@link GameObject} that can be added to a Phaser Scene and render a Spine skeleton.
 *
 * The Spine GameObject is a thin wrapper around a Spine {@link Skeleton}, {@link AnimationState} and {@link AnimationStateData}. It is responsible for:
 * - updating the animation state
 * - applying the animation state to the skeleton's bones, slots, attachments, and draw order.
 * - updating the skeleton's bone world transforms
 * - rendering the skeleton
 *
 * See the {@link SpinePlugin} class for more information on how to create a `SpineGameObject`.
 *
 * The skeleton, animation state, and animation state data can be accessed via the repsective fields. They can be manually updated via {@link updatePose}.
 *
 * To modify the bone hierarchy before the world transforms are computed, a callback can be set via the {@link beforeUpdateWorldTransforms} field.
 *
 * To modify the bone hierarchy after the world transforms are computed, a callback can be set via the {@link afterUpdateWorldTransforms} field.
 *
 * The class also features methods to convert between the skeleton coordinate system and the Phaser coordinate system.
 *
 * See {@link skeletonToPhaserWorldCoordinates}, {@link phaserWorldCoordinatesToSkeleton}, and {@link phaserWorldCoordinatesToBoneLocal.}
 */
export class SpineGameObject extends DepthMixin(OriginMixin(ComputedSizeMixin(FlipMixin(ScrollFactorMixin(TransformMixin(VisibleMixin(AlphaMixin(BaseSpineGameObject)))))))) {
    constructor(scene, plugin, x, y, dataKey, atlasKey, boundsProvider = new SetupPoseBoundsProvider()) {
        super(scene, SPINE_GAME_OBJECT_TYPE);
        this.plugin = plugin;
        this.boundsProvider = boundsProvider;
        this.blendMode = -1;
        this.beforeUpdateWorldTransforms = () => { };
        this.afterUpdateWorldTransforms = () => { };
        this.premultipliedAlpha = false;
        this.setPosition(x, y);
        this.premultipliedAlpha = this.plugin.isAtlasPremultiplied(atlasKey);
        this.skeleton = this.plugin.createSkeleton(dataKey, atlasKey);
        this.animationStateData = new AnimationStateData(this.skeleton.data);
        this.animationState = new AnimationState(this.animationStateData);
        this.skeleton.updateWorldTransform();
        this.updateSize();
    }
    updateSize() {
        if (!this.skeleton)
            return;
        let bounds = this.boundsProvider.calculateBounds(this);
        // For some reason the TS compiler and the ComputedSize mixin don't work well together and we have
        // to cast to any.
        let self = this;
        self.width = bounds.width;
        self.height = bounds.height;
        this.displayOriginX = -bounds.x;
        this.displayOriginY = -bounds.y;
    }
    /** Converts a point from the skeleton coordinate system to the Phaser world coordinate system. */
    skeletonToPhaserWorldCoordinates(point) {
        let transform = this.getWorldTransformMatrix();
        let a = transform.a, b = transform.b, c = transform.c, d = transform.d, tx = transform.tx, ty = transform.ty;
        let x = point.x;
        let y = point.y;
        point.x = x * a + y * c + tx;
        point.y = x * b + y * d + ty;
    }
    /** Converts a point from the Phaser world coordinate system to the skeleton coordinate system. */
    phaserWorldCoordinatesToSkeleton(point) {
        let transform = this.getWorldTransformMatrix();
        transform = transform.invert();
        let a = transform.a, b = transform.b, c = transform.c, d = transform.d, tx = transform.tx, ty = transform.ty;
        let x = point.x;
        let y = point.y;
        point.x = x * a + y * c + tx;
        point.y = x * b + y * d + ty;
    }
    /** Converts a point from the Phaser world coordinate system to the bone's local coordinate system. */
    phaserWorldCoordinatesToBone(point, bone) {
        this.phaserWorldCoordinatesToSkeleton(point);
        if (bone.parent) {
            bone.parent.worldToLocal(point);
        }
        else {
            bone.worldToLocal(point);
        }
    }
    /**
     * Updates the {@link AnimationState}, applies it to the {@link Skeleton}, then updates the world transforms of all bones.
     * @param delta The time delta in milliseconds
     */
    updatePose(delta) {
        this.animationState.update(delta / 1000);
        this.animationState.apply(this.skeleton);
        this.beforeUpdateWorldTransforms(this);
        this.skeleton.updateWorldTransform();
        this.afterUpdateWorldTransforms(this);
    }
    preUpdate(time, delta) {
        if (!this.skeleton || !this.animationState)
            return;
        this.updatePose(delta);
    }
    preDestroy() {
        // FIXME tear down any event emitters
    }
    willRender(camera) {
        if (!this.visible)
            return false;
        var GameObjectRenderMask = 0xf;
        var result = (!this.skeleton || !(GameObjectRenderMask !== this.renderFlags || (this.cameraFilter !== 0 && (this.cameraFilter & camera.id))));
        return result;
    }
    renderWebGL(renderer, src, camera, parentMatrix) {
        if (!this.skeleton || !this.animationState || !this.plugin.webGLRenderer)
            return;
        let sceneRenderer = this.plugin.webGLRenderer;
        if (renderer.newType) {
            renderer.pipelines.clear();
            sceneRenderer.begin();
        }
        camera.addToRenderList(src);
        let transform = Phaser.GameObjects.GetCalcMatrix(src, camera, parentMatrix).calc;
        let a = transform.a, b = transform.b, c = transform.c, d = transform.d, tx = transform.tx, ty = transform.ty;
        sceneRenderer.drawSkeleton(this.skeleton, this.premultipliedAlpha, -1, -1, (vertices, numVertices, stride) => {
            for (let i = 0; i < numVertices; i += stride) {
                let vx = vertices[i];
                let vy = vertices[i + 1];
                vertices[i] = vx * a + vy * c + tx;
                vertices[i + 1] = vx * b + vy * d + ty;
            }
        });
        if (!renderer.nextTypeMatch) {
            sceneRenderer.end();
            renderer.pipelines.rebind();
        }
    }
    renderCanvas(renderer, src, camera, parentMatrix) {
        if (!this.skeleton || !this.animationState || !this.plugin.canvasRenderer)
            return;
        let context = renderer.currentContext;
        let skeletonRenderer = this.plugin.canvasRenderer;
        skeletonRenderer.ctx = context;
        camera.addToRenderList(src);
        let transform = Phaser.GameObjects.GetCalcMatrix(src, camera, parentMatrix).calc;
        let skeleton = this.skeleton;
        skeleton.x = transform.tx;
        skeleton.y = transform.ty;
        skeleton.scaleX = transform.scaleX;
        skeleton.scaleY = transform.scaleY;
        let root = skeleton.getRootBone();
        root.rotation = -MathUtils.radiansToDegrees * transform.rotationNormalized;
        this.skeleton.updateWorldTransform();
        context.save();
        skeletonRenderer.draw(skeleton);
        context.restore();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3BpbmVHYW1lT2JqZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1NwaW5lR2FtZU9iamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OytFQTJCK0U7QUFFL0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sUUFBUSxDQUFDO0FBRWhELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUM5SSxPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFRLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFXLE1BQU0sOEJBQThCLENBQUM7QUFFNUgsTUFBTSxtQkFBb0IsU0FBUSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVU7SUFDOUQsWUFBYSxLQUFtQixFQUFFLElBQVk7UUFDN0MsS0FBSyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNwQixDQUFDO0NBQ0Q7QUFRRCw4RUFBOEU7QUFDOUUsTUFBTSxPQUFPLHVCQUF1QjtJQUNuQyxlQUFlLENBQUUsVUFBMkI7UUFDM0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRO1lBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztRQUNyRSw0RUFBNEU7UUFDNUUsK0VBQStFO1FBQy9FLDBCQUEwQjtRQUMxQixNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hELFFBQVEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUMxQixRQUFRLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUNo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