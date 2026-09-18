import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider.jsx";
import { AppRouter } from "./router/AppRouter.jsx";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
