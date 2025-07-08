"use client";
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Upload, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useOrderManagementStore } from "@/stores/order-management-store";

const OrderManagement = () => {
  const {
    productFilter,
    statusTab,
    searchQuery,
    currentPage,
    setProductFilter,
    setStatusTab,
    setSearchQuery,
    setCurrentPage,
    getCurrentPageData,
    getTotalPages,
    getStatusCounts,
    getTotalOrders,
    filterOrders,
  } = useOrderManagementStore();

  const currentData = getCurrentPageData();
  const totalPages = getTotalPages();
  const statusCounts = getStatusCounts();
  const totalOrders = getTotalOrders();

  useEffect(() => {
    filterOrders();
  }, [filterOrders]);

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Done":
        return "default";
      case "Processing":
        return "secondary";
      case "Executing":
        return "outline";
      case "Partially Done":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="h-fit bg-gray-50/50 p-4">
      <div className="mx-auto space-y-4">
        {/* Header with Filters */}
        <Card className="flex gap-0">
          <CardHeader className="">
            <CardTitle className="text-lg">Order Management</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:space-x-4 lg:space-y-0">
              {/* Product Filter */}
              <div className="flex flex-col space-y-1 lg:w-48">
                <label className="text-xs font-medium text-gray-700">Product Type</label>
                <Select value={productFilter} onValueChange={(value) => setProductFilter(value as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Products</SelectItem>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="Fund">Fund</SelectItem>
                    <SelectItem value="Bond">Bond</SelectItem>
                    <SelectItem value="FX">FX</SelectItem>
                    <SelectItem value="Structured Products">Structured Products</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* End Client Search */}
              <div className="flex flex-1 flex-col space-y-1">
                <label className="text-xs font-medium text-gray-700">Search End Client</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by end client, AM, product, or account..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table with Tabs */}
        <Card>
          <CardContent className="p-2">
            <Tabs value={statusTab} onValueChange={(value) => setStatusTab(value as any)} className="w-full">
              <div className="flex items-center justify-between p-4 pb-2">
                <TabsList className="grid w-full grid-cols-6 lg:w-auto">
                  <TabsTrigger value="All" className="text-xs">
                    All ({statusCounts.All})
                  </TabsTrigger>
                  <TabsTrigger value="Pending Place" className="text-xs">
                    Pending Place ({statusCounts["Pending Place"]})
                  </TabsTrigger>
                  <TabsTrigger value="Processing" className="text-xs">
                    Processing ({statusCounts.Processing})
                  </TabsTrigger>
                  <TabsTrigger value="Executing" className="text-xs">
                    Executing ({statusCounts.Executing})
                  </TabsTrigger>
                  <TabsTrigger value="Partially Done" className="text-xs">
                    Partially Done ({statusCounts["Partially Done"]})
                  </TabsTrigger>
                  <TabsTrigger value="Done" className="text-xs">
                    Done ({statusCounts.Done})
                  </TabsTrigger>
                </TabsList>
                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Order
                  </Button>
                </div>
              </div>

              <TabsContent value={statusTab} className="mt-0">
                <div className="h-[500px] overflow-auto p-4">
                  <Table className="border-separate border-spacing-y-2">
                    <TableHeader className="text-sm">
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold">Order Time</TableHead>
                        <TableHead className="font-semibold">AM</TableHead>
                        <TableHead className="font-semibold">End Client</TableHead>
                        <TableHead className="font-semibold">Custodia/Attr Org</TableHead>
                        <TableHead className="font-semibold">Account No./Subaccount</TableHead>
                        <TableHead className="font-semibold">Product</TableHead>
                        <TableHead className="font-semibold">Underlying ISIN</TableHead>
                        <TableHead className="font-semibold">Direction</TableHead>
                        <TableHead className="font-semibold">Amount/Quantity</TableHead>
                        <TableHead className="font-semibold">Order Type</TableHead>
                        <TableHead className="font-semibold">Notes and Marks</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {currentData.map((order) => (
                        <TableRow key={order.id} className="hover:bg-gray-50/50">
                          <TableCell className="font-mono text-xs">{formatDateTime(order.orderTime)}</TableCell>
                          <TableCell className="font-medium">{order.am}</TableCell>
                          <TableCell className="font-medium">{order.endClient}</TableCell>
                          <TableCell className="text-gray-600">{order.custodiaAttrOrg}</TableCell>
                          <TableCell className="text-gray-600">{order.accountNoSubaccount}</TableCell>
                          <TableCell className="font-medium">{order.product}</TableCell>
                          <TableCell className="font-mono text-sm">{order.underlyingISIN}</TableCell>
                          <TableCell>
                            <Badge variant={order.direction === "Buy" ? "default" : "secondary"}>
                              {order.direction}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">{order.amountQuantity.toLocaleString()}</TableCell>
                          <TableCell>{order.orderType}</TableCell>
                          <TableCell className="text-gray-600">{order.notesAndMarks}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer with Summary and Pagination */}
        <Card className="py-2">
          <CardContent className="py-0">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Orders: {totalOrders} | Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrderManagement;
