import * as widgets from "@jupyter-widgets/base";
import * as Analytics from "../Analytics";
import { IEvent } from "../Events";
import { deserializeGraph, Graph, IGraphJSON, serializeGraph } from "../Graph";

/**
 * The model that receives messages and synced traitlets from the backend.
 * See the accompanying backend file: `aispace2/jupyter/csp/csp.py`
 */
export default class CSPViewerModel extends widgets.DOMWidgetModel {
  public static serializers = Object.assign(
    {
      graph: {
        serialize: serializeGraph,
        deserialize: deserializeGraph
      }
    },
    widgets.DOMWidgetModel.serializers
  );

  public defaults() {
    return {
      ...super.defaults(),
      _model_module: "aispace2",
      _model_module_version: "0.1.0",
      _model_name: "CSPViewerModel",
      _view_module: "aispace2",
      _view_module_version: "0.1.0",
      _view_name: "CSPViewer",
      _previously_rendered: false
    };
  }

  public initialize(attrs: any, opts: any) {
    super.initialize(attrs, opts);

    Analytics.trackApplet("csp");

    // Forward message to views
    this.listenTo(this, "msg:custom", (event: IEvent) => {
      // We don't register a listener for Python messages (which go to the model) in the view,
      // because each new view would attach a new listener.
      // Instead, we register it once here, and broadcast it to views.
      this.trigger("view:msg", event);
    });
  }

  /** True if this model has not been rendered in any cell yet.
   *
   * This is used to work around timing issues: when the model is initialized,
   * the views may not be created, so sending a re-render message (to trigger the initial state)
   * doesn't work. Neither does sending a message from Python, for the same reason.
   * Instead, check if a view has rendered this model yet. If not, render the initial state.
   */
  get previouslyRendered(): boolean {
    return this.get("_previously_rendered");
  }

  /** The base line width of the edges to draw. Bold arcs will be several pixels thicker than this. */
  get lineWidth(): number {
    return this.get("line_width");
  }

  /** The Graph representing the CSP problem. */
  get graph(): Graph {
    return this.get("graph");
  }
}
