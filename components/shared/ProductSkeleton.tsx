import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                    <div className="h-48 bg-gray-200 relative">
                        <Skeleton className="h-full w-full" />
                    </div>
                    <CardHeader className="p-4 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <div className="flex justify-between items-center pt-2">
                            <Skeleton className="h-6 w-16" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                        <Skeleton className="h-10 w-full mt-2" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
