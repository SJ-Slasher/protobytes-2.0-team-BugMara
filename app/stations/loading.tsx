import { Spinner } from "@/components/ui/Spinner";

export default function StationsLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground">Loading stations...</p>
      </div>
    </div>
  );
}
