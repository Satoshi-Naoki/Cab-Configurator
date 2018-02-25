<!--suppress HtmlUnknownTag -->
<template>
  <vgl-group :rotation="boxRotation" :name="id + '_group'" :visible="visible">
    <vgl-box-geometry :name="id + '_geometry'"
                      ref="geometry"
                      :width-segments="1"
                      :height-segments="1"
                      :depth-segments="1"
                      :width="isDoorPanel ? realDimensionByType.width : dimensionsByType.width"
                      :height="isDoorPanel ? realDimensionByType.height : dimensionsByType.height"
                      :depth="isHDFPanel ? 0.1 : (isDoorPanel ? realDimensionByType.depth : dimensionsByType.depth)" />
    <vgl-mesh ref='panel'
              :geometry="id + '_geometry'"
              :material="materials"
              :rotation="boxRotation"
              :position="`${fixedPosition.x} ${fixedPosition.y} ${fixedPosition.z}`"
              :name="id"
              :visible="!customGeometry" />

    <!-- VDPwithPoints(Shape Panel) -->
    <div v-if="customGeometry">
      <component :is="customGeometry" v-bind="customGeometryBinding" />
      <vgl-mesh ref='leftPhysicalGeometry'
                :geometry="id + '_physicalGeometry'"
                :material="materials"
                :rotation="shapeSideRotation"
                :position="`${fixedPosition.x - dimensionsByType.width / 2} ${fixedPosition.y} ${fixedPosition.z}`"
                :name="id + '_left_physicalGeometry'" />
      <vgl-mesh ref='rightPhysicalGeometry'
                :geometry="id + '_physicalGeometry'"
                :material="materials"
                :rotation="shapeSideRotation"
                :position="`${fixedPosition.x + dimensionsByType.width / 2} ${fixedPosition.y} ${fixedPosition.z}`"
                :name="id + '_right_physicalGeometry'" />
      <div v-for="(height, index) in shapeHeights" :key="`${id}_${index}_physicalGeometry`">
        <vgl-plane-geometry :width="dimensionsByType.width"
                            :height="height"
                            :name="`${id}_${index}_physicalGeometry`" />
        <vgl-mesh :ref="`${index}_physicalGeometry`"
                  :geometry="`${id}_${index}_physicalGeometry`"
                  :material="materials[index + 1]"
                  :rotation="shapeRotations[index]"
                  :position="`${shapePositions[index].x} ${shapePositions[index].y} ${shapePositions[index].z}`"
                  :name="`${id}_${index}_physicalGeometry`" />
        <vgl-box-helper :object="`${id}_${index}_physicalGeometry`" color="#666666"/>
      </div>
    </div>
    <!-------------------------------->

    <!-- HDFPanel -->
    <vgl-group v-if="customGeometry == null && isHDFPanel">
       <!-- Magnetic Panel -->
      <vgl-box-geometry :name="id + '_boundingBox'"
                        :width-segments="1"
                        :height-segments="1"
                        :depth-segments="1"
                        :width="dimensionsByType.width"
                        :height="dimensionsByType.height"
                        :depth="dimensionsByType.depth + 5" />
      <vgl-mesh :geometry="id + '_boundingBox'"
                :material="physicalPanelMaterials"
                :position="`${fixedPosition.x} ${fixedPosition.y} ${fixedPosition.z}`"
                :name="id + '_boundingBox'"
                :visible="false" />
      <!-- Physical Panel -->
      <vgl-box-geometry :name="id + '_physicalGeometry'"
                        :width-segments="1"
                        :height-segments="1"
                        :depth-segments="1"
                        :width="hdfPhysicalDimensions.width"
                        :height="hdfPhysicalDimensions.height"
                        :depth="hdfPhysicalDimensions.depth" />
      <vgl-mesh :geometry="id + '_physicalGeometry'"
                ref='physicalGeometry'
                :material="physicalPanelMaterials"
                :position="`${hdfPhysicalPosition.x} ${hdfPhysicalPosition.y} ${hdfPhysicalPosition.z}`"
                :name="id + '_physicalGeometry'" />
    </vgl-group>
    <!------------->

    <!-- DoorPanel -->
    <vgl-group v-else-if="customGeometry == null && isDoorPanel">
       <!-- Magnetic Panel -->
      <vgl-box-geometry :name="id + '_boundingBox'"
                        :width-segments="1"
                        :height-segments="1"
                        :depth-segments="1"
                        :width="dimensionsByType.width"
                        :height="dimensionsByType.height"
                        :depth="dimensionsByType.depth" />
      <vgl-mesh ref="magneticBoundingBox"
                :geometry="id + '_boundingBox'"
                :material="physicalPanelMaterials"
                :position="`${fixedPosition.x} ${fixedPosition.y} ${fixedPosition.z}`"
                :name="id + '_boundingBox'"
                :visible="false" />
    </vgl-group>
    <!--------------->

    <PlankVertices ref="vertices" :plank-position.sync="fixedPosition" :plank-dimension="dimensionsByType" :plank-name="id" :plank-type="ptype"/>
    <PlankStickers :plank-position="position" :plank-dimension="dimensionsByType" :plank-name="id" :plank-type="ptype" v-if="showStickers"/>
    <PlankExcentrique :plank-position="position" :plank-dimension="dimensionsByType" :plank-i-d="id" :plank-type="ptype" :connections="relatedConnections" v-if="showConnections" />
    <PlankEdges :plank-dimension="dimensionsByType" :plank-position="fixedPosition" :plank-type="ptype" :plank-edges.sync="edges" :plank-points.sync="shapePoints" v-if="showEdgesSelector"/>
    <PlankCoordinate ref="coordinate" :plank-dimension.sync="dimensionsByType" :plank-position.sync="fixedPosition" :plank-type="ptype" :plank-name="id" v-if="showCoordinateArrows" />
    <PlankDimensions ref="dimensions" :plank-dimension.sync="dimensionsByType" :plank-position.sync="fixedPosition" :plank-type="ptype" :plank-name="id" :plank-points.sync="shapePoints" v-if="showDimensionArrows" />
    <PlankConnections ref="connections" :plank-position="fixedPosition" :plank-i-d="id" :connections="relatedConnections" v-if="showConnections" />
    <component v-if="pluginComponent" :is="pluginComponent" v-bind="pluginBinding"/>

    <!-- Bounding Box for Magnetic Panel of DoorPanel -->
    <vgl-box-helper v-else-if="isDoorPanel" :object="id" color="#cccccc"/>
    <!-- Bounding Box for Magnetic Panel of HDFPanel -->
    <vgl-box-helper v-else-if="isHDFPanel" :object="id + '_boundingBox'" color="#3C3C3C"/>
    <!-- Bounding Box for Physical Panel -->
    <vgl-box-helper v-else :object="id" color="#3C3C3C"/>

    <!-- Bounding Box for Physical Panel of DoorPanel-->
    <vgl-box-helper v-if="isDoorPanel" :object="id + '_boundingBox'" color="#666666"/>
  </vgl-group>
