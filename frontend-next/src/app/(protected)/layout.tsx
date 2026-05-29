import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background-primary">
      {/* Sidebar Navigation Panel */}
      <Sidebar />
      
      {/* Top Header & Page Content Panel */}
      <div className="flex-grow flex flex-col min-w-0">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </div>
  );
}
