import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AppRouter } from "./router/AppRouter.jsx";

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
