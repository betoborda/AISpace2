<template>
  <div class="graph-container">
    <svg tabindex="0" ref="svg" :width="width" :height="height"
         @mousemove="dragNode"
         @mouseleave="dragNodeEnd"
         @keydown.delete="$emit('delete')"
         @dblclick="onDblClick">
      <EdgeContainer v-for="edge in graph.edges" :key="edge.id"
                     :transitions="transitionsAllowed && transitions"
                     @mouseover="edgeMouseOver(edge)"
                     @mouseout="edgeMouseOut(edge)"
                     @click="$emit('click:edge', edge)">
        <slot name="edge" :edge="edge"
              :x1="edge.source.x" :y1="edge.source.y"
              :x2="edge.target.x" :y2="edge.target.y"
              :hover="edge === edgeHovered"></slot>
      </EdgeContainer>
      <GraphNodeContainer v-for="node in nodes" :key="node.id"
                 :x="node.x" :y="node.y"
                 :transitions="transitionsAllowed && transitions"                 
                 @click="$emit('click:node', node)"
                 @dragstart="dragNodeStart(node, $event)" @dragend="dragNodeEnd"
                 @mouseover="nodeMouseOver(node)" @mouseout="nodeMouseOut(node)"
                 @canTransition="toggleTransition">
        <slot name="node" :node="node" :hover="node === nodeHovered"></slot>
      </GraphNodeContainer>
    </svg>
    <!-- Resize handle -->
    <div class="handle" ref="handle"></div>
  </div>
</template>

<script lang="ts">
import { debounce } from "underscore";
import Vue, { ComponentOptions } from "vue";
import Component from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";

import GraphNodeContainer from "./GraphNodeContainer.vue";
import EdgeContainer from "./EdgeContainer.vue";

import { Graph, IGraphNode, IGraphEdge } from "../Graph";
import { GraphLayout } from "../GraphLayout";

/**
 * Base class for all graph visualizers.
 *
 * This component handles rendering nodes and edges, handling drag and hover behaviours,
 * and propagating some events up to the parent. It provides slots to customize
 * how nodes and edges are displayed.
 * 
 * For nodes in the slot with name "node", it passes the following down as props:
 * {
 *   node: IGraphNode, // The node being rendered
 *   hover: boolean // True if the node is being hovered over
 * }
 * 
 * For edges in the slot with name "edge", it passes the following down as props:
 * {
 *   edge: IGraphEdge, // The edge being rendered,
 *   hover: boolean, // True if the edge is being hovered over
 *   x1, y1, x2, y2: number // The center coordinates of the source and target of the edge
 * }
 * 
 * Events Emitted:
 * - 'dblclick': The user has double-clicked on the graph. Arguments passed: x, y, MouseEvent
 * - 'delete': The user has pressed 'Delete' or 'Backspace' while the graph is focused.
 * - 'click:node': A node has been clicked. Passes the node as the first argument.
 * - 'click:edge': An edge has been clicked. Passes the edge as the first argument.
 */
@Component({
  components: {
    GraphNodeContainer,
    EdgeContainer
  }
})
export default class GraphVisualizeBase extends Vue {
  /** The graph to render. */
  @Prop({ type: Object })
  graph: Graph;
  /** If true, animates positional changes and other properties of the nodes/edges in this graph. */
  @Prop({ default: false })
  transitions: boolean;
  /** Layout object that controls where nodes are drawn. */
  @Prop({ type: Object })
  layout: GraphLayout;

  /** The node or edge currently being dragged. */
  dragTarget: IGraphNode | IGraphEdge | null = null;
  /** The edge being hovered over. */
  edgeHovered: IGraphEdge | null = null;
  /** The node being hovered over. */
  nodeHovered: IGraphNode | null = null;
  /** Tracks the pageX of the previous MouseEvent. Used to compute the delta mouse position. */
  prevPageX = 0;
  /** Tracks the pageY of the previous MouseEvent. Used to compute the delta mouse position. */
  prevPageY: number | null = 0;
  /** True if transitions are allowed. Disable e.g. when nodes are dragged and you don't want transitions. */
  transitionsAllowed = true;
  /** The width of the SVG. Automatically set to width of container. */
  width = 0;
  /** The height of the SVG. Automatically set to height of container. */

  height = 0;

  $refs: {
    /** The SVG element that the graph is drawn in. */
    svg: SVGElement;
    /** The div element representing a resize handle. */
    handle: HTMLDivElement;
  };

  created() {
    this.graph = this.graph;
    this.handleResize = debounce(this.handleResize, 300);
  }

