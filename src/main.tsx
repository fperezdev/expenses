import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/hooks/useTheme";
import { OnlineProvider } from "@/hooks/useOnline";
import AppLayout from "@/App";
import { SWRegister } from "@/components/SWRegister";
import Dashboard from "@/pages/Dashboard";
import AddExpense from "@/pages/AddExpense";
import EditExpense from "@/pages/EditExpense";
import History from "@/pages/History";
import Budget from "@/pages/Budget";
import Categories from "@/pages/Categories";
import PaymentMethods from "@/pages/PaymentMethods";
import Settings from "@/pages/Settings";
import "./index.css";

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <OnlineProvider>
          <BrowserRouter>
            <SWRegister />
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="add" element={<AddExpense />} />
                <Route path="edit/:id" element={<EditExpense />} />
                <Route path="history" element={<History />} />
                <Route path="budget" element={<Budget />} />
                <Route path="categories" element={<Categories />} />
                <Route path="payment-methods" element={<PaymentMethods />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </OnlineProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);
