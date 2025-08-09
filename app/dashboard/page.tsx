// import { requireAuth } from "@/lib/auth/auth-helpers"
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, CreditCard, Upload, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  // const { user, profile } = await requireAuth();
  const user = {
    id: "hello",
    name: "John Doe",
    email: "muhammadsarankhalid@gmail.com",
  };
  const profile: any = {
    name: user.name,
    email: user.email,
    // Assuming a default image for the profile
    // In a real application, you would fetch this from the user's profile data
    image: "https://avatars.githubusercontent.com/u/12345678?v=4",
    role: "admin",
  };
  const supabase = await createSupabaseServerClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id);

  const stats = {
    totalDocuments: documents?.length || 0,
    processingDocuments:
      documents?.filter((d) => d.status === "processing").length || 0,
    completedDocuments:
      documents?.filter((d) => d.status === "completed").length || 0,
    tokensUsed: profile ? 100 - profile.tokens_remaining : 0,
  };

  const maxDocuments =
    profile?.plan_type === "free"
      ? 15
      : profile?.plan_type === "pro"
      ? 100
      : 500;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ""}!
          Here's an overview of your document processing activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Documents
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              {maxDocuments - stats.totalDocuments} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Upload className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.processingDocuments}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently being processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tokensUsed}</div>
            <p className="text-xs text-muted-foreground">
              {profile?.tokens_remaining || 0} remaining
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Plan Type</span>
              <Badge variant="secondary">
                {profile?.plan_type?.charAt(0).toUpperCase() +
                  profile?.plan_type?.slice(1) || "Free"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Document Usage</span>
                <span>
                  {stats.totalDocuments}/{maxDocuments}
                </span>
              </div>
              <Progress value={(stats.totalDocuments / maxDocuments) * 100} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Token Usage</span>
                <span>{stats.tokensUsed}/100</span>
              </div>
              <Progress value={(stats.tokensUsed / 100) * 100} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest document processing activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents && documents.length > 0 ? (
              <div className="space-y-3">
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        doc.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : doc.status === "processing"
                          ? "bg-yellow-100 text-yellow-800"
                          : doc.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    >
                      {doc.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No documents yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