  mounted() {
    this.width = this.$el.getBoundingClientRect().width;
    this.height = this.width / 1.8;
    this.layout.setup(this.graph, { width: this.width, height: this.height });

    // Disable animations for the first draw, because otherwise they fly in from (0, 0) and it looks weird
    this.transitionsAllowed = false;
    Vue.nextTick(() => (this.transitionsAllowed = true));

    window.addEventListener("resize", this.handleResize);

    // Custom resize handling. In the future, we could switch to using CSS resize.
    // However, it is not support in IE/Edge right now, and Safari does not emit any resize events,
    // even with a ResizeObserver polyfill.
    let initialiseResize = (e: Event) => {
      e.preventDefault();
      window.addEventListener("mousemove", startResizing, false);
      window.addEventListener("mouseup", stopResizing, false);
    };

    this.$refs.handle.addEventListener("mousedown", initialiseResize, false);

    let startResizing = (e: MouseEvent) => {
      e.preventDefault();

      // Everything below can be replaced with:
      // this.width.x += e.movementX;
      // this.height.y += e.movementY;
      // if we don't want to support IE11.
      this.height += this.prevPageY ? e.pageY - this.prevPageY : 0;
      this.prevPageY = e.pageY;
      this.handleResize();
    };

    let stopResizing = (e: MouseEvent) => {
      window.removeEventListener("mousemove", startResizing, false);
      window.removeEventListener("mouseup", stopResizing, false);
      this.prevPageY = null;
    };
  }

  beforeDestroy() {
    window.removeEventListener("resize", this.handleResize);
  }

  /** Re-layout the graph using the current width/height of the SVG. */
  handleResize() {
    this.width = this.$el.getBoundingClientRect().width;
    this.layout.relayout(this.graph, {
      width: this.width,
      height: this.height
    });
  }

  get nodes() {
    if (this.dragTarget != null) {
      // Move the node being dragged to the top, so it appears over everything else
      const i = this.graph.nodes.indexOf(this.dragTarget as IGraphNode);
      if (i !== -1) {
        // Move element at index i to the back of the array
        this.graph.nodes.push(this.graph.nodes.splice(i, 1)[0]);
      }
    }

    return this.graph.nodes;
  }

  dragNodeStart(node: IGraphNode) {
    this.dragTarget = node;
  }

  dragNode(e: MouseEvent) {
    if (this.dragTarget) {
      var svgBounds = this.$refs.svg.getBoundingClientRect();

      // Everything below can be replaced with:
      // this.dragTarget.x += e.movementX;
      // this.dragTarget.y += e.movementY;
      // if we don't want to support IE11.
      this.dragTarget.x += this.prevPageX ? e.pageX - this.prevPageX : 0;
      this.dragTarget.y += this.prevPageY ? e.pageY - this.prevPageY : 0;

      this.prevPageX = e.pageX;
      this.prevPageY = e.pageY;
    }
  }

  dragNodeEnd() {
    this.dragTarget = null;
    this.transitionsAllowed = true;
    this.prevPageX = 0;
    this.prevPageY = 0;
  }

  edgeMouseOver(edge: IGraphEdge) {
    this.edgeHovered = edge;
  }

  edgeMouseOut(edge: IGraphEdge) {
    this.edgeHovered = null;
  }

  nodeMouseOver(node: IGraphNode) {
    this.nodeHovered = node;
  }

  nodeMouseOut(node: IGraphNode) {
    this.nodeHovered = null;
  }

  /**
   * Handles the user double-clicking on the graph.
   * The x and y position within the SVG are calculated and passed to the event.
   */
  onDblClick(e: MouseEvent) {
    var svgBounds = this.$refs.svg.getBoundingClientRect();
    var x = e.pageX - svgBounds.left;
    var y = e.pageY - svgBounds.top;
    this.$emit("dblclick", x, y, e);
  }

  /**
   * Toggles transitions on and off.
   * 
   * For example, when nodes are being dragged,
   * we want to disable transitions on nodes and edges so their positions don't lag the mouse.
   */
  toggleTransition(allowed: boolean) {
    this.transitionsAllowed = allowed;
  }

  @Watch("graph")
  onGraphChanged(newVal: Graph) {
    // Whenever nodes or edges are added, re-layout the graph
    this.layout.relayout(this.graph, {
      width: this.width,
      height: this.height
    });
  }
}

</script>

<style scoped>
.graph-container {
    border: 1px solid gray;
    overflow: hidden;
    position: relative;
    margin-bottom: 10px;
}

svg {
    display: block;
}

svg:focus {
    outline: none;
}

.handle {
    background-color: #727272;
    width: 10px;
    height: 10px;
    cursor: ns-resize;
    position: absolute;
    right: 0;
    bottom: 0;
}
</style>
