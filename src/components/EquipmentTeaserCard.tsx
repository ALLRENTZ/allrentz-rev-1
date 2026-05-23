import React from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PublicEquipmentRow } from '@/hooks/useEquipmentSearch';

const PLACEHOLDER =
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop&auto=format';

function fmtDailyRate(v: number | string | null): string {
  if (v == null) return '—';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (Number.isNaN(n)) return '—';
  return `$${Math.round(n).toLocaleString()}/day`;
}

interface Props {
  item: PublicEquipmentRow;
  onSignInClick: () => void;
}

const EquipmentTeaserCard: React.FC<Props> = ({ item, onSignInClick }) => {
  return (
    <div className="industrial-card overflow-hidden hover:shadow-lg transition-shadow group relative">
      <div className="relative">
        <img
          src={item.image_url ?? PLACEHOLDER}
          alt={item.title ?? 'Equipment'}
          className="w-full h-48 object-cover"
        />
        {item.available === false && (
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-gray-800 text-white">Unavailable</Badge>
          </div>
        )}
        {item.category && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-allrentz-red text-white border-0">{item.category}</Badge>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{item.title}</h3>

        <Badge className="bg-green-100 text-green-800 border-0 text-sm font-bold px-2.5 py-1 mb-3">
          {fmtDailyRate(item.daily_rate)}
        </Badge>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {item.description_teaser || '—'}
        </p>

        <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
          <MapPin className="h-4 w-4" />
          <span>{item.city ?? '—'} area</span>
        </div>

        <Button
          onClick={onSignInClick}
          className="w-full font-medium py-2 bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          Sign in to quote
        </Button>
      </div>
    </div>
  );
};

export default EquipmentTeaserCard;
