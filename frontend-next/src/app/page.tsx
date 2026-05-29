import { redirect } from "next/navigation";

export default function Home() {
  // Automatically redirect entry root requests to the login screen
  redirect("/login");
}
