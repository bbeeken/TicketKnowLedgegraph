import { DashboardLayout } from '@/components/layout/DashboardLayout';
import VendorManagementPage from '@/components/vendors/VendorManagementPage';

const VendorsPage = () => {
  return (
    <DashboardLayout>
      <VendorManagementPage />
    </DashboardLayout>
  );
};

export default VendorsPage;
