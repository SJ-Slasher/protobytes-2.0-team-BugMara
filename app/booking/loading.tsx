import { Spinner } from "@/components/ui/Spinner";

export default function BookingLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground">Loading booking...</p>
      </div>
    </div>
  );
}
