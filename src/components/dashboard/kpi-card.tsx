import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  changeColor?: string;
  chart?: React.ReactNode;
  icon: React.ReactNode;
  loading?: boolean;
}

export function KpiCard({ title, value, change, changeColor, chart, icon, loading }: KpiCardProps) {

  if (loading) {
      return (
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-6 w-6" />
              </CardHeader>
              <CardContent>
                  <Skeleton className="h-8 w-24 mb-2" />
                  <Skeleton className="h-4 w-40" />
              </CardContent>
          </Card>
      )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
            <div>
                <div className="text-2xl font-bold">{value}</div>
                {change && <p className="text-xs text-muted-foreground" style={{ color: changeColor }}>{change}</p>}
            </div>
            {chart && <div className="ml-4">{chart}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
