import { Outlet } from "react-router";
import { AuthProvider } from "@/services/auth";
import { I18nProvider } from "@/services/i18n-provider";

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </I18nProvider>
  );
}