</template>

<script>
import { Vector2, Vector3, Box3 } from 'three';
import { mapGetters, mapState } from 'vuex';
import PlankVertices from '../Plugins/PlankVertices';
import PlankStickers from '../Plugins/PlankStickers';
import PlankEdges from '../Plugins/PlankEdges';
import PlankCoordinate from '../Plugins/PlankCoordinate';
import PlankDimensions from '../Plugins/PlankDimensions';
import PlankConnections from '../Plugins/PlankConnections';
import PlankExcentrique from '../Plugins/PlankExcentrique';

export default {
  name: 'PlankMesh',
  components: {
    PlankExcentrique,
    PlankConnections,
    PlankCoordinate,
    PlankDimensions,
    PlankEdges,
    PlankStickers,
    PlankVertices,
  },
  inject: ['vglNamespace'],
  props: {
    pos: {
      type: Array,
      required: true,
    },
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    material: {
      type: String,
      default: '1',
    },
    rotation: {
      type: Object,
      default: () => ({ x: 0, y: 0, z: 0 }),
    },
    x: {
      type: Number,
      required: true,
    },
    y: {
      type: Number,
      required: true,
    },
    thick: {
      type: Number,
      required: true,
    },
    ptype: {
      type: String,
      default: 'FP',
    },
    layer: {
      type: String,
      default: 'Structure',
    },
    points: {
      type: Array,
      required: false,
    },
    groupName: {
      type: String,
      required: false,
    },
    groupType: {
      type: String,
      required: false,
    },
    visible: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      moving: false,
      collide: false,
      prevType: null,
    };
  },
  computed: {
    ...mapGetters('DisplayManager', [
      'isItemDisplayed',
    ]),
    ...mapState('Camera', [
      'selectedObject3D',
      'hoveredObject3D',
    ]),
    ...mapState('Panels', [
      'connections',
      'enableResizing',
      'enableMoving',
    ]),
    relatedConnections() {
      return this.connections.filter(c => c.containsPanel(this.id));
    },
    isSelected() {
      if (this.selectedObject3D && this.selectedObject3D.object3d) return this.selectedObject3D.object3d.name.split('_').includes(this.id.toString());
      return false;
    },
    showStickers() {
      return this.isItemDisplayed('stickers');
    },
    showConnections() {
      return this.isItemDisplayed('connections');
    },
    showEdgesSelector() {
      return this.isSelected && this.isItemDisplayed('edges-selector');
    },
    showCoordinateArrows() {
      return this.isSelected && this.isItemDisplayed('dimension-arrows') && this.enableMoving;
    },
    showDimensionArrows() {
      return this.isSelected && this.isItemDisplayed('dimension-arrows') && this.enableResizing;
    },
    dimension: {
      get() {
        return {
          x: this.x * 10.0,
          y: this.y * 10.0,
          thick: this.thick * 10.0,
        };
      },
      set({ x, y, thick }) {
        if (x !== this.dimension.x) this.$emit('update:x', x / 10.0);
        if (y !== this.dimension.y) this.$emit('update:y', y / 10.0);
        if (thick !== this.dimension.thick) this.$emit('update:thick', thick / 10.0);
      },
    },
    position: {
      get() {
        const [x, y, z] = this.pos.map(p => p * 10.0);
        return { x: y, y: z, z: x };
      },
      set({ x, y, z }) {
        this.$emit('update:pos', [z / 10.0, x / 10.0, y / 10.0]);
      },
    },
    edges: {
      get() { return this.$attrs.edges; },
      set(val) { this.$emit('update:edges', val); },
    },
    dimensionsByType() {
      return {};
    },
    shapePoints: {
      get() {
        return this.points;
      },
      set(val) { this.$emit('update:points', val); },
    },
    fixedPosition: {
      get() {
        return new Vector3(
          this.position.x + (this.dimensionsByType.width / 2),
          this.position.y + (this.dimensionsByType.height / 2),
          this.position.z + (this.dimensionsByType.depth / 2),
        );
      },
      set({ x, y, z }) {
        this.position = {
          x: x - (this.dimensionsByType.width / 2),
          y: y - (this.dimensionsByType.height / 2),
          z: z - (this.dimensionsByType.depth / 2),
        };
      },
    },
    boxRotation() {
      return `${this.rotation.x} ${this.rotation.y} ${this.rotation.z}`;
    },
    physicalPanelMaterials() {
      if (!this.edges) return null;
      const formattedEdges = this.edges.split('-').map(edge => !!parseInt(edge, 10));
      if (this.collide) return 'red';
      return [
        formattedEdges[1] ? this.material.toString() : 'raw',
        formattedEdges[3] ? this.material.toString() : 'raw',
        formattedEdges[2] ? this.material.toString() : 'raw',
        formattedEdges[0] ? this.material.toString() : 'raw',
        this.isSelected ? 'selected' : this.material.toString(),
        this.isSelected ? 'selected' : 'raw',
      ];
    },
    materials() {
      return [];
    },
    pluginComponent() {
      return null;
    },
    pluginBinding() {
      return [];
    },
    customGeometry() {
      return null;
    },
    isHDFPanel() {
      return false;
    },
    isDoorPanel() {
      return false;
    },
    customGeometryBinding() {
      return [];
    },
  },
  created() {
    window.panels[this.id] = this;
  },
  updated() {
    if (this.prevType !== this.ptype || this.isSelected) {
      const self = this;
      this.$nextTick(() => self.updateColliding(true));
    }
    this.prevType = this.ptype;
  },
  beforeDestroy() {
    // eslint-disable-next-line no-underscore-dangle
    if (window.panels[this.id]._uid === this._uid) delete window.panels[this.id];
  },
  mounted() {
    this.setAsPanel();
    this.$emit('ready');
  },
  methods: {
    magnetize(translationVector) {
      this.setNewPosition(this.fixedPosition.add(translationVector));
    },
    setAsPanel() {
      // add in ThreeJS object a tag to identify the mesh as a Panel
      this.$refs.panel.inst.isPanel = true;
      if (this.$refs.physicalGeometry) this.$refs.physicalGeometry.inst.isPhysicalGeometry = true;
    },
    getAllPlanksInWorld() {
      const { vglNamespace, id } = this;
      // filter pour garder que les mesh, tous les objets sauf le courant (attention, les stickers et autres mesh ne sont pas exclu)
      return Object.values(vglNamespace.object3ds)
        .filter(obj3D => (obj3D.isMesh === true && obj3D.name !== id && obj3D.isPanel));
    },
    intersects(object) {
      // check intersection of object or current if no args
      // should use window.panels instead
      const { vglNamespace: { object3ds }, id } = this;
      const currentBoundingBox = new Box3();
      currentBoundingBox.setFromObject(object || object3ds[id]);
      const planks = Object.values(object3ds).filter(o => o.isPanel && o.name !== id);

      return planks
        .filter((mesh) => {
          const meshBB = new Box3();
          meshBB.setFromObject(mesh);
          return currentBoundingBox.intersectsBox(meshBB) === true;
        });
    },
    getSideCollide() {
      this.resetColide();
      const currentBoundingBox = new Box3();
      currentBoundingBox.setFromObject(this.vglNamespace.object3ds[this.id]);

      this.intersects().forEach((mesh) => {
        this.getSideCollideWithMesh(currentBoundingBox, mesh);
      });

      return this.collide;
    },
    getSideCollideWithMesh(currentBoundingBox, mesh) {
      mesh.geometry.computeBoundingBox();
      const meshBB = new Box3();
      meshBB.setFromObject(mesh);
      this.collide.left = this.collide.left || !currentBoundingBox.clone().translate(new Vector3(1, 0, 0)).intersectsBox(meshBB);
      this.collide.right = this.collide.right || !currentBoundingBox.clone().translate(new Vector3(-1, 0, 0)).intersectsBox(meshBB);
      this.collide.upper = this.collide.upper || !currentBoundingBox.clone().translate(new Vector3(0, -1, 0)).intersectsBox(meshBB);
      this.collide.lower = this.collide.lower || !currentBoundingBox.clone().translate(new Vector3(0, 1, 0)).intersectsBox(meshBB);
      this.collide.front = this.collide.front || !currentBoundingBox.clone().translate(new Vector3(0, 0, -1)).intersectsBox(meshBB);
      this.collide.back = this.collide.back || !currentBoundingBox.clone().translate(new Vector3(0, 0, 1)).intersectsBox(meshBB);
    },
    resetCollide() {
      // eslint-disable-next-line no-return-assign
      Object.keys(this.collide).forEach(k => (this.collide[k] = false));
    },
    setNewPosition(position) {
      // unfix origin position
      this.fixedPosition = position;
    },
    move(event, position, mesh, magnetism) {
      this.collide = false;

      const mouseScreenPoint = new Vector2();
      const rect = this.vglNamespace.renderers[0].inst.domElement.getBoundingClientRect();
      mouseScreenPoint.x = event.clientX - rect.left;
      mouseScreenPoint.y = event.clientY - rect.top;

      if (mesh.isDimension || mesh.isCoordinate) {
        if (!this.moving) this.$store.dispatch('Panels/deletePanelConnections', { id: this.id });
        this.moving = true;

        const closestVertex = this.$refs.vertices.getNearestVerticeInWorld(mouseScreenPoint);

        this.resize(mesh, position, closestVertex ? closestVertex.vertex.position : false, magnetism);
      } else if (mesh.isPanel) {
        if (!this.moving) this.$store.dispatch('Panels/deletePanelConnections', { id: this.id });
        this.moving = true;

        if (magnetism) {
          /** MAGNETISM */
          this.$refs.vertices.showNearestVertices(mouseScreenPoint);

          const closestVertex = this.$refs.vertices.closestVisibleVertex(mouseScreenPoint);
          if (closestVertex && this.$refs.vertices.magnetize(closestVertex.vertex, mouseScreenPoint)) return;
        } else {
          this.$refs.vertices.resetAllVerticesVisibility();
        }

        const newOrigin = this.fixedPosition.clone();
        newOrigin.setX(position.x);
        newOrigin.setY(position.y);
        newOrigin.setZ(position.z);
        this.setNewPosition(newOrigin);
      }
    },
    resize(mesh, position, newVector, magnetism) {
      if (mesh.isDimension) this.$refs.dimensions.resize(mesh.name, position, newVector, magnetism);
      else this.$refs.coordinate.resize(mesh.name, position, newVector, magnetism);
    },
    select(isSelected) {
      const { object3d } = this.hoveredObject3D ? this.hoveredObject3D : this.selectedObject3D || {};
      if (!object3d) {
        // nothing selected.. unselect just in case
        this.$refs.vertices.resetAllVerticesVisibility();
        this.moving = false;
      } else if (object3d.isPanel) {
        if (isSelected) {
          const mouseScreenPoint = new Vector2();
          const rect = this.vglNamespace.renderers[0].inst.domElement.getBoundingClientRect();
          mouseScreenPoint.x = window.event.clientX - rect.left;
          mouseScreenPoint.y = window.event.clientY - rect.top;

          this.$refs.vertices.setNearestVerticeVisible(this.hoveredObject3D);
        } else if (!this.groupName || !window.groups[this.groupName].isSelected) {
          this.$refs.vertices.resetVerticesVisibility();
          this.moving = false;
        }
      } else {
        this.$refs.vertices.resetVerticesVisibility();
        this.moving = false;
      }
    },
    setDragging(isSelected) {
      if (!isSelected) this.$refs.vertices.resetAllVerticesVisibility();
      if (this.selectedObject3D.object3d.isCoordinate && isSelected) this.$refs.coordinate.select(this.selectedObject3D.object3d);
      else if (this.selectedObject3D.object3d.isDimension && isSelected) this.$refs.dimensions.select(this.selectedObject3D.object3d);
      else if (this.selectedObject3D.object3d.isCoordinate) this.$refs.coordinate.select(null);
      else if (this.selectedObject3D.object3d.isDimension) this.$refs.dimensions.select(null);
    },
    setCollide(value) {
      this.collide = value;
    },
    getCollide() {
      return this.collide;
    },
    updateColliding(checkOthers = false) {
      const { [this.id]: current, ...others } = window.panels;
      const currentBox = new Box3();
      currentBox.setFromObject(this.$refs.panel.inst);
      this.collide = Object.values(others)
        .filter(c => c != null)
        .reduce((isColliding, c) => {
          const { inst } = c.$refs.panel;
          const box = new Box3();
          box.setFromObject(inst);
          if (currentBox.intersectsBox(box)) {
            const size = new Vector3();
            currentBox.clone().intersect(box.clone()).getSize(size);
            const isBoxCollide = !Object.values(size).includes(0);
            if (isBoxCollide) window.panels[inst.name].setCollide(isBoxCollide);
            if (window.panels[inst.name].getCollide() && checkOthers) window.panels[inst.name].updateColliding();
            return isColliding || isBoxCollide;
          }
          if (window.panels[inst.name].getCollide() && checkOthers) window.panels[inst.name].updateColliding();
          return isColliding;
        }, false);
    },
  },
  watch: {
    moving(isMoving, wasMoving) {
      if (isMoving && !wasMoving) {
        if (this.relatedConnections.length) this.$store.dispatch('Panels/deletePanelConnections', { id: this.id });
      }
    },
    ptype(newType, oldType) {
      if (newType !== oldType) {
        this.$store.dispatch('Panels/deletePanelConnections', { id: this.id });
      }
    },
    selectedObject3D: {
      handler() {
        this.select(this.isSelected);
      },
    },
    hoveredObject3D: {
      handler() {
        this.select(this.isSelected);
      },
    },
  },
};
</script>