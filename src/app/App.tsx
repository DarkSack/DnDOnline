import { Outlet } from "react-router";
import { AuthProvider } from "@/services/auth";

export default function App() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
