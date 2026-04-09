"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Download, Car, Upload, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";

interface DashboardStats {
  pendingReview: number;
  exportedThisMonth: number;
  totalVehicles: number;
}

interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  fieldName: string | null;
  timestamp: string;
  jobNumber: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setStats(json.data.stats);
          setActivities(json.data.recentActivity);
        }
      })
      .catch(() => {
        // Silently fail -- show empty state
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Processing overview and recent activity
        </p>
      </div>

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Pending Review"
            value={stats.pendingReview}
            icon={Clock}
          />
          <StatCard
            label="Exported This Month"
            value={stats.exportedThisMonth}
            icon={Download}
          />
          <StatCard
            label="Total Vehicles"
            value={stats.totalVehicles}
            icon={Car}
          />
        </div>
      ) : null}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" render={<Link href="/upload" />}>
          <Upload className="size-4 mr-2" />
          Upload New Vehicle
        </Button>
        <Button variant="outline" render={<Link href="/register" />}>
          <Table2 className="size-4 mr-2" />
          View Register
        </Button>
      </div>

      {/* Activity Feed */}
      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <ActivityFeed activities={activities} />
      )}
    </div>
  );
}
