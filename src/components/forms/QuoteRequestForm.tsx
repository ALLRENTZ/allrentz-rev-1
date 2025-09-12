
import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Send, Upload, Calendar } from 'lucide-react';

interface QuoteRequestFormProps {
  equipmentName: string;
  equipmentId: number;
  onClose: () => void;
}

interface QuoteFormData {
  startDate: string;
  endDate: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  projectDescription: string;
  specialRequirements: string;
  attachments?: File[];
}

const QuoteRequestForm: React.FC<QuoteRequestFormProps> = ({
  equipmentName,
  equipmentId,
  onClose
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<QuoteFormData>({
    defaultValues: {
      startDate: '',
      endDate: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      projectDescription: '',
      specialRequirements: ''
    }
  });

  const onSubmit = async (data: QuoteFormData) => {
    setIsSubmitting(true);
    
    // Simulate quote request submission
    console.log('Quote request submitted:', {
      equipmentId,
      equipmentName,
      ...data
    });

    // Simulate email notification
    setTimeout(() => {
      toast({
        title: "Quote Request Sent",
        description: `Your quote request for ${equipmentName} has been sent to the vendor. You'll receive a response within 2 hours.`,
      });
      setIsSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-allrentz-gray mb-2">
          Request Quote: {equipmentName}
        </h2>
        <p className="text-gray-600">
          Provide project details to get an accurate quote from the vendor
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Rental Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input type="date" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input type="date" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="(555) 123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Project Description */}
          <FormField
            control={form.control}
            name="projectDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Description</FormLabel>
                <FormControl>
                  <textarea
                    className="industrial-input w-full min-h-[100px] resize-y"
                    placeholder="Describe your project, turnaround details, or application..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Special Requirements - Manual Messaging Field */}
          <FormField
            control={form.control}
            name="specialRequirements"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Special Requirements or Messages</FormLabel>
                <FormControl>
                  <textarea
                    className="industrial-input w-full min-h-[100px] resize-y"
                    placeholder="e.g., Need cage vacuum box only, ATEX certification required, must arrive by specific date, operator requirements..."
                    {...field}
                  />
                </FormControl>
                <p className="text-xs text-gray-500">
                  Add any specific requirements, configurations, or messages for the vendor
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Document Upload Placeholder */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              Upload project drawings, specs, or requirements (optional)
            </p>
            <Button type="button" variant="outline" size="sm">
              Choose Files
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              PDF, DOC, JPG, PNG up to 10MB each
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="industrial-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Quote Request
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default QuoteRequestForm;

