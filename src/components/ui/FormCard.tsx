import { Link } from 'react-router-dom';
import { FileText, Download, Star, Check, Shield, Award, Globe } from 'lucide-react';
import type { Form } from '../../types';

const languageLabels: Record<string, string> = {
  en: 'EN',
  ta: 'தமிழ்',
  si: 'සිං',
};

interface FormCardProps {
  form: Form;
}

const verificationBadges = {
  0: { icon: null, label: 'Unverified', className: 'bg-gray-100 text-gray-600' },
  1: { icon: Check, label: 'Verified', className: 'bg-blue-100 text-blue-700' },
  2: { icon: Shield, label: 'Trusted', className: 'bg-green-100 text-green-700' },
  3: { icon: Award, label: 'Official', className: 'bg-amber-100 text-amber-700' },
};

export function FormCard({ form }: FormCardProps) {
  const badge = verificationBadges[form.verificationLevel];
  const BadgeIcon = badge.icon;

  return (
    <Link
      to={`/form/${form.id}`}
      className="block bg-white rounded-xl border border-gray-200 hover:border-[#3182CE] hover:shadow-lg transition-all duration-200 overflow-hidden group"
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gray-50 border-b border-gray-100 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1A365D]/5 to-[#3182CE]/5" />
        <FileText className="w-16 h-16 text-gray-300 group-hover:text-[#3182CE] transition-colors" />
        {/* Language badges */}
        {form.languages && form.languages.length > 0 && (
          <div className="absolute top-2 left-2 flex gap-1">
            <Globe className="w-4 h-4 text-[#3182CE]" />
            {form.languages.map((lang) => (
              <span
                key={lang}
                className="px-1.5 py-0.5 bg-[#3182CE]/10 text-[#3182CE] rounded text-xs font-medium"
              >
                {languageLabels[lang] || lang.toUpperCase()}
              </span>
            ))}
          </div>
        )}
        {/* Page count badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-white/90 backdrop-blur-sm rounded text-xs text-gray-600 font-medium">
          {form.pages.length} {form.pages.length === 1 ? 'page' : 'pages'}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-[#1A202C] mb-1 line-clamp-2 group-hover:text-[#3182CE] transition-colors">
          {form.title}
        </h3>
        <p className="text-sm text-[#718096] mb-3">{form.institution}</p>

        {/* Verification Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
          >
            {BadgeIcon && <BadgeIcon className="w-3 h-3" />}
            {badge.label}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-[#718096]">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>{form.rating.toFixed(1)}</span>
            <span className="text-gray-400">({form.ratingCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            <span>{form.downloads >= 1000 ? `${(form.downloads / 1000).toFixed(1)}k` : form.downloads}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
