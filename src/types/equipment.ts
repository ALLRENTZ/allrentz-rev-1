
export interface Equipment {
  id: string;
  title: string;
  description: string;
  category: string;
  daily_rate: number;
  location: string;
  image_url: string;
  specifications: Record<string, any>;
  vendor_name?: string;
  compliance_score?: number;
  response_time_hours?: number;
  compliance_tags?: string[];
}
