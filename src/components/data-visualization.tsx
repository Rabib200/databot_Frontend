"use client";

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ScatterController,
  TooltipItem
} from 'chart.js';
import { Bar, Pie, Line, Doughnut, PolarArea, Scatter } from 'react-chartjs-2';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  ScatterController
);

export interface DataPoint {
  label: string;
  value: number;
}

export interface ChartData {
  title: string;
  description: string;
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'polarArea' | 'scatter' | 'heatmap' | 'histogram' | 'boxplot';
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[] | Array<{x: number, y: number}>;
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

interface DataVisualizationProps {
  charts: ChartData[];
}

export function DataVisualization({ charts }: DataVisualizationProps) {
  if (!charts || charts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mt-6 mb-6">
      <h3 className="text-lg font-medium">Data Visualization</h3>
      
      {charts.length === 1 ? (
        <SingleChart chart={charts[0]} />
      ) : (
        <Tabs defaultValue={`chart-0`} className="w-full">
          <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${Math.min(charts.length, 4)}, 1fr)` }}>
            {charts.map((chart, index) => (
              <TabsTrigger key={index} value={`chart-${index}`}>
                {chart.title}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {charts.map((chart, index) => (
            <TabsContent key={index} value={`chart-${index}`}>
              <SingleChart chart={chart} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

function SingleChart({ chart }: { chart: ChartData }) {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: chart.title,
      },
    },
    maintainAspectRatio: false,
  };

  const chartData = {
    labels: chart.labels,
    datasets: chart.datasets,
  };

  const renderChart = () => {
    switch (chart.type) {
      case 'bar':
        return <Bar options={options} data={chartData} height={300} />;
      case 'line':
        return <Line options={options} data={chartData} height={300} />;
      case 'pie':
        return <Pie options={options} data={chartData} height={300} />;
      case 'doughnut':
        return <Doughnut options={options} data={chartData} height={300} />;
      case 'polarArea':
        return <PolarArea options={options} data={chartData} height={300} />;
      case 'scatter':
        return <Scatter options={options} data={chartData} height={300} />;
      case 'histogram':
        // For histogram, we'll use a bar chart with special configurations
        const histogramOptions = {
          ...options,
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Frequency' }
            },
            x: {
              title: { display: true, text: 'Value' }
            }
          }
        };
        return <Bar options={histogramOptions} data={chartData} height={300} />;
      case 'heatmap':
        // For heatmap, we'll use a specialized configuration of a bar chart
        const heatmapOptions = {
          ...options,
          plugins: {
            ...options.plugins,
            tooltip: {
              callbacks: {
                label: function(tooltipItem: TooltipItem<'bar'>) {
                  return `Value: ${tooltipItem.raw}`;
                }
              }
            }
          }
        };
        return <Bar options={heatmapOptions} data={chartData} height={300} />;
      case 'boxplot':
        // For boxplot, use a bar chart with specialized styling
        return <Bar options={options} data={chartData} height={300} />;
      //   return <BoxPlot options={options} data={chartData} height={300} />;
      default:
        return <Bar options={options} data={chartData} height={300} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{chart.title}</CardTitle>
        <CardDescription>{chart.description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[350px]">
        {renderChart()}
      </CardContent>
    </Card>
  );
}

// Helper function to convert AI response with chart data into visualization-ready format
export function parseChartDataFromResponse(analysisText: string): ChartData[] {
  // Look for JSON chart data in the response
  const chartDataRegex = /```chart-data\n([\s\S]*?)\n```/g;
  const matches = [...analysisText.matchAll(chartDataRegex)];
  
  if (matches.length === 0) {
    return [];
  }

  return matches.map(match => {
    try {
      return JSON.parse(match[1]) as ChartData;
    } catch (err) {
      console.error('Failed to parse chart data:', err);
      return null;
    }
  }).filter((chart): chart is ChartData => chart !== null);
}
