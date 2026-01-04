import CategoriesPage from '@/components/CategoriesPage';

export default function IncomeCategoriesPage() {
  return (
    <CategoriesPage
      apiBase="/api/categories/income"
      title="Categorías de Ingresos"
    />
  );
}
