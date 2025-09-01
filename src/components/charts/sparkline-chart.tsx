"use client"

import * as React from "react"
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts"

import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

export function SparklineChart({ data, dataKey, color }: { data: any[], dataKey: string, color: string }) {
  const chartConfig = {
    [dataKey]: {
      label: dataKey,
      color: color,
    },
  }

  return (
    <ChartContainer config={chartConfig} className="h-[32px] w-[80px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 4,
            right: 0,
            left: 0,
            bottom: 4,
          }}
        >
          <defs>
              <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
              </linearGradient>
          </defs>
          <Tooltip
            cursor={{
                stroke: "hsl(var(--border))",
                strokeWidth: 1,
            }}
            content={<ChartTooltipContent hideLabel indicator="line" />}
          />
          <Area
            dataKey={dataKey}
            type="natural"
            fill={`url(#fill-${dataKey})`}
            stroke={color}
            stackId="a"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
