
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  total: {
    label: "Total de Questões",
    color: "hsl(var(--chart-1))",
  },
} satisfies import("@/components/ui/chart").ChartConfig

export function DisciplineChart({ data }: { data: {name: string, total: number}[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Disciplina</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart 
                data={data} 
                layout="vertical" 
                margin={{ left: 10, right: 10 }}
                width={500} // Set a width to avoid ResponsiveContainer
                height={250} // Set a height
            >
                <CartesianGrid horizontal={false} />
                <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    width={110}
                    tick={{
                        fontSize: 12,
                    }}
                />
                <XAxis dataKey="total" type="number" hide />
                 <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
