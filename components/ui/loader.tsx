import { Loader2 } from "lucide-react";

export function Loader() {
    return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );
}

export function FullScreenLoader() {
    return (
        <div className="fixed inset-0 w-screen flex items-center justify-center bg-white/80 z-50">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
    );
}
