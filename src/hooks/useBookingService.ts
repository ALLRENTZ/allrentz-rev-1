import { useContext } from 'react';
import { RepositoryContext } from '@/contexts/RepositoryContext';
import { BookingService, createBookingService } from '@/services/bookingService';

// Hook to get the booking service
export const useBookingService = (): BookingService => {
  const context = useContext(RepositoryContext);
  
  if (!context) {
    throw new Error('useBookingService must be used within a RepositoryProvider');
  }

  const { 
    bookingRepository, 
    equipmentRepository, 
    userRepository, 
    companyRepository 
  } = context;

  return createBookingService(
    bookingRepository,
    equipmentRepository,
    userRepository,
    companyRepository
  );
};