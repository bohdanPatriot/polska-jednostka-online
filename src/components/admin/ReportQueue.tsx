import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
  profiles: { username: string };
}

export function ReportQueue() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
    
    // Subscribe to realtime updates for reports
    const channel = supabase
      .channel("reports_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reports",
        },
        () => {
          console.log("Report updated, refreshing...");
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("reports")
      .select("*, profiles(username)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setReports(data as any);
    }
  };

  const updateReportStatus = async (reportId: string, status: string) => {
    const { error } = await supabase
      .from("reports")
      .update({
        status,
        resolution_notes: resolution,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
      })
      .eq("id", reportId);

    if (error) {
      toast({
        title: "Błąd",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sukces",
        description: "Status zgłoszenia zaktualizowany",
      });
      setSelectedReport(null);
      setResolution("");
      fetchReports();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "destructive",
      reviewing: "secondary",
      resolved: "default",
      dismissed: "outline",
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Kolejka zgłoszeń
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zgłaszający</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Powód</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Brak zgłoszeń
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.profiles?.username}</TableCell>
                  <TableCell>{report.target_type}</TableCell>
                  <TableCell>{report.reason}</TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>{format(new Date(report.created_at), "PPp")}</TableCell>
                  <TableCell>
                    {selectedReport === report.id ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Notatki rozwiązania..."
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateReportStatus(report.id, "resolved")}>
                            Rozwiązane
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateReportStatus(report.id, "dismissed")}>
                            Odrzuć
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setSelectedReport(null)}>
                            Anuluj
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setSelectedReport(report.id)}>
                        Rozpatrz
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}