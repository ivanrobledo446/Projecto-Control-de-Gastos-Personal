import CategoriesPage from '@/components/CategoriesPage';

export default function ExpensesCategoriesPage() {
  return (
    <CategoriesPage
      apiBase="/api/categories/expenses"
      title="Categorías de Gastos"
    />
  );
}
