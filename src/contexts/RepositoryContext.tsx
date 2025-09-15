import React, { createContext, useContext, ReactNode } from 'react';
import repositoryFactory from '../repositories/RepositoryFactory';
import type {
  CompanyRepository,
  UserRepository,
  EquipmentRepository,
  BookingRepository
} from '../repositories/interfaces';

interface RepositoryContextType {
  companyRepository: CompanyRepository;
  userRepository: UserRepository;
  equipmentRepository: EquipmentRepository;
  bookingRepository: BookingRepository;
}

const RepositoryContext = createContext<RepositoryContextType | null>(null);

interface RepositoryProviderProps {
  children: ReactNode;
}

export const RepositoryProvider: React.FC<RepositoryProviderProps> = ({ children }) => {
  const repositories: RepositoryContextType = {
    companyRepository: repositoryFactory.getCompanyRepository(),
    userRepository: repositoryFactory.getUserRepository(),
    equipmentRepository: repositoryFactory.getEquipmentRepository(),
    bookingRepository: repositoryFactory.getBookingRepository(),
  };

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
};

export const useRepositories = (): RepositoryContextType => {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error('useRepositories must be used within a RepositoryProvider');
  }
  return context;
};

// Individual repository hooks for convenience
export const useCompanyRepository = () => useRepositories().companyRepository;
export const useUserRepository = () => useRepositories().userRepository;
export const useEquipmentRepository = () => useRepositories().equipmentRepository;
export const useBookingRepository = () => useRepositories().bookingRepository;