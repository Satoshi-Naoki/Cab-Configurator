import {
  Vector2,
  Vector3,
  Matrix4,
  Plane,
  Raycaster,
} from 'three';
import { mapState } from 'vuex';

export default {
  name: 'DragControls',
  inject: ['vglNamespace'],
  props: {
    camera: {
      type: String,
      required: true,
    },
    enable: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      selected: null,
      hoveredObject: null,
      selectedObject: null,
      isDragging: false,
    };
  },
  computed: {
    ...mapState('Camera', [
      'selectedObject3D',
    ]),
    ...mapState('Panels', [
      'enableMoving',
      'enableResizing',
      'enableMeasure',
      'enableShapeEdit',
      'enableDrillEdit',
      'enableCreatePoint',
      'enableCreateDrill',
      'enableLayerDisplayer',
      'enableGroupArranger',
      'enableEdgeAutoApplier',
    ]),
    domElement() {
      return this.vglNamespace.renderers[0].inst.domElement;
    },
    cameraInst() {
      return this.vglNamespace.cameras[this.camera];
    },
    plane: () => new Plane(),
    raycaster: () => new Raycaster(),
    prevMousePos: () => new Vector2(),
    mouse: () => new Vector2(),
    offset: () => new Vector3(),
    intersection: () => new Vector3(),
    worldPosition: () => new Vector3(),
    inverseMatrix: () => new Matrix4(),
  },
  methods: {
    activate() {
      this.domElement.addEventListener('touchstart', this.onDocumentTouchStart, false);
      this.domElement.addEventListener('keydown', this.onDocumentKeyDown, false);
      this.domElement.addEventListener('mousedown', this.onDocumentMouseDown, false);
      this.domElement.addEventListener('click', this.onDocumentMouseClick, false);
      this.domElement.addEventListener('auxclick', this.onDocumentRightMouseClick, false);
      this.domElement.addEventListener('wheel', this.onDocumentMouseWheel, false);
      this.domElement.addEventListener('touchend', this.onDocumentTouchEnd, false);

      let appDiv = this.domElement;
      if (document.getElementById('content-3d')) appDiv = document.getElementById('content-3d');

      appDiv.addEventListener('mousemove', this.onDocumentMouseMove, false);
      appDiv.addEventListener('touchmove', this.onDocumentTouchMove, false);
    },
    deactivate() {
      this.domElement.removeEventListener('touchstart', this.onDocumentTouchStart, false);
      this.domElement.removeEventListener('keydown', this.onDocumentKeyDown, false);
      this.domElement.removeEventListener('click', this.onDocumentMouseClick, false);
      this.domElement.removeEventListener('auxclick', this.onDocumentRightMouseClick, false);
      this.domElement.removeEventListener('wheel', this.onDocumentMouseWheel, false);
      this.domElement.removeEventListener('touchend', this.onDocumentTouchEnd, false);

      let appDiv = this.domElement;
      if (document.getElementById('content-3d')) appDiv = document.getElementById('content-3d');

      appDiv.removeEventListener('mousemove', this.onDocumentMouseMove, false);
      appDiv.removeEventListener('touchmove', this.onDocumentTouchMove, false);
    },
    objects() {
      return Object.values(this.vglNamespace.object3ds)
        .filter(obj => (obj.isPanel || obj.isDimension || obj.isCoordinate || obj.isConnectionBubble || obj.isPhysicalGeometry
          || (obj.isShapeVertex && this.enableShapeEdit)
          || (obj.isDrillGeometry && this.enableDrillEdit)) && obj.visible);
    },
    childObjects() {
      return this.vglNamespace.object3ds;
    },
    resetMoveResize() {
      this.$store.commit('Panels/enableMoving', false);
      this.$store.commit('Panels/enableResizing', false);
    },
    setRaycaster(event) {
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.cameraInst);
    },
    moveStep() {
      this.domElement.style.cursor = 'move';
      this.isDragging = true;
      this.$emit('hoveron');
    },
    roundPosition(offset = this.offset) {
      const position = this.intersection.sub(offset).applyMatrix4(this.inverseMatrix);
      return {
        x: Math.round(position.x),
        y: Math.round(position.y),
        z: Math.round(position.z),
      };
    },
    setOffset(name) {
      const selectedObject3D = this.vglNamespace.object3ds[name];
      if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
        const matrixWorld = selectedObject3D.parent != null
          ? selectedObject3D.parent.matrixWorld
          : selectedObject3D.matrixWorld;
        this.inverseMatrix.getInverse(matrixWorld);
        this.offset.copy(this.intersection).sub(this.worldPosition.setFromMatrixPosition(selectedObject3D.matrixWorld));
      }
    },
    onDocumentMouseWheel(event) {
      event.preventDefault();

      this.plane.setFromNormalAndCoplanarPoint(this.cameraInst.getWorldDirection(this.plane.normal),
        this.selectedObject && this.selectedObject.setFromMatrixPosition ? this.worldPosition.setFromMatrixPosition(this.selectedObject.matrixWorld) : new Vector3(0, 0, 0));

      if (this.enableMeasure) {
        let rulerPoint = null;
        if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) rulerPoint = this.roundPosition();
        this.$emit('rulermove', { event, rulerPoint });
        return;
      }

      this.onDocumentMouseMove(event);
    },
    onDocumentMouseDown(event) {
      event.preventDefault();

      // Save mouse position
      this.prevMousePos.x = event.clientX;
      this.prevMousePos.y = event.clientY;
      this.isDragging = true;
      this.$emit('hoveroff');
      if (this.enableLayerDisplayer) this.$store.commit('Panels/changeLayerDisplayerMode', false);
      if (this.enableEdgeAutoApplier) this.$store.commit('Panels/enableEdgeAutoApplier', false);
    },
    onDocumentMouseMove(event) {
      event.preventDefault();
      this.setRaycaster(event);

      const intersects = this.raycaster.intersectObjects(this.objects(), true);

      if (this.enableMeasure) {
        this.plane.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), new Vector3(0, 0, 0));
        let rulerPoint = null;

        if (intersects.length > 0) {
          rulerPoint = intersects[0].point;
        } else if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
          rulerPoint = this.roundPosition(new Vector3(0, 0, 0));
        }

        this.$emit('rulermove', { event, rulerPoint });
        this.domElement.style.cursor = 'crosshair';
        return;
      }
      if (this.enableShapeEdit || this.enableDrillEdit) {
        if (this.selected && this.selected.isCoordinate) {
          this.plane.setFromNormalAndCoplanarPoint(this.cameraInst.getWorldDirection(this.plane.normal),
            this.worldPosition.setFromMatrixPosition(this.selected.matrixWorld));

          if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
            const roundPosition = this.roundPosition();
            // careful, position will need to be fixed (it's a threejs position)
            this.$emit('dragmove', {
              event,
              selected: this.selected,
              position: roundPosition,
              magnetism: !event.shiftKey,
            });
          }
          this.domElement.style.cursor = 'move';
        } else if (intersects.length > 0) {
          if ((this.enableCreatePoint || this.enableCreateDrill) && (intersects[0].object.name.split('_')[0] === this.selectedObject3D.object3d.name.split('_')[0])) {
            this.domElement.style.cursor = 'copy';
          } else if (intersects[0].object.isShapeVertex || intersects[0].object.isDrillGeometry || intersects[0].object.isCoordinate) {
            this.domElement.style.cursor = 'pointer';
          } else {
            this.domElement.style.cursor = 'auto';
          }
        } else {
          this.domElement.style.cursor = 'auto';
        }
        return;
      }

      if (this.selected != null && this.enable && ((this.enableMoving && (this.selected.isPanel || this.selected.isCoordinate)) || (this.enableResizing && this.selected.isDimension))) {
        if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
          const roundPosition = this.roundPosition();
          // careful, position will need to be fixed (it's a threejs position)
          this.$emit('dragmove', {
            event,
            selected: this.selected,
            position: roundPosition,
            magnetism: !event.shiftKey,
          });
        }
        return;
      }

      if (intersects.length > 0) {
        const { name } = intersects[0].object;
        const objectID = name.split('_')[0];
        const intersectObj = intersects[0].object.isPhysicalGeometry ? { object: this.childObjects()[objectID], point: intersects[0].point } : intersects[0];

        if (!intersectObj && intersects.length <= 1) return;

        const { object, point } = (!intersectObj && intersects.length > 1) ? intersects[1] : intersectObj;
        // if (object.isPanel && this.selectedObject === object && this.enableMoving && !this.isDragging) {
        if (this.selectedObject3D && object.isPanel && this.enableMoving && !this.isDragging
          && (this.selectedObject3D.object3d === object
            || (() => {
              let { groupName } = window.panels[object.name];
              while (groupName) {
                if (this.selectedObject3D.object3d.name === groupName) return true;
                ({ groupName } = window.groups[groupName]);
              }
              return false;
            }))) {
          this.$emit('hovermove', object, point.clone());
        } else {
          this.$store.commit('Camera/setHoverObject3D');
        }

        this.plane.setFromNormalAndCoplanarPoint(this.cameraInst.getWorldDirection(this.plane.normal),
          this.worldPosition.setFromMatrixPosition(object.matrixWorld));

        if (this.hoveredObject !== object) {
          this.domElement.style.cursor = 'pointer';
          this.hoveredObject = object;
        }
      } else {
        this.hoveredObject = null;
        this.domElement.style.cursor = 'auto';
        this.$store.commit('Camera/setHoverObject3D');
      }
    },
    onDocumentMouseClick(event) {
      event.preventDefault();
      this.setRaycaster(event);
      this.isDragging = false;

      const intersects = this.raycaster.intersectObjects(this.objects(), true);

      if (this.enableMeasure && this.prevMousePos.distanceTo(new Vector2(event.clientX, event.clientY)) < 10) {
        this.plane.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), new Vector3(0, 0, 0));
        let rulerPoint = null;

        if (intersects.length > 0) {
          rulerPoint = intersects[0].point;
        } else if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
          rulerPoint = this.roundPosition(new Vector3(0, 0, 0));
        }

        this.$emit('rulerpoint', { event, rulerPoint });
        return;
      }
      if (this.enableShapeEdit || this.enableDrillEdit) {
        if (this.selected) {
          this.$emit('dragend', this.selected);
          this.$emit('hoveroff');
          this.selected = null;
          this.domElement.style.cursor = 'auto';
        } else if (intersects.length > 0 && this.prevMousePos.distanceTo(new Vector2(event.clientX, event.clientY)) < 10) {
          if (intersects[0].object.isShapeVertex || intersects[0].object.isDrillGeometry || intersects[0].object.isCoordinate) {
            this.plane.setFromNormalAndCoplanarPoint(this.cameraInst.getWorldDirection(this.plane.normal),
              this.worldPosition.setFromMatrixPosition(intersects[0].object.matrixWorld));

            this.$emit('dragstart', intersects[0].object);
            this.setOffset(intersects[0].object.name);

            if (intersects[0].object.isCoordinate) {
              this.selected = intersects[0].object;
              this.moveStep();
            }
          } else if (this.enableCreatePoint && (intersects[0].object.name.split('_')[0] === this.selectedObject3D.object3d.name.split('_')[0])) {
            this.$emit('createpoint', intersects[0].point);
            this.$store.commit('Panels/enableCreatePoint', false);
          } else if (this.enableCreateDrill && (intersects[0].object.name.split('_')[0] === this.selectedObject3D.object3d.name.split('_')[0])) {
            this.$emit('createdrill', intersects[0].point);
            this.$store.commit('Panels/enableCreateDrill', false);
          }
        } else if (this.prevMousePos.distanceTo(new Vector2(event.clientX, event.clientY)) < 10) {
          this.$store.commit('Panels/enableShapeEdit', false);
          this.domElement.style.cursor = 'auto';
        } else {
          this.domElement.style.cursor = 'auto';
        }
        return;
      }

      if (this.selected) { // Object was selected and it is moving or resizing
        this.resetMoveResize();
        this.$emit('dragend', this.selected);
        this.$emit('hoveroff');
        this.selected = null;

        this.domElement.style.cursor = this.hoveredObject ? 'pointer' : 'auto';
      } else if (this.prevMousePos.distanceTo(new Vector2(event.clientX, event.clientY)) < 10) { // If mouse clicked on same place
        if (intersects.length > 0) {
          const { name } = intersects[0].object;
          const objectID = name.split('_')[0];
          const intersectObj = intersects[0].object.isPhysicalGeometry ? { object: this.childObjects()[objectID], point: intersects[0].point } : intersects[0];

          if (!intersectObj) return;

          const { object } = (!intersectObj && intersects.length > 1) ? intersects[1] : intersectObj;
          this.selected = (object.isDimension || object.isCoordinate) ? object.parent : object;

          if (object.isPanel) this.selectedPanel = object;

          if (this.selectedObject3D) this.selectedObject = this.selectedObject3D.object3d;
          this.$emit('dragstart', this.selected);

          if (this.enableGroupArranger) {
            this.selected = null;
            return;
          }

          this.setOffset(this.selectedObject3D.object3d.name);

          if (this.selected.isDimension || this.selected.isCoordinate) {
            this.moveStep();
          } else if (!this.selectedObject || (!this.selectedObject.isDimension && !this.selectedObject.isCoordinate && this.selectedObject3D.object3d !== this.selectedObject)) {
            this.resetMoveResize();
            this.selectedObject = this.selected;
            this.selected = null;
          } else if (this.enableMoving) {
            this.moveStep();
          } else {
            this.selected = null;
          }
        } else {
          this.$store.commit('Camera/selectObject3D');

          this.selectedObject = null;
          this.selected = null;
        }
      }
    },
    onDocumentRightMouseClick(event) {
      event.preventDefault();

      if (this.enableMeasure) {
        if (event.type === 'keydown' || this.prevMousePos.distanceTo(new Vector2(event.clientX, event.clientY)) < 10) {
          this.$store.commit('Panels/enableMeasure', false);
          this.$store.commit('Panels/setMoveDirection');
          this.$emit('hoveroff');
          this.domElement.style.cursor = 'auto';
        }
        return;
      }
      if (this.enableShapeEdit || this.enableDrillEdit) {
        if (event.type === 'keydown' || this.prevMousePos.distanceTo(new Vector2(event.clientX, event.clientY)) < 10) {
          if (this.enableCreatePoint) {
            this.$store.commit('Panels/enableCreatePoint', false);
          } else if (this.enableCreateDrill) {
            this.$store.commit('Panels/enableCreateDrill', false);
          } else {
            this.$emit('dragcancel');
            this.$emit('hoveroff');
          }
          this.domElement.style.cursor = 'auto';
        }
        return;
      }

      if (this.selected) {
        this.$emit('dragcancel');
        this.$emit('hoveroff');
        this.selected = null;
      }

      this.isDragging = false;
      this.domElement.style.cursor = this.hoveredObject ? 'pointer' : 'auto';
    },
    onDocumentTouchMove(event) {
      event.preventDefault();

      if (event.touches.length === 1) {
        const mouseEvent = this.toTouchEvent('mousemove', event.touches.item(0));
        this.onDocumentMouseMove(mouseEvent);
      }
    },
    onDocumentTouchStart(event) {
      event.preventDefault();

      if (event.touches.length === 1) {
        this.setRaycaster(event.touches.item(0));
        const intersects = this.raycaster.intersectObjects(this.objects(), true);
        let mouseEvent;
        if (intersects.length > 0 && this.selectedObject3D) {
          mouseEvent = this.toTouchEvent('click', event.touches.item(0));
        } else {
          mouseEvent = this.toTouchEvent('mousedown', event.touches.item(0));
        }
        this.onDocumentMouseDown(mouseEvent);
        if (intersects.length > 0 && this.selectedObject3D) this.$emit('hoveron');
      }
    },
    onDocumentTouchEnd(event) {
      event.preventDefault();

      if (event.touches.length === 0) {
        const mouseEvent = this.toTouchEvent('click', event.changedTouches.item(0));
        this.onDocumentMouseClick(mouseEvent);
      }
    },
    toTouchEvent(type, touch) {
      return new MouseEvent(type, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
    },
    onDocumentKeyDown(event) {
      event.preventDefault();

      if (this.selected || this.enableMeasure || this.enableShapeEdit || this.enableDrillEdit) {
        switch (event.code) {
          case 'Escape':
            this.onDocumentRightMouseClick(event);
            break;
          case 'ArrowUp':
            this.$store.commit('Panels/setMoveDirection', 'y');
            break;
          case 'ArrowLeft':
            this.$store.commit('Panels/setMoveDirection', 'x');
            break;
          case 'ArrowRight':
            this.$store.commit('Panels/setMoveDirection', 'z');
            break;
          case 'ArrowDown':
          default:
            this.$store.commit('Panels/setMoveDirection');
        }
      } else this.$store.commit('Panels/setMoveDirection');
    },
  },
  watch: {
    enable: {
      handler(isEnable) {
        if (isEnable) this.activate();
        else this.deactivate();
      },
      immediate: true,
    },
  },
  render(h) { return this.$slots.default ? h('div', this.$slots.default) : undefined; },
};
