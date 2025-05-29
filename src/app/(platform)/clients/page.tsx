"use client";
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
      <Card className="flex flex-col justify-center ">
        <CardHeader>
          <CardTitle>Mock Client Inc.</CardTitle>
          <CardDescription>Leading provider of mock services worldwide.</CardDescription>
        </CardHeader>
        <CardContent className="">
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
          <Button className="w-full" onClick={handleGoToDashboard}>
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
