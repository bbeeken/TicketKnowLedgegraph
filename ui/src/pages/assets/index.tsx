import { NextPage } from 'next';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AssetManagement } from '@/components/assets/AssetManagement';

const AssetsPage: NextPage = () => {
  return (
    <DashboardLayout>
      <AssetManagement />
    </DashboardLayout>
  );
};

export default AssetsPage;
