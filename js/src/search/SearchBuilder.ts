import * as widgets from "@jupyter-widgets/base";
import { timeout } from "d3";
import Vue from "vue";
import { IEvent } from "../Events";
import { Graph, ISearchGraphEdge, ISearchGraphNode } from "../Graph";
import { d3ForceLayout, GraphLayout, relativeLayout } from "../GraphLayout";
import SearchGraphBuilder from "./components/SearchBuilder.vue";
import SearchBuilderModel from "./SearchBuilderModel";
declare let Jupyter: any;

/**
 * Creates a view to construct a Search problem. Interfaces with Jupyter backend.
 * 
 * See the accompanying backend file: `aispace2/jupyter/search/searchbuilder.py`.
 */
export default class SearchBuilder extends widgets.DOMWidgetView {
  private static readonly SHOW_PYTHON_CODE = "python-code";

  public model: SearchBuilderModel;
  public vue: any;

  public initialize(opts: any) {
    super.initialize(opts);

    this.listenTo(this.model, "view:msg", (event: IEvent) => {
      if (event.action === SearchBuilder.SHOW_PYTHON_CODE) {
        // Replace cell contents with the code
        Jupyter.notebook.insert_cell_below().set_text((event as any).code);
      }
    });
  }

  public render() {
    const initialGraph = this.model.graph;

    timeout(() => {
      this.vue = new SearchGraphBuilder({
        data: {
          graph: initialGraph,
          showEdgeCosts: this.model.showEdgeCosts,
          showNodeHeuristics: this.model.showNodeHeuristics,
          layout: new GraphLayout(d3ForceLayout(), relativeLayout())
        },
        watch: {
          graph: {
            handler: (val: Graph, oldVal: Graph) => {
              // Creating a copy is necessary as changes are detected by reference by traitlets
              this.model.graph = Graph.fromJSON(oldVal.toJSON()) as Graph<
                ISearchGraphNode,
                ISearchGraphEdge
              >;
              this.touch();
            },
            deep: true
          }
        }
      }).$mount(this.el);
    });

    return this;
  }

  public remove() {
    if (this.vue != null) {
      this.vue.$destroy();
    }
  }
}
