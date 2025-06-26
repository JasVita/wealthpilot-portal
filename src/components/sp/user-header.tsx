import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const UserHeader = () => {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-semibold text-[#11223D]">Structured Products</h1>
      </div>
      <div className="flex items-center gap-4">
        <Select defaultValue="ytd">
          <SelectTrigger className="w-32 wealth-focus">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ytd">YTD</SelectItem>
            <SelectItem value="1y">1 Y</SelectItem>
            <SelectItem value="3y">3 Y</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Avatar className="h-10 w-10">
          <AvatarImage src="/placeholder.svg" alt="User" />
          <AvatarFallback className="bg-[#0CA3A3] text-white">JP</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default UserHeader;
