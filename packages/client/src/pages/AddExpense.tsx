import { Helmet } from "react-helmet-async";
import ExpenseForm from "@/components/ExpenseForm";

export default function AddExpense() {
  return (
    <div>
      <Helmet>
        <title>Expenses - Nuevo gasto</title>
      </Helmet>
      <ExpenseForm />
    </div>
  );
}
