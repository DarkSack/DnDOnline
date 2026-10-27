import { createBrowserRouter, Navigate } from "react-router";
import App from "./App";
import { RequireAuth, RequireGuest } from "./guards";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/Register";
import { ResetPage, VerifyPage } from "./pages/TokenPages";
import DashboardPage from "./pages/Dashboard";
import NewCampaignPage from "./pages/NewCampaign";
import CampaignDetailPage from "./pages/CampaignDetail";
import TablePage from "./pages/Table";
import RoomPage from "./pages/Room";
import NewCharacterPage from "./pages/NewCharacter";
import CharacterDetailPage from "./pages/CharacterDetail";
import { isPreviewMode } from "@/services/preview";

// Personajes, salas, tablero y combate siguen sobre el stub de Supabase: solo existen en modo preview.
const legacy = isPreviewMode
  ? [
      { path: "rooms/:id", element: <RoomPage /> },
      { path: "characters/new", element: <NewCharacterPage /> },
      { path: "characters/:id", element: <CharacterDetailPage /> },
    ]
  : [];

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      // Los enlaces del correo funcionan con o sin sesión.
      { path: "verify", element: <VerifyPage /> },
      { path: "reset", element: <ResetPage /> },
      {
        element: <RequireGuest />,
        children: [
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "campaigns/new", element: <NewCampaignPage /> },
          { path: "campaigns/:id", element: <CampaignDetailPage /> },
          { path: "campaigns/:id/mesa", element: <TablePage /> },
          ...legacy,
        ],
      },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
