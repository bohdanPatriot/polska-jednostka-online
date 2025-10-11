import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

export function ActivityChart() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityData();
  }, []);

  const fetchActivityData = async () => {
    try {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, "yyyy-MM-dd");
      });

      const dataPromises = last7Days.map(async (date) => {
        const nextDate = format(new Date(date + "T00:00:00"), "yyyy-MM-dd");
        
        const [postsRes, threadsRes, usersRes] = await Promise.all([
          supabase
            .from("forum_posts")
            .select("id", { count: "exact" })
            .gte("created_at", `${date}T00:00:00`)
            .lt("created_at", `${nextDate}T23:59:59`),
          supabase
            .from("forum_threads")
            .select("id", { count: "exact" })
            .gte("created_at", `${date}T00:00:00`)
            .lt("created_at", `${nextDate}T23:59:59`),
          supabase
            .from("profiles")
            .select("id", { count: "exact" })
            .gte("joined_at", `${date}T00:00:00`)
            .lt("joined_at", `${nextDate}T23:59:59`)
        ]);

        return {
          date: format(new Date(date), "MMM dd"),
          posts: postsRes.count || 0,
          threads: threadsRes.count || 0,
          newUsers: usersRes.count || 0,
        };
      });

      const data = await Promise.all(dataPromises);
      setChartData(data);
    } catch (error) {
      console.error("Error fetching activity data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Card><CardContent className="p-8 text-center">Ładowanie...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktywność (ostatnie 7 dni)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="posts" stroke="#8884d8" name="Posty" />
            <Line type="monotone" dataKey="threads" stroke="#82ca9d" name="Wątki" />
            <Line type="monotone" dataKey="newUsers" stroke="#ffc658" name="Nowi użytkownicy" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}