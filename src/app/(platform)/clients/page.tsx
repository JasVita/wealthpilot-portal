"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Overall Clients Summary Card */}
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Overall Clients Summary</CardTitle>
          <CardDescription>Consolidated stats across all clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <strong>Total Clients:</strong> 1
          </div>
          <div>
            <strong>Active Clients:</strong> 1
          </div>
          <div>
            <strong>Average Plan:</strong> Pro – Annual Subscription
          </div>
          <div>
            <strong>Total Usage:</strong> Reports, Insights, Messaging
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={() => router.push("/dashboard/overview")}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>

      {/* Individual Client Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Mock Client Inc.</CardTitle>
            <CardDescription>Leading provider of mock services worldwide.</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <strong>Status:</strong> <span className="text-green-600">Active</span>
            </div>
            <div>
              <strong>Plan:</strong> Pro – Annual Subscription
            </div>
            <div>
              <strong>Last Login:</strong> May 28, 2025, 14:35
            </div>
            <div>
              <strong>Services Used:</strong> Automated Reports, Client Insights, Bulk Messaging
            </div>
            <div>
              <strong>Date Joined:</strong> January 12, 2024
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push("/dashboard/client-overview")}>
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
