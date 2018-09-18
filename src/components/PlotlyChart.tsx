// Taken from https://github.com/davidctj/react-plotlyjs-ts/blob/master/src/index.tsx
// Defining it custom here so we can define a deselect event
import * as plotly from 'plotly.js';
import * as React from 'react';

export interface IPlotlyChartProps {
  config?: any;
  data: any;
  layout?: any;
  onClick?: (event: plotly.PlotMouseEvent) => void;
  onBeforeHover?: (event: plotly.PlotMouseEvent) => void;
  onHover?: (event: plotly.PlotMouseEvent) => void;
  onUnHover?: (event: plotly.PlotMouseEvent) => void;
  onSelected?: (event: plotly.PlotSelectionEvent) => void;
  onDeselect?: () => void;
}

/***
 * Usage:
 *  <PlotlyChart data={toJS(this.model_data)}
 *               layout={layout}
 *               onClick={({points, event}) => console.log(points, event)}>
 */
class PlotlyChart extends React.Component<IPlotlyChartProps, any> {
  public container: plotly.PlotlyHTMLElement | null = null;

  public attachListeners() {
    if (this.props.onClick) {
      this.container!.on('plotly_click', this.props.onClick);
    }
    if (this.props.onHover) {
      this.container!.on('plotly_hover', this.props.onHover);
    }
    if (this.props.onUnHover) {
      this.container!.on('plotly_unhover', this.props.onUnHover);
    }
    if (this.props.onSelected) {
      this.container!.on('plotly_selected', this.props.onSelected);
    }
    if (this.props.onDeselect) {
      this.container!.on('plotly_deselect', this.props.onDeselect);
    }
    window.addEventListener('resize', this.resize);
  }

  public resize = () => {
    if (this.container) {
      plotly.Plots.resize(this.container);
    }
  };

  public draw = async (props: IPlotlyChartProps) => {
    const { data, layout, config } = props;
    if (this.container) {
      // plotly.react will not destroy the old plot: https://plot.ly/javascript/plotlyjs-function-reference/#plotlyreact
      this.container = await plotly.react(this.container, data, Object.assign({}, layout), config);
    }
  };

  public componentWillReceiveProps(nextProps: IPlotlyChartProps) {
    this.draw(nextProps);
  }

  public componentDidMount() {
    this.draw(this.props);
  }

  public componentWillUnmount() {
    if (this.container) {
      plotly.purge(this.container);
    }
    window.removeEventListener('resize', this.resize);
  }

  public render() {
    const { data, layout, config, onClick, onHover, onSelected, onDeselect, onUnHover, ...other } = this.props;
    return (
      <div
        {...other}
        ref={async node => {
          if (node && !this.container) {
            this.container = await plotly.newPlot(node, data as any, Object.assign({}, layout), config);
            this.attachListeners();
          }
        }}
      />
    );
  }
}

export default PlotlyChart;
