import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Sparkles, Upload } from "lucide-react";

export function TrainingToolsCard({
  onOpenTemplates,
  onOpenGenerator,
  onOpenImport,
}: {
  onOpenTemplates: () => void;
  onOpenGenerator: () => void;
  onOpenImport: () => void;
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="px-5 pt-4 pb-1">
        <CardTitle className="ff-kicker text-muted-foreground">
          Training tools
        </CardTitle>
        <CardDescription className="ff-body-sm text-foreground/80 leading-relaxed break-words">
          Templates, Generator, and Imports live here.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="rounded-xl" onClick={onOpenTemplates}>
          <ClipboardList className="h-4 w-4" /> Templates
        </Button>
        <Button size="sm" className="rounded-xl" onClick={onOpenGenerator}>
          <Sparkles className="h-4 w-4" /> Generate
        </Button>
        <Button size="sm" variant="outline" className="rounded-xl" onClick={onOpenImport}>
          <Upload className="h-4 w-4" /> Import
        </Button>
      </CardContent>
    </Card>
  );
}
