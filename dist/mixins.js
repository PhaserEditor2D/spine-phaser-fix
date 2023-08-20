/*
The MIT License (MIT)

Copyright (c) 2021-present AgogPixel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
// Adapted from https://github.com/agogpixel/phaser3-ts-utils/tree/main
let components = Phaser.GameObjects.Components;
export const ComputedSize = components.ComputedSize;
export const Depth = components.Depth;
export const Flip = components.Flip;
export const ScrollFactor = components.ScrollFactor;
export const Transform = components.Transform;
export const Visible = components.Visible;
export const Origin = components.Origin;
export const Alpha = components.Alpha;
export function createMixin(...component) {
    return (BaseGameObject) => {
        Phaser.Class.mixin(BaseGameObject, component);
        return BaseGameObject;
    };
}
export const ComputedSizeMixin = createMixin(ComputedSize);
export const DepthMixin = createMixin(Depth);
export const FlipMixin = createMixin(Flip);
export const ScrollFactorMixin = createMixin(ScrollFactor);
export const TransformMixin = createMixin(Transform);
export const VisibleMixin = createMixin(Visible);
export const OriginMixin = createMixin(Origin);
export const AlphaMixin = createMixin(Alpha);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWl4aW5zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL21peGlucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQXNCRTtBQUVGLHVFQUF1RTtBQUV2RSxJQUFJLFVBQVUsR0FBSSxNQUFNLENBQUMsV0FBVyxDQUFDLFVBQWtCLENBQUM7QUFDeEQsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUM7QUFDcEQsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7QUFDdEMsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUM7QUFDcEMsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUM7QUFDcEQsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUM7QUFDOUMsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUM7QUFDMUMsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7QUFDeEMsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUM7QUFldEMsTUFBTSxVQUFVLFdBQVcsQ0FJMUIsR0FBRyxTQUFnQztJQUVuQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUU7UUFDeEIsTUFBYyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sY0FBcUIsQ0FBQztJQUM5QixDQUFDLENBQUM7QUFDSCxDQUFDO0FBR0QsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQXNCLFdBQVcsQ0FBNkMsWUFBWSxDQUFDLENBQUM7QUFHMUgsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFlLFdBQVcsQ0FBc0MsS0FBSyxDQUFDLENBQUM7QUFHOUYsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFjLFdBQVcsQ0FBcUMsSUFBSSxDQUFDLENBQUM7QUFHMUYsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQXNCLFdBQVcsQ0FBNkMsWUFBWSxDQUFDLENBQUM7QUFHMUgsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFtQixXQUFXLENBQTBDLFNBQVMsQ0FBQyxDQUFDO0FBRzlHLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBaUIsV0FBVyxDQUF3QyxPQUFPLENBQUMsQ0FBQztBQUd0RyxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQWdCLFdBQVcsQ0FBdUMsTUFBTSxDQUFDLENBQUM7QUFHbEcsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFlLFdBQVcsQ0FBc0MsS0FBSyxDQUFDLENBQUMifQ==