import { Link } from 'react-router-dom';
import {
  Building2,
  Shield,
  Car,
  Landmark,
  Plane,
  FileText,
  Calculator,
  GraduationCap,
  Users,
  Zap,
  Droplets,
  MoreHorizontal,
} from 'lucide-react';
import type { Category } from '../../types';

const categoryIcons: Record<Category, React.ElementType> = {
  'Divisional Secretariat': Building2,
  'Police': Shield,
  'Motor Traffic': Car,
  'Banks': Landmark,
  'Immigration': Plane,
  'Registrar General': FileText,
  'Inland Revenue': Calculator,
  'Education': GraduationCap,
  'Grama Niladhari': Users,
  'Electricity Board': Zap,
  'Water Board': Droplets,
  'Other': MoreHorizontal,
};

const categoryColors: Record<Category, string> = {
  'Divisional Secretariat': 'bg-blue-500',
  'Police': 'bg-indigo-500',
  'Motor Traffic': 'bg-cyan-500',
  'Banks': 'bg-emerald-500',
  'Immigration': 'bg-violet-500',
  'Registrar General': 'bg-orange-500',
  'Inland Revenue': 'bg-red-500',
  'Education': 'bg-amber-500',
  'Grama Niladhari': 'bg-teal-500',
  'Electricity Board': 'bg-yellow-500',
  'Water Board': 'bg-sky-500',
  'Other': 'bg-gray-500',
};

interface CategoryCardProps {
  category: Category;
  formCount?: number;
}

export function CategoryCard({ category, formCount = 0 }: CategoryCardProps) {
  const Icon = categoryIcons[category];
  const bgColor = categoryColors[category];

  return (
    <Link
      to={`/forms?category=${encodeURIComponent(category)}`}
      className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-[#3182CE] hover:shadow-md transition-all group"
    >
      <div
        className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-sm font-medium text-[#1A202C] text-center">{category}</span>
      {formCount > 0 && (
        <span className="text-xs text-[#718096] mt-1">{formCount} forms</span>
      )}
    </Link>
  );
}
