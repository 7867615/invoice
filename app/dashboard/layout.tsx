import type React from "react";
// import { requireAuth } from "@/lib/auth/auth-helpers"
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const { user, profile } = await requireAuth()
  const user = { name: "John Doe", email: "muhammadsarankhalid@gmail.com" };
  const profile: any = {
    name: user.name,
    email: user.email,
    // Assuming a default image for the profile
    // In a real application, you would fetch this from the user's profile data
    image: "https://avatars.githubusercontent.com/u/12345678?v=4",
    role: "admin",
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar userProfile={profile} />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
