"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ActivityItem } from "./activity-item";

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

interface ActivityFeedProps {
  activities: ActivityEntry[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <div className="text-base font-semibold">Recent Activity</div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            No activity yet. Upload your first vehicle to get started.
          </p>
        ) : (
          <ul role="feed" aria-label="Recent activity">
            {activities.map((activity) => (
              <ActivityItem
                key={activity.id}
                action={activity.action}
                fieldName={activity.fieldName}
                jobNumber={activity.jobNumber}
                year={activity.year}
                make={activity.make}
                model={activity.model}
                timestamp={activity.timestamp}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
